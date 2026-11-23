import { SYSTEM_LEAD_SCOPE } from '../../../common/auth';
import { NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { maskEmail, maskPhone } from '@crmpro/shared/leads';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { AuditWriterService } from '../../audit/audit-writer.service';
import { LeadActivityService } from './lead-activity.service';
import {
  CONTACT_AUDIT_ACTION,
  LeadContactAccessService,
} from './lead-contact-access.service';

describe('contact masking', () => {
  it('keeps the operator prefix and last two digits of a phone', () => {
    expect(maskPhone('01012345678')).toBe('010••••••78');
    expect(maskPhone('+201012345678')).toBe('+20••••••••78');
  });

  it('keeps the first letter and the domain of an email', () => {
    expect(maskEmail('ahmed.hassan@gmail.com')).toBe('a••••@gmail.com');
  });
});

describe('LeadContactAccessService', () => {
  let service: LeadContactAccessService;
  const tx = {};
  const prisma = {
    lead: { findFirst: jest.fn() },
    $transaction: jest.fn((fn: (client: unknown) => unknown) => fn(tx)),
  };
  const activity = { createActivity: jest.fn() };
  const audit = { createAuditLog: jest.fn() };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module = await Test.createTestingModule({
      providers: [
        LeadContactAccessService,
        { provide: PrismaService, useValue: prisma },
        { provide: LeadActivityService, useValue: activity },
        { provide: AuditWriterService, useValue: audit },
      ],
    }).compile();
    service = module.get(LeadContactAccessService);
  });

  it('returns the real value and logs it on the timeline and in the audit log', async () => {
    prisma.lead.findFirst.mockResolvedValue({
      id: 'lead-1',
      primaryPhone: '01012345678',
      secondaryPhone: null,
      email: 'a@b.com',
    });

    const result = await service.access(
      't',
      'u',
      'lead-1',
      'primaryPhone',
      'COPY',
      SYSTEM_LEAD_SCOPE,
    );

    expect(result).toEqual({ field: 'primaryPhone', value: '01012345678' });
    expect(activity.createActivity).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: 'CONTACT_ACCESSED',
        metadata: { field: 'primaryPhone', action: 'COPY' },
      }),
      tx,
    );
    expect(audit.createAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        action: CONTACT_AUDIT_ACTION,
        entityId: 'lead-1',
        tx,
      }),
    );
  });

  it('logs nothing for an empty field', async () => {
    prisma.lead.findFirst.mockResolvedValue({
      id: 'lead-1',
      primaryPhone: '010',
      secondaryPhone: null,
      email: null,
    });
    const result = await service.access(
      't',
      'u',
      'lead-1',
      'secondaryPhone',
      'REVEAL',
      SYSTEM_LEAD_SCOPE,
    );
    expect(result.value).toBeNull();
    expect(activity.createActivity).not.toHaveBeenCalled();
  });

  it('404s for a lead outside the tenant', async () => {
    prisma.lead.findFirst.mockResolvedValue(null);
    await expect(
      service.access('t', 'u', 'x', 'email', 'REVEAL', SYSTEM_LEAD_SCOPE),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it("only reveals contacts of leads inside the agent's scope", async () => {
    prisma.lead.findFirst.mockResolvedValue(null);
    await expect(
      service.access(
        't',
        'agent-1',
        'lead-of-someone-else',
        'primaryPhone',
        'REVEAL',
        {
          kind: 'own',
          actorUserId: 'agent-1',
        },
      ),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.lead.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          OR: [
            { assignedUserId: { in: ['agent-1'] } },
            { assignedUserId: null },
          ],
        }),
      }),
    );
    expect(audit.createAuditLog).not.toHaveBeenCalled();
  });
});
