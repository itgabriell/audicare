import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { isFeatureEnabled, setFeatureFlag, resetFeatureFlags, FEATURES } from '../featureFlags';

// Mock do localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
  writable: true,
});

describe('Feature Flags System', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset cache
    localStorageMock.getItem.mockReturnValue(null);
  });

  afterEach(() => {
    resetFeatureFlags();
  });

  describe('isFeatureEnabled', () => {
    it('should return true for enabled features by default', async () => {
      const result = await isFeatureEnabled(FEATURES.NOTIFICATIONS);
      expect(result).toBe(true);
    });

    it('should return false for disabled features by default', async () => {
      const result = await isFeatureEnabled(FEATURES.REPORTS_ADVANCED);
      expect(result).toBe(false);
    });

    it('should return true for locally enabled features', async () => {
      localStorageMock.getItem.mockReturnValue(JSON.stringify({
        [FEATURES.REPORTS_ADVANCED]: true
      }));

      const result = await isFeatureEnabled(FEATURES.REPORTS_ADVANCED);
      expect(result).toBe(true);
    });

    it('should use cache for subsequent calls', async () => {
      localStorageMock.getItem.mockReturnValue(JSON.stringify({
        [FEATURES.DASHBOARD_ANALYTICS]: false
      }));

      // First call
      await isFeatureEnabled(FEATURES.DASHBOARD_ANALYTICS);
      // Second call should use cache
      await isFeatureEnabled(FEATURES.DASHBOARD_ANALYTICS);

      expect(localStorageMock.getItem).toHaveBeenCalledTimes(1);
    });
  });

  describe('setFeatureFlag', () => {
    it('should store feature flag in localStorage', () => {
      setFeatureFlag(FEATURES.DASHBOARD_ANALYTICS, false);

      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'audicare_feature_flags',
        JSON.stringify({ [FEATURES.DASHBOARD_ANALYTICS]: false })
      );
    });

    it('should merge with existing flags', () => {
      localStorageMock.getItem.mockReturnValue(JSON.stringify({
        [FEATURES.NOTIFICATIONS]: true
      }));

      setFeatureFlag(FEATURES.DASHBOARD_ANALYTICS, false);

      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'audicare_feature_flags',
        JSON.stringify({
          [FEATURES.NOTIFICATIONS]: true,
          [FEATURES.DASHBOARD_ANALYTICS]: false
        })
      );
    });
  });

  describe('resetFeatureFlags', () => {
    it('should clear localStorage', () => {
      resetFeatureFlags();

      expect(localStorageMock.removeItem).toHaveBeenCalledWith('audicare_feature_flags');
    });
  });

  describe('FEATURES constants', () => {
    it('should have all required feature flags', () => {
      expect(FEATURES).toHaveProperty('NOTIFICATIONS');
      expect(FEATURES).toHaveProperty('DASHBOARD_ANALYTICS');
      expect(FEATURES).toHaveProperty('EXPERIMENTAL_AI_INSIGHTS');
      expect(FEATURES).toHaveProperty('REPORTS_ADVANCED');
    });

    it('should have string values', () => {
      Object.values(FEATURES).forEach(value => {
        expect(typeof value).toBe('string');
      });
    });
  });
});
