import { Logger, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import {
  API_ERROR_CODES,
  mapExceptionToApiErrorResponse,
} from '@crmpro/shared/errors';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AUTH_RATE_LIMIT_METADATA_KEY } from '../../common/rate-limit/rate-limit.constants';
import { RateLimitGuard } from '../../common/rate-limit/rate-limit.guard';
import { StorageService } from '../../common/storage/storage.service';
import { MailService } from '../mail/mail.service';
import { PublicController } from './public.controller';
import { PublicService } from './public.service';

describe('PublicService', () => {
  let service: PublicService;
  let prisma: {
    tenant: {
      findFirst: jest.Mock;
    };
    user: { findMany: jest.Mock };
  };
  let storage: { getSignedDownloadUrl: jest.Mock };
  let mail: { send: jest.Mock; workspaceUrl: jest.Mock };

  beforeEach(async () => {
    prisma = {
      tenant: {
        findFirst: jest.fn(),
      },
      user: { findMany: jest.fn().mockResolvedValue([]) },
    };
    mail = {
      send: jest.fn(),
      workspaceUrl: jest.fn(
        (slug: string, path: string) => `https://${slug}.nomow.test${path}`,
      ),
    };
    storage = {
      getSignedDownloadUrl: jest
        .fn()
        .mockResolvedValue({ url: 'https://signed.example/logo.png' }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PublicService,
        { provide: PrismaService, useValue: prisma },
        { provide: StorageService, useValue: storage },
        { provide: MailService, useValue: mail },
      ],
    }).compile();

    service = module.get(PublicService);
  });

  it('returns workspace details for an existing tenant', async () => {
    prisma.tenant.findFirst.mockResolvedValue({
      name: 'Prime Estates',
      slug: 'prime-estates',
    });

    await expect(
      service.lookupWorkspaceBySlug('prime-estates'),
    ).resolves.toEqual({
      exists: true,
      name: 'Prime Estates',
      slug: 'prime-estates',
      logoUrl: null,
    });

    expect(prisma.tenant.findFirst).toHaveBeenCalledWith({
      where: { slug: 'prime-estates', deletedAt: null },
      select: {
        name: true,
        slug: true,
        logoFile: { select: { objectKey: true, deletedAt: true } },
      },
    });
  });

  it('returns a signed logo URL when the workspace has a logo', async () => {
    prisma.tenant.findFirst.mockResolvedValue({
      name: 'Prime Estates',
      slug: 'prime-estates',
      logoFile: { objectKey: 'tenants/t/logo.png', deletedAt: null },
    });

    await expect(
      service.lookupWorkspaceBySlug('prime-estates'),
    ).resolves.toMatchObject({ logoUrl: 'https://signed.example/logo.png' });
    expect(storage.getSignedDownloadUrl).toHaveBeenCalledWith(
      expect.objectContaining({ objectKey: 'tenants/t/logo.png' }),
    );
  });

  it('throws NOT_FOUND for a missing workspace slug', async () => {
    prisma.tenant.findFirst.mockResolvedValue(null);

    try {
      await service.lookupWorkspaceBySlug('unknown-workspace');
      fail('Expected NotFoundException');
    } catch (error) {
      expect(error).toBeInstanceOf(NotFoundException);

      const { status, body } = mapExceptionToApiErrorResponse(error);
      expect(status).toBe(404);
      expect(body).toEqual({
        success: false,
        error: {
          code: API_ERROR_CODES.NOT_FOUND,
          message: 'Workspace not found',
        },
      });
    }
  });

  it('returns workspace details for a suspended tenant', async () => {
    prisma.tenant.findFirst.mockResolvedValue({
      name: 'Suspended Co',
      slug: 'suspended-co',
    });

    await expect(
      service.lookupWorkspaceBySlug('suspended-co'),
    ).resolves.toEqual({
      exists: true,
      name: 'Suspended Co',
      slug: 'suspended-co',
      logoUrl: null,
    });
  });

  it('throws NOT_FOUND for a soft-deleted tenant', async () => {
    prisma.tenant.findFirst.mockResolvedValue(null);

    await expect(
      service.lookupWorkspaceBySlug('deleted-workspace'),
    ).rejects.toThrow(NotFoundException);
  });

  it('does not filter by tenant status', async () => {
    prisma.tenant.findFirst.mockResolvedValue({
      name: 'Cancelled Co',
      slug: 'cancelled-co',
    });

    await service.lookupWorkspaceBySlug('cancelled-co');

    expect(prisma.tenant.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { slug: 'cancelled-co', deletedAt: null },
      }),
    );
  });
});

