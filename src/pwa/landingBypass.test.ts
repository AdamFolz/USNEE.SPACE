import { describe, expect, it } from 'vitest';
import { isLandingPath } from './landingBypass';

describe('landing must not be the Mini App', () => {
  it('treats /landing URLs as the visiting card, not the app', () => {
    expect(isLandingPath('/landing/')).toBe(true);
    expect(isLandingPath('/landing')).toBe(true);
    expect(isLandingPath('/')).toBe(false);
    expect(isLandingPath('/learn')).toBe(false);
  });
});
