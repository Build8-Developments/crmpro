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

  it('builds project update template with priority by update type', () => {
    expect(
      service.buildTemplate({
        type: NotificationType.PROJECT_UPDATE,
        metadata: {
          projectName: 'Mivida',
          title: 'New price list',
          updateType: 'PRICE_CHANGE',
          message: 'Prices up 5% from December.',
        },
      }),
    ).toEqual({
      title: 'Mivida: New price list',
      message: 'Prices up 5% from December.',
      priority: 'HIGH',
    });
    expect(
      service.buildTemplate({
        type: NotificationType.PROJECT_UPDATE,
        metadata: {
          projectName: 'Mivida',
          title: 'Open day',
          updateType: 'GENERAL',
        },
      }).priority,
    ).toBe('NORMAL');
  });
});
