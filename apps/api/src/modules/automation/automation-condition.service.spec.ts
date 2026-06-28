import { AutomationConditionOperator } from '@prisma/client';
import { AutomationConditionService } from './automation-condition.service';

describe('AutomationConditionService', () => {
  const service = new AutomationConditionService();

  it('returns true when no conditions are configured', () => {
    expect(service.evaluateAll([], { budgetMax: 1000 })).toBe(true);
  });

  it('evaluates EQUALS on nested fields', () => {
    expect(
      service.evaluateCondition(
        {
          field: 'source.name',
          operator: AutomationConditionOperator.EQUALS,
          value: 'Facebook',
        },
        { source: { name: 'Facebook' } },
      ),
    ).toBe(true);
  });

  it('evaluates GREATER_THAN on numeric fields', () => {
    expect(
      service.evaluateCondition(
        {
          field: 'budgetMax',
          operator: AutomationConditionOperator.GREATER_THAN,
          value: '5000000',
        },
        { budgetMax: 6000000 },
      ),
    ).toBe(true);
  });

  it('evaluates IN operator', () => {
    expect(
      service.evaluateCondition(
        {
          field: 'pipelineStageId',
          operator: AutomationConditionOperator.IN,
          value: 'stage-1,stage-2',
        },
        { pipelineStageId: 'stage-2' },
      ),
    ).toBe(true);
  });

  it('evaluates IS_EMPTY', () => {
    expect(
      service.evaluateCondition(
        {
          field: 'assignedUserId',
          operator: AutomationConditionOperator.IS_EMPTY,
          value: null,
        },
        { assignedUserId: null },
      ),
    ).toBe(true);
  });

  it('requires all conditions to pass (AND logic)', () => {
    expect(
      service.evaluateAll(
        [
          {
            field: 'source.name',
            operator: AutomationConditionOperator.EQUALS,
            value: 'Facebook',
          },
          {
            field: 'budgetMax',
            operator: AutomationConditionOperator.GREATER_THAN,
            value: '5000000',
          },
        ],
        { source: { name: 'Facebook' }, budgetMax: 6000000 },
      ),
    ).toBe(true);

    expect(
      service.evaluateAll(
        [
          {
            field: 'source.name',
            operator: AutomationConditionOperator.EQUALS,
            value: 'Facebook',
          },
          {
            field: 'budgetMax',
            operator: AutomationConditionOperator.GREATER_THAN,
            value: '5000000',
          },
        ],
        { source: { name: 'Facebook' }, budgetMax: 1000 },
      ),
    ).toBe(false);
  });
});
