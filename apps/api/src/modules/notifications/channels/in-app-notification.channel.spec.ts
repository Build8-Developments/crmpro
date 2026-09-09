import { Test, TestingModule } from '@nestjs/testing';
import { NotificationPriority, NotificationType } from '@crmpro/database';
import { DomainEventBus } from '../../../common/events/domain-event-bus.service';
import { NotificationCreatedEvent } from '../../../common/events/domain-event.types';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { InAppNotificationChannel } from './in-app-notification.channel';

describe('InAppNotificationChannel', () => {
  let channel: InAppNotificationChannel;
  let prisma: {
    $transaction: jest.Mock;
  };
  let eventBus: { publish: jest.Mock };
  let tx: {
    notification: {
      create: jest.Mock;
      createMany: jest.Mock;
      findFirst: jest.Mock;
    };
    auditLog: { create: jest.Mock };
  };

  beforeEach(async () => {
    tx = {
      notification: {
        create: jest.fn(),
        createMany: jest.fn(),
        findFirst: jest.fn(),
      },
      auditLog: { create: jest.fn().mockResolvedValue(undefined),
      },
    };
    prisma = {
      $transaction: jest.fn(async (callback) => callback(tx)),
    };
    eventBus = { publish: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InAppNotificationChannel,
        { provide: PrismaService, useValue: prisma },
        { provide: DomainEventBus, useValue: eventBus },
      ],
    }).compile();

    channel = module.get(InAppNotificationChannel);
  });

  const context = {
    tenantId: 'tenant-1',
    recipientUserId: 'user-1',
    type: NotificationType.IMPORT_COMPLETED,
    title: 'Import complete',
    message: 'Done',
    metadata: { importJobId: 'job-1' },
    priority: NotificationPriority.NORMAL,
    dedupeKey: 'import:job-1:IMPORT_COMPLETED:user-1',
  };

  it('creates notification and audit log on first delivery', async () => {
    tx.notification.createMany.mockResolvedValue({ count: 1 });
    tx.notification.findFirst.mockResolvedValue({ id: 'notification-1' });

    await channel.deliver(context);

    expect(tx.notification.createMany).toHaveBeenCalledWith({
      data: [
        expect.objectContaining({
          dedupeKey: context.dedupeKey,
        }),
      ],
      skipDuplicates: true,
    });
    expect(tx.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ entityId: 'notification-1' }),
      }),
    );

    expect(eventBus.publish).toHaveBeenCalledTimes(1);

    const event = eventBus.publish.mock.calls[0][0] as NotificationCreatedEvent;
    expect(event).toBeInstanceOf(NotificationCreatedEvent);
    expect(event.tenantId).toBe(context.tenantId);
    expect(event.userId).toBe(context.recipientUserId);
  });

  it('skips duplicate deliveries with the same dedupe key', async () => {
    tx.notification.createMany.mockResolvedValue({ count: 0 });

    await channel.deliver(context);

    expect(tx.notification.findFirst).not.toHaveBeenCalled();
    expect(tx.auditLog.create).not.toHaveBeenCalled();
    expect(eventBus.publish).not.toHaveBeenCalled();
  });
});
