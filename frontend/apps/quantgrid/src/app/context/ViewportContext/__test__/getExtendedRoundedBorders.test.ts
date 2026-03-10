import { vi } from 'vitest';

import { getExtendedRoundedBorders } from '../getExtendedRoundedBorders';

vi.mock('../../../store/UserSettingsStore', () => ({
  useUserSettingsStore: Object.assign(() => ({}), {
    getState: () => ({ data: {} }),
    setState: () => {},
    subscribe: () => () => {},
  }),
}));

describe('getExtendedRoundedBorders', () => {
  it('should return rounded-sm borders for small viewport', () => {
    // Act
    const [start, end] = getExtendedRoundedBorders(0, 20);

    // Assert
    expect(start).toBe(0);
    expect(end).toBe(1000);
  });

  it('should return rounded-sm borders for large viewport', () => {
    // Act
    const [start, end] = getExtendedRoundedBorders(0, 120);

    // Assert
    expect(start).toBe(0);
    expect(end).toBe(1000);
  });

  it('should return rounded-sm borders for scrolled viewport', () => {
    // Act
    const [start, end] = getExtendedRoundedBorders(20, 80);

    // Assert
    expect(start).toBe(0);
    expect(end).toBe(1000);
  });
});
