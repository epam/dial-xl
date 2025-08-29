import { getExtendedRoundedBorders } from '../getExtendedRoundedBorders';

describe('getExtendedRoundedBorders', () => {
  it('should return rounded borders for small viewport', () => {
    // Act
    const [start, end] = getExtendedRoundedBorders(0, 20);

    // Assert
    expect(start).toBe(0);
    expect(end).toBe(1000);
  });

  it('should return rounded borders for large viewport', () => {
    // Act
    const [start, end] = getExtendedRoundedBorders(0, 120);

    // Assert
    expect(start).toBe(0);
    expect(end).toBe(1000);
  });

  it('should return rounded borders for scrolled viewport', () => {
    // Act
    const [start, end] = getExtendedRoundedBorders(20, 80);

    // Assert
    expect(start).toBe(0);
    expect(end).toBe(1000);
  });
});
