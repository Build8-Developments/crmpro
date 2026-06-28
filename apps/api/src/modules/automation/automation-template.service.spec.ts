import { BadRequestException } from '@nestjs/common';
import { AutomationActionType } from '@prisma/client';
import { AutomationTemplateService } from './automation-template.service';

describe('AutomationTemplateService', () => {
  const service = new AutomationTemplateService();

  it('requires at least one action', () => {
    expect(() => service.validateActions([])).toThrow(BadRequestException);
  });

  it('validates CREATE_NOTIFICATION configuration', () => {
    expect(() =>
      service.validateActionConfiguration(
        AutomationActionType.CREATE_NOTIFICATION,
        { recipientUserId: 'user-1', title: 'Hi', message: 'Hello' },
      ),
    ).not.toThrow();
  });

  it('rejects duplicate execution orders', () => {
    expect(() =>
      service.validateActions([
        {
          actionType: AutomationActionType.DELAY,
          configuration: { delayMs: 1000 },
          executionOrder: 0,
        },
        {
          actionType: AutomationActionType.CREATE_NOTE,
          configuration: { content: 'Note' },
          executionOrder: 0,
        },
      ]),
    ).toThrow(BadRequestException);
  });
});
