import { Injectable } from '@nestjs/common';

const MAX_EXECUTION_SAMPLES = 10_000;

@Injectable()
export class AutomationMetricsStore {
  private executions = 0;
  private successes = 0;
  private failures = 0;
  private skipped = 0;
  private totalExecutionMs = 0;
  private completedCount = 0;
  private readonly executionDurations: number[] = [];

  recordExecution(): void {
    this.executions += 1;
  }

  recordSuccess(durationMs: number): void {
    this.successes += 1;
    this.recordDuration(durationMs);
  }

  recordFailure(): void {
    this.failures += 1;
  }

  recordSkipped(): void {
    this.skipped += 1;
  }

  recordPartial(durationMs: number): void {
    this.failures += 1;
    this.recordDuration(durationMs);
  }

  private recordDuration(durationMs: number): void {
    this.completedCount += 1;
    this.totalExecutionMs += durationMs;
    this.executionDurations.push(durationMs);

    if (this.executionDurations.length > MAX_EXECUTION_SAMPLES) {
      this.executionDurations.shift();
    }
  }

  getSnapshot() {
    const finished = this.successes + this.failures;
    return {
      executions: this.executions,
      successes: this.successes,
      failures: this.failures,
      skipped: this.skipped,
      averageExecutionTimeMs:
        this.completedCount === 0
          ? 0
          : Math.round(this.totalExecutionMs / this.completedCount),
      successRate:
        finished === 0 ? 100 : Math.round((this.successes / finished) * 100),
    };
  }
}
