import {
  calculateConversionRate,
  calculateDropOffPercentage,
  calculatePercentage,
  calculateSourceConversionRate,
} from './analytics.mapper';

describe('analytics.mapper', () => {
  describe('calculateConversionRate', () => {
    it('returns 0 when there are no closed leads', () => {
      expect(calculateConversionRate(0, 0)).toBe(0);
    });

    it('calculates won / (won + lost) × 100 rounded to two decimals', () => {
      expect(calculateConversionRate(40, 12)).toBe(76.92);
      expect(calculateConversionRate(1, 2)).toBe(33.33);
    });
  });

  describe('calculateSourceConversionRate', () => {
    it('calculates won / total × 100 for marketing sources', () => {
      expect(calculateSourceConversionRate(52, 180)).toBe(28.9);
    });
  });

  describe('calculatePercentage', () => {
    it('returns 0 when total is zero', () => {
      expect(calculatePercentage(10, 0)).toBe(0);
    });

    it('calculates part / total × 100 rounded to one decimal', () => {
      expect(calculatePercentage(52, 167)).toBe(31.1);
      expect(calculatePercentage(180, 424)).toBe(42.5);
    });
  });

  describe('calculateDropOffPercentage', () => {
    it('calculates funnel drop-off between consecutive stages', () => {
      expect(calculateDropOffPercentage(500, 210)).toBe(58);
    });

    it('returns 0 when previous stage count is zero', () => {
      expect(calculateDropOffPercentage(0, 10)).toBe(0);
    });
  });
});
