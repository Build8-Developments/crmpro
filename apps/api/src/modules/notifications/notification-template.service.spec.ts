import { NotificationType } from '@crmpro/database';
import { NotificationTemplateService } from './notification-template.service';

describe('NotificationTemplateService', () => {
  let service: NotificationTemplateService;

  beforeEach(() => {
    service = new NotificationTemplateService();
  });

  it('builds lead assigned template', () => {
    expect(
      service.buildTemplate({
        type: NotificationType.LEAD_ASSIGNED,
        metadata: { leadName: 'Ahmed Ali' },
      }),
    ).toEqual({
      title: 'New Lead Assigned',
      message: 'A new lead has been assigned to you: Ahmed Ali.',
      priority: 'HIGH',
    });
  });

  it('builds import completed template', () => {
    expect(
      service.buildTemplate({
        type: NotificationType.IMPORT_COMPLETED,
        metadata: { successfulRows: 120 },
      }),
    ).toEqual({
      title: 'Import Completed',
      message: 'Your import job completed with 120 successful row(s).',
      priority: 'NORMAL',
    });
  });
});
