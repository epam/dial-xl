import { formatNumberGeneral } from '../formatNumberGeneral';

describe('formatNumberGeneral', () => {
  it('shows grouped plain form when it fits (≤10 characters)', () => {
    expect(formatNumberGeneral('123456', 80, 8)).toBe('123,456');
  });

  it('compacts to “B” when grouped plain exceeds 10 chars', () => {
    expect(formatNumberGeneral('1234567890', 120, 8)).toBe('1,234,567,890');
  });

  it('compacts to “M” when the column is narrow', () => {
    expect(formatNumberGeneral('1500000', 40, 8)).toBe('1.5M');
  });

  it('uses integer mantissa when 1‑fraction form is still too wide', () => {
    expect(formatNumberGeneral('123456789012', 32, 8)).toBe('124B');
  });

  it('rounds fractional part so result fits exactly 10 digits', () => {
    expect(formatNumberGeneral('123.4567890123', 120, 8)).toBe('123.4567890');
  });

  it('switches to scientific when rounding leaves only zeros', () => {
    const r = formatNumberGeneral('0.00000012', 32, 8);
    expect(r).toMatch(/E-?\d{1,3}$/);
  });

  it('returns placeholder when nothing can fit', () => {
    expect(formatNumberGeneral('1234567', 8, 8)).toBe('#');
  });

  it('rejects a B‑form that would reach 10+ characters', () => {
    const r = formatNumberGeneral('9876543210987654321', 120, 8);
    expect(r).not.toMatch(/[MB]$/);
    expect(r?.length).toBeLessThanOrEqual(10);
  });

  it('uses scientific when |value| < 1×10^-7', () => {
    const r = formatNumberGeneral('5e-8', 125, 7);
    expect(r).toMatch(/^\d(\.\d{0,4})?E-?\d{1,3}$/);
    expect(r?.length).toBeLessThanOrEqual(10);
  });
});
