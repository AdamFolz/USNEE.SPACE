import { useState, useEffect } from 'react';
import { Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import { UserSettings } from './types';
import { useAppStore } from './stores/appStore';
import { initDB } from './utils/db';
import { hashPin } from './utils/crypto';
import { Layout } from './components/Layout';
import { PinLock } from './components/PinLock';
import { Onboarding } from './components/Onboarding';
import Home from './pages/Home';
import AddEntry from './pages/AddEntry';
import BulkAdd from './pages/BulkAdd';
import Accounts from './pages/Accounts';
import { History } from './pages/History';
import { Stats } from './pages/Stats';
import { Calendar } from './pages/Calendar';
import { Safety } from './pages/Safety';
import { Settings } from './pages/Settings';
import { Profile } from './pages/Profile';
import { Partials } from './pages/Partials';
import { Progress } from './pages/Progress';
import Learn from './pages/Learn';
import { initTelegramMiniApp, getTelegramStartParam, startParamToPath, subscribeTelegramViewport } from './integrations/telegram';
import { initAnalytics, trackEvent } from './integrations/analytics';
import { useOutboxSync } from './hooks/useOutboxSync';

function App() {
  const [dbReady, setDbReady] = useState(false);
  const [dbError, setDbError] = useState<string | null>(null);
  const unlocked = useAppStore((s) => s.unlocked);
  const setUnlocked = useAppStore((s) => s.setUnlocked);
  const settings = useAppStore((s) => s.settings);
  const showOnboarding = useAppStore((s) => s.showOnboarding);
  const dismissOnboarding = useAppStore((s) => s.dismissOnboarding);
  useOutboxSync(dbReady && !showOnboarding && (!settings.pinHash || unlocked));

  const location = useLocation();
  const navigate = useNavigate();
  useEffect(() => {
    const path = startParamToPath(getTelegramStartParam());
    if (path !== '/' && location.pathname === '/') navigate(path, { replace: true });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (dbReady && !showOnboarding && (!settings.pinHash || unlocked)) {
      trackEvent('screen_view', { name: location.pathname });
    }
  }, [location.pathname, dbReady, showOnboarding, settings.pinHash, unlocked]);

  useEffect(() => {
      const unsubscribeViewport = subscribeTelegramViewport();
      initAnalytics();
      initDB().then(async () => {
        setDbReady(true);
        const st = useAppStore.getState();
        const legacyPin = (st.settings as { pin?: string }).pin;
        // Migrate legacy plaintext PIN -> PBKDF2 hash so it is never stored in cleartext.
        if (legacyPin && !st.settings.pinHash && /^\d{4}$/.test(legacyPin)) {
          try {
            const hashed = await hashPin(legacyPin);
            useAppStore.setState((s) => {
              const { pin: _legacy, ...rest } = s.settings as UserSettings & { pin?: string };
              return { settings: { ...rest, pinHash: hashed } };
            });
          } catch {
            // crypto.subtle unavailable (insecure context); leave as-is so user can re-set.
          }
        }
        if (!st.settings.onboardingCompleted) {
          useAppStore.setState({ showOnboarding: true });
        }
        const isTelegram = initTelegramMiniApp();
        trackEvent('app_open', { source: isTelegram ? 'telegram' : 'pwa' });
      }).catch((error: unknown) => {
        // IndexedDB недоступна (приватный режим, квота, повреждённая база) — показываем текст, а не вечный спиннер.
        console.error('USNEE init failed', error);
        setDbError(error instanceof Error ? error.message : 'не удалось открыть локальную базу');
      });

    return unsubscribeViewport;
  }, []);

  if (!dbReady && dbError) {
    return (
      <div className="flex h-full items-center justify-center bg-usnee-bg px-5">
        <div className="w-full max-w-md rounded-card border border-usnee-border bg-usnee-surface p-6 text-center">
          <h1 className="text-title-md">База на этом устройстве не открылась</h1>
          <p className="mt-2 text-body-sm text-usnee-text2">
            Так бывает в приватном режиме браузера или когда мало места. Данные не потеряны — приложение их не удаляет.
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-5 min-h-12 w-full rounded-lg bg-usnee-brand px-4 text-body-sm font-bold text-white transition-transform active:scale-[.99]"
          >
            Попробовать снова
          </button>
          <p className="mt-3 break-words text-[11px] text-usnee-text3">Технически: {dbError}</p>
        </div>
      </div>
    );
  }

  if (!dbReady) {
    return (
      <div className="flex h-full items-center justify-center bg-usnee-bg" role="status" aria-label="Загрузка">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-usnee-accent border-t-transparent" />
      </div>
    );
  }

  if (showOnboarding) {
    return <Onboarding onDone={dismissOnboarding} />;
  }

  if (settings.pinHash && !unlocked) {
    return (
      <PinLock
        pinHash={settings.pinHash}
        onUnlock={() => setUnlocked(true)}
      />
    );
  }

  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/add/bulk" element={<BulkAdd />} />
        <Route path="/add" element={<AddEntry />} />
        <Route path="/history" element={<History />} />
        <Route path="/stats" element={<Stats />} />
        <Route path="/progress" element={<Progress />} />
        <Route path="/learn" element={<Learn />} />
        <Route path="/calendar" element={<Calendar />} />
        <Route path="/safety" element={<Safety />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/partials" element={<Partials />} />
        <Route path="/accounts" element={<Accounts />} />
      </Routes>
    </Layout>
  );
}

export default App;