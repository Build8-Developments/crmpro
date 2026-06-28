import { Injectable } from '@nestjs/common';

const MAX_COMPLETION_SAMPLES = 10_000;

@Injectable()
export class TaskMetricsStore {
  private created = 0;
  private completed = 0;
  private overdue = 0;
  private remindersSent = 0;
  private totalCompletionMs = 0;
  private completionCount = 0;

  recordCreated(): void {
    this.created += 1;
  }

  recordCompleted(durationMs: number): void {
    this.completed += 1;
    this.completionCount += 1;
    this.totalCompletionMs += durationMs;
  }

  recordOverdue(): void {
    this.overdue += 1;
  }

  recordReminderSent(): void {
    this.remindersSent += 1;
  }

  getSnapshot() {
    return {
      created: this.created,
      completed: this.completed,
      overdue: this.overdue,
      remindersSent: this.remindersSent,
      averageCompletionTimeHours:
        this.completionCount === 0
          ? 0
          : Math.round((this.totalCompletionMs / this.completionCount / 3_600_000) * 10) / 10,
    };
  }
}
