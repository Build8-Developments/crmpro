import {
  cleanImportedPhone,
  parseContactChannel,
  parseContactTime,
  parseImportedAmount,
  parseImportedBudget,
  parsePaymentPreference,
  parsePurchasePurpose,
  splitImportedList,
  toLatinDigits,
} from './import-values';

describe('toLatinDigits', () => {
  it('converts Arabic-Indic and Persian digits', () => {
    expect(toLatinDigits('٠١٢٣٤٥٦٧٨٩')).toBe('0123456789');
    expect(toLatinDigits('۰۱۲۳۴۵۶۷۸۹')).toBe('0123456789');
    expect(toLatinDigits('٢٫٥')).toBe('2.5');
  });
});

describe('cleanImportedPhone', () => {
  it('restores the leading zero Excel drops from Egyptian mobiles', () => {
    expect(cleanImportedPhone('1012345678')).toBe('01012345678');
    expect(cleanImportedPhone('١٠١٢٣٤٥٦٧٨')).toBe('01012345678');
  });

  it('strips spaces, dashes and brackets but keeps a leading +', () => {
    expect(cleanImportedPhone('010-1234 5678')).toBe('01012345678');
    expect(cleanImportedPhone('+20 (10) 1234-5678')).toBe('+201012345678');
    expect(cleanImportedPhone('\u200E٠١٠١٢٣٤٥٦٧٨')).toBe('01012345678');
  });

  it('leaves other numbers alone', () => {
    expect(cleanImportedPhone('01012345678')).toBe('01012345678');
    expect(cleanImportedPhone('201012345678')).toBe('201012345678');
    expect(cleanImportedPhone('22345678')).toBe('22345678');
    expect(cleanImportedPhone('')).toBe('');
  });
});

describe('parseImportedAmount', () => {
  it.each([
    ['2,500,000', 2_500_000],
    ['2.5M', 2_500_000],
    ['2.5 m', 2_500_000],
    ['500k', 500_000],
    ['٣ مليون', 3_000_000],
    ['٢٫٥ مليون', 2_500_000],
    ['2,5 مليون', 2_500_000],
    ['500 ألف', 500_000],
    ['EGP 1,200,000', 1_200_000],
    ['3 000 000', 3_000_000],
    ['1500000', 1_500_000],
  ])('%s → %d', (text, expected) => {
    expect(parseImportedAmount(text)).toBe(expected);
  });

  it('returns undefined for blanks and non-amounts', () => {
    expect(parseImportedAmount('')).toBeUndefined();
    expect(parseImportedAmount('call me')).toBeUndefined();
    expect(parseImportedAmount('0')).toBeUndefined();
  });
});

describe('parseImportedBudget', () => {
  it('reads a single value as min = max', () => {
    expect(parseImportedBudget('3M')).toEqual({
      min: 3_000_000,
      max: 3_000_000,
    });
  });

  it('reads ranges, carrying a unit written once', () => {
    expect(parseImportedBudget('2-3M')).toEqual({
      min: 2_000_000,
      max: 3_000_000,
    });
    expect(parseImportedBudget('2M - 3.5M')).toEqual({
      min: 2_000_000,
      max: 3_500_000,
    });
    expect(parseImportedBudget('من ٢ إلى ٣ مليون')).toEqual({
      min: 2_000_000,
      max: 3_000_000,
    });
    expect(parseImportedBudget('3,000,000 - 2,000,000')).toEqual({
      min: 2_000_000,
      max: 3_000_000,
    });
  });

  it('returns nothing for blanks', () => {
    expect(parseImportedBudget('')).toEqual({});
    expect(parseImportedBudget('flexible')).toEqual({});
  });
});

describe('profile options', () => {
  it('accepts enum values, labels and Arabic words', () => {
    expect(parsePaymentPreference('Installments')).toBe('INSTALLMENTS');
    expect(parsePaymentPreference('تقسيط')).toBe('INSTALLMENTS');
    expect(parsePaymentPreference('كاش')).toBe('CASH');
    expect(parseContactChannel('واتساب')).toBe('WHATSAPP');
    expect(parseContactChannel('Phone call')).toBe('CALL');
    expect(parseContactTime('مساء\u064B')).toBe('EVENING');
    expect(parseContactTime('Morning')).toBe('MORNING');
    expect(parsePurchasePurpose('استثمار')).toBe('INVESTMENT');
    expect(parsePurchasePurpose('للسكن')).toBe('LIVING');
  });

  it('ignores unknown values', () => {
    expect(parsePaymentPreference('bitcoin')).toBeUndefined();
    expect(parseContactTime('')).toBeUndefined();
  });
});

describe('splitImportedList', () => {
  it('splits on Latin/Arabic commas, slashes and pipes', () => {
    expect(
      splitImportedList('Mivida, Zed ، Palm Hills / Sodic | Hyde'),
    ).toEqual(['Mivida', 'Zed', 'Palm Hills', 'Sodic', 'Hyde']);
  });
});
