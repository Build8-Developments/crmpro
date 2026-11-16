import { normalizePhone, phoneSearchCore } from './phone-normalization.util';

describe('normalizePhone', () => {
  it.each([
    ['01001234567', '+201001234567'],
    ['010 0123 4567', '+201001234567'],
    ['(010) 0123-4567', '+201001234567'],
    ['+20 100 123 4567', '+201001234567'],
    ['00201001234567', '+201001234567'],
    ['201001234567', '+201001234567'],
    ['1001234567', '+201001234567'],
    ['٠١٠٠١٢٣٤٥٦٧', '+201001234567'],
    ['۰۱۰۰۱۲۳۴۵۶۷', '+201001234567'],
    ['0223456789', '+20223456789'],
    ['+971501234567', '+971501234567'],
    ['00971501234567', '+971501234567'],
  ])('normalizes %s to %s', (input, expected) => {
    expect(normalizePhone(input)).toBe(expected);
  });

  it('returns an empty string when there are no digits', () => {
    expect(normalizePhone(' - ')).toBe('');
  });
});

describe('phoneSearchCore', () => {
  it.each([
    ['0100123', '100123'],
    ['01001234567', '1001234567'],
    ['+201001234567', '1001234567'],
    ['00201001234567', '1001234567'],
    ['٠١٠٠١٢', '10012'],
  ])('reduces %s to %s', (input, expected) => {
    expect(phoneSearchCore(input)).toBe(expected);
  });

  it.each(['ahmed', 'a@b.com', '010', 'Ahmed 0100'])(
    'ignores non-phone search %s',
    (input) => {
      expect(phoneSearchCore(input)).toBeNull();
    },
  );
});