describe('PublicService.sendWorkspaceLinks', () => {
  it('emails one message listing every workspace for the address', async () => {
    const prisma = {
      user: {
        findMany: jest.fn().mockResolvedValue([
          {
            email: 'sara@x.com',
            tenant: { name: 'Nile Homes', slug: 'nile-homes-a1b2' },
          },
          {
            email: 'sara@x.com',
            tenant: { name: 'Prime Estates', slug: 'prime-estates' },
          },
        ]),
      },
    };
    const mail = {
      send: jest.fn(),
      workspaceUrl: jest.fn(
        (slug: string, path: string) => `https://${slug}.nomow.test${path}`,
      ),
    };
    const service = new PublicService(
      prisma as never,
      {} as never,
      mail as never,
    );

    await service.sendWorkspaceLinks('sara@x.com');

    expect(mail.send).toHaveBeenCalledTimes(1);
    const [message] = mail.send.mock.calls[0] as [{ to: string; text: string }];
    expect(message.to).toBe('sara@x.com');
    expect(message.text).toContain('https://nile-homes-a1b2.nomow.test/login');
    expect(message.text).toContain('https://prime-estates.nomow.test/login');
  });

  it('sends nothing when the address has no workspace', async () => {
    const prisma = { user: { findMany: jest.fn().mockResolvedValue([]) } };
    const mail = { send: jest.fn(), workspaceUrl: jest.fn() };
    const service = new PublicService(
      prisma as never,
      {} as never,
      mail as never,
    );

    await service.sendWorkspaceLinks('nobody@x.com');

    expect(mail.send).not.toHaveBeenCalled();
  });

  it('logs a failed background send instead of throwing', async () => {
    const prisma = {
      user: { findMany: jest.fn().mockRejectedValue(new Error('db down')) },
    };
    const service = new PublicService(
      prisma as never,
      {} as never,
      { send: jest.fn(), workspaceUrl: jest.fn() } as never,
    );
    const logError = jest
      .spyOn(Logger.prototype, 'error')
      .mockImplementation(() => undefined);

    expect(() => service.queueWorkspaceLinks('sara@x.com')).not.toThrow();
    await new Promise((resolve) => setImmediate(resolve));

    expect(logError).toHaveBeenCalledWith('Workspace links failed: db down');
    logError.mockRestore();
  });
});

describe('PublicController', () => {
  let controller: PublicController;
  let publicService: {
    lookupWorkspaceBySlug: jest.Mock;
    queueWorkspaceLinks: jest.Mock;
  };

  beforeEach(async () => {
    publicService = {
      lookupWorkspaceBySlug: jest.fn(),
      queueWorkspaceLinks: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [PublicController],
      providers: [{ provide: PublicService, useValue: publicService }],
    })
      .overrideGuard(RateLimitGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get(PublicController);
  });

  it('returns success envelope for an existing workspace', async () => {
    publicService.lookupWorkspaceBySlug.mockResolvedValue({
      exists: true,
      name: 'Prime Estates',
      slug: 'prime-estates',
      logoUrl: null,
    });

    await expect(controller.getWorkspace('prime-estates')).resolves.toEqual({
      success: true,
      data: {
        exists: true,
        name: 'Prime Estates',
        slug: 'prime-estates',
        logoUrl: null,
      },
    });
  });

  it('propagates NOT_FOUND when workspace does not exist', async () => {
    publicService.lookupWorkspaceBySlug.mockRejectedValue(
      new NotFoundException('Workspace not found'),
    );

    await expect(controller.getWorkspace('unknown-workspace')).rejects.toThrow(
      NotFoundException,
    );
  });

  it('rate-limits the lookup per IP and "find" in its own buckets', () => {
    const kindOf = (handler: object) =>
      Reflect.getMetadata(AUTH_RATE_LIMIT_METADATA_KEY, handler) as unknown;

    expect(kindOf(PublicController.prototype.getWorkspace)).toBe(
      'workspace-lookup',
    );
    expect(kindOf(PublicController.prototype.findWorkspaces)).toBe(
      'workspace-find',
    );
  });

  it('answers "find" without waiting for the lookup or the email', () => {
    expect(controller.findWorkspaces({ email: 'sara@x.com' })).toEqual({
      success: true,
      message: 'If this email has a workspace, we have sent the links to it',
    });
    expect(publicService.queueWorkspaceLinks).toHaveBeenCalledWith(
      'sara@x.com',
    );
  });
});
