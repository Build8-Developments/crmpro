import { phoneMatchVariants } from './phone-normalization.util';

describe('phoneMatchVariants', () => {
  it('links local and international spellings of an Egyptian mobile', () => {
    const local = phoneMatchVariants('010 1234 5678', 'EG');
    const intl = phoneMatchVariants('+201012345678', 'EG');

    for (const spelling of [
      '01012345678',
      '+201012345678',
      '201012345678',
      '00201012345678',
    ]) {
      expect(local).toContain(spelling);
      expect(intl).toContain(spelling);
    }
  });

  it('recognises other countries from the + prefix', () => {
    expect(phoneMatchVariants('+966501234567', 'EG')).toContain('0501234567');
    expect(phoneMatchVariants('+96591234567', 'EG')).toContain('91234567');
  });

  it('handles countries without a trunk zero', () => {
    expect(phoneMatchVariants('91234567', 'KW')).toContain('+96591234567');
  });

  it('converts Arabic-Indic digits', () => {
    expect(phoneMatchVariants('٠١٠١٢٣٤٥٦٧٨', 'EG')).toContain('+201012345678');
  });

  it('keeps unknown formats as typed', () => {
    expect(phoneMatchVariants('+15551234567', 'EG')).toEqual(['+15551234567']);
  });
});
