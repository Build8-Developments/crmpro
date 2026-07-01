import { BadRequestException } from '@nestjs/common';
import {
  isAnalyticsRangeKey,
  parseAnalyticsRange,
} from './analytics-range.util';

describe('analytics-range.util', () => {
  it('parses supported ranges into inclusive UTC day bounds', () => {
    const range = parseAnalyticsRange('7d');

    expect(range.from).toBeInstanceOf(Date);
    expect(range.to).toBeInstanceOf(Date);
    expect(range.from!.getUTCHours()).toBe(0);
    expect(range.to!.getUTCHours()).toBe(23);
  });

  it('defaults to 30d', () => {
    const range = parseAnalyticsRange();

    const diffDays = Math.round(
      (range.to!.getTime() - range.from!.getTime()) / (24 * 60 * 60 * 1000),
    );
    expect(diffDays).toBeGreaterThanOrEqual(29);
    expect(diffDays).toBeLessThanOrEqual(30);
  });

  it('rejects invalid range values', () => {
    expect(() => parseAnalyticsRange('14d' as never)).toThrow(
      BadRequestException,
    );
  });

  it('identifies valid range keys', () => {
    expect(isAnalyticsRangeKey('90d')).toBe(true);
    expect(isAnalyticsRangeKey('1y')).toBe(false);
  });
});
