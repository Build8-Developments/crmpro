import { Injectable } from '@nestjs/common';
import { NotificationPriority, NotificationType } from '@crmpro/database';
import {
  NotificationTemplateInput,
  NotificationTemplateResult,
} from './entities/notification.types';

@Injectable()
export class NotificationTemplateService {
  buildTemplate(input: NotificationTemplateInput): NotificationTemplateResult {
    switch (input.type) {
      case NotificationType.LEAD_ASSIGNED:
        return {
          title: 'New Lead Assigned',
          message: `A new lead has been assigned to you: ${this.asString(input.metadata.leadName, 'Lead')}.`,
          priority: NotificationPriority.HIGH,
        };
      case NotificationType.IMPORT_COMPLETED:
        return {
          title: 'Import Completed',
          message: `Your import job completed with ${this.asNumber(input.metadata.successfulRows)} successful row(s).`,
          priority: NotificationPriority.NORMAL,
        };
      case NotificationType.EXPORT_COMPLETED:
        return {
          title: 'Export Completed',
          message: `Your export job completed with ${this.asNumber(input.metadata.rowCount)} row(s).`,
          priority: NotificationPriority.NORMAL,
        };
      case NotificationType.LEAD_STAGE_CHANGED:
        return {
          title: 'Lead Stage Changed',
          message: `${this.asString(input.metadata.leadName, 'Lead')} moved from ${this.asString(input.metadata.fromStageName, 'previous stage')} to ${this.asString(input.metadata.toStageName, 'new stage')}.`,
          priority: NotificationPriority.NORMAL,
        };
      case NotificationType.LEAD_WON:
        return {
          title: 'Lead Won',
          message: `${this.asString(input.metadata.leadName, 'Lead')} has been marked as won.`,
          priority: NotificationPriority.HIGH,
        };
      case NotificationType.LEAD_LOST:
        return {
          title: 'Lead Lost',
          message: `${this.asString(input.metadata.leadName, 'Lead')} has been marked as lost.`,
          priority: NotificationPriority.NORMAL,
        };
      case NotificationType.FILE_DELETED:
        return {
          title: 'File Deleted',
          message: `File "${this.asString(input.metadata.fileName, 'Attachment')}" was deleted.`,
          priority: NotificationPriority.LOW,
        };
      case NotificationType.SECURITY:
        return {
          title: 'Security Alert',
          message: this.asString(
            input.metadata.message,
            'A security-related event occurred on your account.',
          ),
          priority: NotificationPriority.CRITICAL,
        };
      case NotificationType.REMINDER:
        return {
          title: this.asString(input.metadata.title, 'Reminder'),
          message: this.asString(
            input.metadata.message,
            'You have a pending reminder.',
          ),
          priority: NotificationPriority.NORMAL,
        };
      case NotificationType.TASK_ASSIGNED:
        return {
          title: 'New task',
          message: `${this.asString(input.metadata.taskTitle, 'A task')}${this.leadSuffix(input.metadata)} was added to your day.`,
          priority: NotificationPriority.NORMAL,
        };
      case NotificationType.TASK_DUE:
        return {
          title: 'Due soon',
          message: `${this.asString(input.metadata.taskTitle, 'A task')}${this.leadSuffix(input.metadata)} is due soon.`,
          priority: NotificationPriority.HIGH,
        };
      case NotificationType.TASK_OVERDUE:
        return {
          title: 'Overdue',
          message: `${this.asString(input.metadata.taskTitle, 'A task')}${this.leadSuffix(input.metadata)} is overdue.`,
          priority: NotificationPriority.HIGH,
        };
      case NotificationType.TASK_COMPLETED:
        return {
          title: 'Task completed',
          message: `${this.asString(input.metadata.taskTitle, 'A task')}${this.leadSuffix(input.metadata)} was completed.`,
          priority: NotificationPriority.LOW,
        };
      case NotificationType.ESCALATION:
        return {
          title: this.asString(input.metadata.title, 'Needs your attention'),
          message: this.asString(
            input.metadata.message,
            'Something on your team needs attention.',
          ),
          priority: NotificationPriority.HIGH,
        };
      case NotificationType.ACHIEVEMENT:
        return {
          title: `Badge unlocked: ${this.asString(input.metadata.badgeName, 'New badge')}`,
          message: `You reached "${this.asString(input.metadata.levelLabel, 'a new level')}". See all your badges on My performance.`,
          priority: NotificationPriority.NORMAL,
        };
      case NotificationType.PROJECT_UPDATE: {
        const updateType = this.asString(input.metadata.updateType, '');
        return {
          title: `${this.asString(input.metadata.projectName, 'Project')}: ${this.asString(input.metadata.title, 'New update')}`,
          message: this.asString(
            input.metadata.message,
            'A project you are selling has a new update.',
          ),
          // Price and availability changes mean re-quoting clients today.
          priority:
            updateType === 'PRICE_CHANGE' || updateType === 'AVAILABILITY'
              ? NotificationPriority.HIGH
              : NotificationPriority.NORMAL,
        };
      }
      case NotificationType.SYSTEM:
      case NotificationType.SUPPORT_REPLY:
      default:
        return {
          title: this.asString(input.metadata.title, 'System Notification'),
          message: this.asString(
            input.metadata.message,
            'A system notification was generated.',
          ),
          priority: NotificationPriority.NORMAL,
        };
    }
  }

  private asString(value: unknown, fallback: string): string {
    return typeof value === 'string' && value.trim().length > 0
      ? value.trim()
      : fallback;
  }

  private leadSuffix(metadata: Record<string, unknown>): string {
    const leadName = this.asString(metadata.leadName, '');
    return leadName ? ` for ${leadName}` : '';
  }

  private asNumber(value: unknown): number {
    return typeof value === 'number' && Number.isFinite(value) ? value : 0;
  }
}
