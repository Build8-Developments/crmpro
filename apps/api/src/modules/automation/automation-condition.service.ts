import { Injectable } from '@nestjs/common';
import { AutomationConditionOperator } from '@prisma/client';
import { AutomationConditionInput } from './entities/automation.types';

@Injectable()
export class AutomationConditionService {
  evaluateAll(
    conditions: AutomationConditionInput[],
    entityData: Record<string, unknown>,
  ): boolean {
    if (conditions.length === 0) {
      return true;
    }

    return conditions.every((condition) =>
      this.evaluateCondition(condition, entityData),
    );
  }

  evaluateCondition(
    condition: AutomationConditionInput,
    entityData: Record<string, unknown>,
  ): boolean {
    const actual = this.resolveFieldValue(entityData, condition.field);
    const expected = condition.value ?? null;

    switch (condition.operator) {
      case AutomationConditionOperator.EQUALS:
        return this.compareEqual(actual, expected);
      case AutomationConditionOperator.NOT_EQUALS:
        return !this.compareEqual(actual, expected);
      case AutomationConditionOperator.GREATER_THAN:
        return this.toNumber(actual) > this.toNumber(expected);
      case AutomationConditionOperator.LESS_THAN:
        return this.toNumber(actual) < this.toNumber(expected);
      case AutomationConditionOperator.CONTAINS:
        return this.toString(actual)
          .toLowerCase()
          .includes(this.toString(expected).toLowerCase());
      case AutomationConditionOperator.NOT_CONTAINS:
        return !this.toString(actual)
          .toLowerCase()
          .includes(this.toString(expected).toLowerCase());
      case AutomationConditionOperator.IN:
        return this.parseList(expected).includes(this.toString(actual));
      case AutomationConditionOperator.NOT_IN:
        return !this.parseList(expected).includes(this.toString(actual));
      case AutomationConditionOperator.IS_EMPTY:
        return this.isEmpty(actual);
      case AutomationConditionOperator.IS_NOT_EMPTY:
        return !this.isEmpty(actual);
      default:
        return false;
    }
  }

  private resolveFieldValue(
    entityData: Record<string, unknown>,
    field: string,
  ): unknown {
    const parts = field.split('.');
    let current: unknown = entityData;

    for (const part of parts) {
      if (current === null || current === undefined) {
        return null;
      }

      if (typeof current !== 'object') {
        return null;
      }

      current = (current as Record<string, unknown>)[part];
    }

    return current ?? null;
  }

  private compareEqual(actual: unknown, expected: string | null): boolean {
    if (actual === null || actual === undefined) {
      return expected === null || expected === '';
    }

    if (typeof actual === 'number' || typeof actual === 'bigint') {
      return Number(actual) === Number(expected);
    }

    if (typeof actual === 'boolean') {
      return actual === (expected === 'true');
    }

    return this.toString(actual) === this.toString(expected);
  }

  private toNumber(value: unknown): number {
    if (value === null || value === undefined || value === '') {
      return 0;
    }

    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  private toString(value: unknown): string {
    if (value === null || value === undefined) {
      return '';
    }

    if (typeof value === 'object') {
      return JSON.stringify(value);
    }

    return String(value);
  }

  private parseList(value: string | null): string[] {
    if (!value) {
      return [];
    }

    return value.split(',').map((item) => item.trim()).filter(Boolean);
  }

  private isEmpty(value: unknown): boolean {
    if (value === null || value === undefined) {
      return true;
    }

    if (typeof value === 'string') {
      return value.trim().length === 0;
    }

    if (Array.isArray(value)) {
      return value.length === 0;
    }

    return false;
  }
}
