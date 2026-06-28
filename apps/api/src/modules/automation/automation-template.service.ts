import { BadRequestException, Injectable } from '@nestjs/common';
import { AutomationActionType } from '@prisma/client';
import { AutomationActionInput } from './entities/automation.types';

@Injectable()
export class AutomationTemplateService {
  validateActionConfiguration(
    actionType: AutomationActionType,
    configuration: Record<string, unknown>,
  ): void {
    switch (actionType) {
      case AutomationActionType.CREATE_NOTIFICATION:
        this.requireFields(configuration, ['recipientUserId', 'title', 'message']);
        break;
      case AutomationActionType.ASSIGN_AGENT:
        this.requireFields(configuration, ['userId']);
        break;
      case AutomationActionType.MOVE_STAGE:
        this.requireFields(configuration, ['pipelineStageId']);
        break;
      case AutomationActionType.CREATE_NOTE:
        this.requireFields(configuration, ['content']);
        break;
      case AutomationActionType.CREATE_ACTIVITY:
        this.requireFields(configuration, ['eventType']);
        break;
      case AutomationActionType.DELAY:
        this.requireFields(configuration, ['delayMs']);
        break;
      case AutomationActionType.CREATE_TASK:
        this.requireFields(configuration, ['title']);
        break;
      case AutomationActionType.ADD_TAG:
      case AutomationActionType.REMOVE_TAG:
        this.requireFields(configuration, ['tag']);
        break;
      case AutomationActionType.CREATE_TASK:
      case AutomationActionType.SEND_EMAIL:
      case AutomationActionType.WEBHOOK:
        break;
      default:
        throw new BadRequestException(`Unsupported action type: ${actionType}`);
    }
  }

  validateActions(actions: AutomationActionInput[]): void {
    if (actions.length === 0) {
      throw new BadRequestException('At least one action is required');
    }

    const orders = new Set<number>();

    for (const action of actions) {
      if (orders.has(action.executionOrder)) {
        throw new BadRequestException('Action execution orders must be unique');
      }

      orders.add(action.executionOrder);
      this.validateActionConfiguration(action.actionType, action.configuration);
    }
  }

  private requireFields(
    configuration: Record<string, unknown>,
    fields: string[],
  ): void {
    for (const field of fields) {
      if (
        configuration[field] === undefined ||
        configuration[field] === null ||
        configuration[field] === ''
      ) {
        throw new BadRequestException(
          `Action configuration missing required field: ${field}`,
        );
      }
    }
  }
}
