import { NotificationPriority, NotificationType } from '@crmpro/database';
import { EmailNotificationChannel } from './email-notification.channel';

describe('EmailNotificationChannel', () => {
  const context = {
    tenantId: 'tenant-1',
    recipientUserId: 'agent-1',
    type: NotificationType.LEAD_ASSIGNED,
    title: 'New Lead Assigned',
    message: 'A new lead has been assigned to you: Client.',
    metadata: { leadId: 'lead-1' },
    priority: NotificationPriority.HIGH,
  };
  let prisma: {
    notificationPreference: { findUnique: jest.Mock };
    user: { findFirst: jest.Mock };
  };
  let mail: { send: jest.Mock; workspaceUrl: jest.Mock };
  let channel: EmailNotificationChannel;

  beforeEach(() => {
    prisma = {
      notificationPreference: {
        findUnique: jest.fn().mockResolvedValue({
          tenantId: 'tenant-1',
          enabled: true,
          emailEnabled: true,
        }),
      },
      user: {
        findFirst: jest.fn().mockResolvedValue({
          email: 'agent@x.com',
          tenant: { slug: 'prime' },
        }),
      },
    };
    mail = {
      send: jest.fn(),
      workspaceUrl: jest.fn(
        (slug: string, path: string) => `https://${slug}.app.test${path}`,
      ),
    };
    channel = new EmailNotificationChannel(prisma as never, mail as never);
  });

  it('emails opted-in users with a deep link to the lead', async () => {
    await channel.deliver(context);

    expect(mail.send).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'agent@x.com',
        text: expect.stringContaining(
          'https://prime.app.test/leads?id=lead-1',
        ) as string,
      }),
    );
  });

  it('stays quiet unless the category is opted into email', async () => {
    prisma.notificationPreference.findUnique.mockResolvedValue({
      tenantId: 'tenant-1',
      enabled: true,
      emailEnabled: false,
    });

    await channel.deliver(context);
    expect(mail.send).not.toHaveBeenCalled();
  });

  it('never throws (a mail failure must not retry in-app delivery)', async () => {
    mail.send.mockRejectedValue(new Error('SMTP down'));

    await expect(channel.deliver(context)).resolves.toBeUndefined();
  });
});
