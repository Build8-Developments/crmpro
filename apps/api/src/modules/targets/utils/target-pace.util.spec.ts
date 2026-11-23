import { TargetMetric } from '@crmpro/database';
import { DEFAULT_WORK_SCHEDULE } from '@crmpro/shared/workflow';
import {
  evaluateProgress,
  monthPace,
  roundSuggestion,
} from './target-pace.util';

// Saturday–Thursday, 10:00–19:00 Cairo.
const schedule = DEFAULT_WORK_SCHEDULE;

describe('monthPace', () => {
  // November 2026 has 30 days and four Fridays (6, 13, 20, 27).
  it('counts working days and the elapsed share mid-month', () => {
    // Tue 17 Nov, 12:00 Cairo: 14 full working days + 2h of a 9h day.
    const pace = monthPace(
      '2026-11',
      new Date('2026-11-17T10:00:00Z'),
      schedule,
    );
    expect(pace.workingDays).toBe(26);
    expect(pace.elapsedWorkingDays).toBeCloseTo(14.22, 2);
    expect(pace.share).toBeCloseTo((14 + 2 / 9) / 26, 5);
  });

  it('does not count today before opening time', () => {
    const pace = monthPace(
      '2026-11',
      new Date('2026-11-17T06:00:00Z'), // 08:00 Cairo
      schedule,
    );
    expect(pace.elapsedWorkingDays).toBe(14);
  });

  it('uses the Cairo date, not the UTC date, at month edges', () => {
    // 22:30 UTC on 31 Oct is already 1 Nov (a Sunday) in Cairo, before work.
    const pace = monthPace(
      '2026-11',
      new Date('2026-10-31T22:30:00Z'),
      schedule,
    );
    expect(pace.elapsedWorkingDays).toBe(0);
    expect(pace.share).toBe(0);
    expect(
      monthPace('2026-10', new Date('2026-10-31T22:30:00Z'), schedule).share,
    ).toBe(1);
  });

  it('is complete for past months and empty for future ones', () => {
    const now = new Date('2026-11-17T10:00:00Z');
    expect(monthPace('2026-10', now, schedule).share).toBe(1);
    expect(monthPace('2026-12', now, schedule).share).toBe(0);
  });

  it('falls back to calendar days without working days', () => {
    const pace = monthPace('2026-11', new Date('2026-11-16T10:00:00Z'), {
      ...schedule,
      workingDays: [],
    });
    expect(pace.workingDays).toBe(30);
  });
});

describe('evaluateProgress', () => {
  it('is on track when the actual keeps pace', () => {
    const result = evaluateProgress(TargetMetric.DEALS, 10, 5, 0.5);
    expect(result).toMatchObject({
      status: 'ON_TRACK',
      expected: 5,
      percent: 50,
      behindBy: 0,
    });
  });

  it('reports how many units behind', () => {
    const result = evaluateProgress(TargetMetric.INTERACTIONS, 400, 150, 0.5);
    expect(result).toMatchObject({ status: 'BEHIND', behindBy: 50 });
  });

  it('forgives a gap under half a unit', () => {
    expect(evaluateProgress(TargetMetric.DEALS, 4, 2, 0.6).status).toBe(
      'ON_TRACK',
    );
  });

  it('marks a met target as hit', () => {
    expect(
      evaluateProgress(TargetMetric.REVENUE, 1_000_000, 1_200_000, 0.3),
    ).toMatchObject({ status: 'HIT', percent: 120, behindBy: 0 });
  });

  it('has no status without a target', () => {
    expect(evaluateProgress(TargetMetric.VISITS, null, 3, 0.5)).toMatchObject({
      target: null,
      status: null,
      expected: null,
    });
  });
});

describe('roundSuggestion', () => {
  it('rounds counts to whole units and money to 10,000', () => {
    expect(roundSuggestion(TargetMetric.DEALS, 2.6)).toBe(3);
    expect(roundSuggestion(TargetMetric.REVENUE, 4_567_890)).toBe(4_570_000);
    expect(roundSuggestion(TargetMetric.COMMISSION, 114_999)).toBe(110_000);
  });

  it('suggests nothing when history rounds to zero', () => {
    expect(roundSuggestion(TargetMetric.DEALS, 0.3)).toBeNull();
    expect(roundSuggestion(TargetMetric.REVENUE, 4_000)).toBeNull();
  });
});
