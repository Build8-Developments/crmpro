import { Injectable, Logger } from '@nestjs/common';
import { AutomationActionType } from '@prisma/client';
import {
  AssignAgentActionHandler,
  CreateActivityActionHandler,
  CreateNoteActionHandler,
  CreateNotificationActionHandler,
  DelayActionHandler,
  MoveStageActionHandler,
  RemoveTagActionHandler,
  TagActionHandler,
  UnsupportedActionHandler,
} from './actions/automation-action.handlers';
import { CreateTaskActionHandler } from './actions/create-task.action.handler';
import {
  AutomationActionContext,
  AutomationActionHandler,
  AutomationActionResult,
} from './entities/automation-action-handler.types';

@Injectable()
export class AutomationActionService {
  private readonly logger = new Logger(AutomationActionService.name);
  private readonly handlers = new Map<
    AutomationActionType,
    AutomationActionHandler
  >();

  constructor(
    createNotificationHandler: CreateNotificationActionHandler,
    assignAgentHandler: AssignAgentActionHandler,
    moveStageHandler: MoveStageActionHandler,
    createNoteHandler: CreateNoteActionHandler,
    createActivityHandler: CreateActivityActionHandler,
    createTaskHandler: CreateTaskActionHandler,
    delayHandler: DelayActionHandler,
    tagHandler: TagActionHandler,
    removeTagHandler: RemoveTagActionHandler,
    unsupportedHandler: UnsupportedActionHandler,
  ) {
    const phase1Handlers: AutomationActionHandler[] = [
      createNotificationHandler,
      assignAgentHandler,
      moveStageHandler,
      createNoteHandler,
      createActivityHandler,
      createTaskHandler,
      delayHandler,
      tagHandler,
      removeTagHandler,
    ];

    for (const handler of phase1Handlers) {
      this.handlers.set(handler.actionType, handler);
    }

    for (const actionType of [
      AutomationActionType.SEND_EMAIL,
      AutomationActionType.WEBHOOK,
    ]) {
      this.handlers.set(actionType, unsupportedHandler);
    }
  }

  async executeAction(
    actionType: AutomationActionType,
    context: AutomationActionContext,
  ): Promise<AutomationActionResult> {
    const handler = this.handlers.get(actionType);

    if (!handler) {
      return {
        success: false,
        skipped: true,
        message: `No handler registered for action ${actionType}`,
      };
    }

    try {
      return await handler.execute({
        ...context,
        configuration: {
          ...context.configuration,
          _requestedType: actionType,
        },
      });
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Unknown action error';

      this.logger.error(
        `Automation action failed: workflow=${context.workflowId} action=${actionType} error=${message}`,
      );

      return { success: false, message };
    }
  }
}
