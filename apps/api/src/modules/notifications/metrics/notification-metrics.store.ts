import { Injectable } from '@nestjs/common';

const MAX_DELIVERY_SAMPLES = 10_000;

@Injectable()
export class NotificationMetricsStore {
  private created = 0;
  private deliveryFailures = 0;
  private totalDeliveryMs = 0;
  private deliveredCount = 0;
  private readonly deliveryDurations: number[] = [];

  recordCreated(): void {
    this.created += 1;
  }

  recordDelivered(durationMs: number): void {
    this.deliveredCount += 1;
    this.totalDeliveryMs += durationMs;
    this.deliveryDurations.push(durationMs);

    if (this.deliveryDurations.length > MAX_DELIVERY_SAMPLES) {
      this.deliveryDurations.shift();
    }
  }

  recordFailure(): void {
    this.deliveryFailures += 1;
  }

  getSnapshot() {
    return {
      created: this.created,
      deliveryFailures: this.deliveryFailures,
      averageDeliveryTimeMs:
        this.deliveredCount === 0
          ? 0
          : Math.round(this.totalDeliveryMs / this.deliveredCount),
    };
  }
}
