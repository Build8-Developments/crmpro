import { TaskMetricsStore } from './task-metrics.store';

describe('TaskMetricsStore', () => {
  it('tracks task lifecycle metrics', () => {
    const store = new TaskMetricsStore();

    store.recordCreated();
    store.recordCreated();
    store.recordCompleted(3_600_000);
    store.recordOverdue();
    store.recordReminderSent();

    expect(store.getSnapshot()).toEqual({
      created: 2,
      completed: 1,
      overdue: 1,
      remindersSent: 1,
      averageCompletionTimeHours: 1,
    });
  });
});
