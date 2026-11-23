import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { CustomFieldType } from '@crmpro/database';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import {
  CUSTOM_FIELD_AUDIT_ACTIONS,
  MAX_ACTIVE_CUSTOM_FIELDS,
} from './custom-fields.constants';
import { CustomFieldsService } from './custom-fields.service';
import {
  CreateCustomFieldDto,
  UpdateCustomFieldDto,
} from './dto/custom-field.dto';

const TENANT = 'tenant-1';
const ACTOR = 'user-1';

function record(overrides: Record<string, unknown> = {}) {
  return {
    id: 'field-1',
    key: 'unit_type',
    label: 'Unit type',
    description: null,
    type: CustomFieldType.SELECT,
    options: ['Apartment', 'Villa'],
    isRequired: false,
    sortOrder: 0,
    archivedAt: null,
    createdAt: new Date('2026-11-01'),
    updatedAt: new Date('2026-11-01'),
    ...overrides,
  };
}

describe('CustomFieldsService', () => {
  let tx: { customFieldDefinition: { create: jest.Mock; update: jest.Mock } };
  let prisma: {
    customFieldDefinition: {
      findMany: jest.Mock;
      findFirst: jest.Mock;
      count: jest.Mock;
    };
    $transaction: jest.Mock;
  };
  let audit: { createAuditLog: jest.Mock };
  let service: CustomFieldsService;

  beforeEach(() => {
    tx = {
      customFieldDefinition: {
        create: jest.fn(({ data }) => Promise.resolve(record(data))),
        update: jest.fn(({ data }) => Promise.resolve(record(data))),
      },
    };
    prisma = {
      customFieldDefinition: {
        findMany: jest.fn().mockResolvedValue([]),
        findFirst: jest.fn().mockResolvedValue(record()),
        count: jest.fn().mockResolvedValue(0),
      },
      $transaction: jest.fn((callback: (client: typeof tx) => unknown) =>
        callback(tx),
      ),
    };
    audit = { createAuditLog: jest.fn() };
    service = new CustomFieldsService(prisma as never, audit as never);
  });

  describe('create', () => {
    it('derives a unique key from the label and appends to the order', async () => {
      prisma.customFieldDefinition.findMany.mockResolvedValue([
        { key: 'unit_type', sortOrder: 4 },
      ]);

      const field = await service.create(TENANT, ACTOR, {
        label: 'Unit type',
        type: CustomFieldType.TEXT,
        options: ['ignored'],
      });

      expect(tx.customFieldDefinition.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            tenantId: TENANT,
            key: 'unit_type_2',
            sortOrder: 5,
          }),
        }),
      );
      expect(field.options).toBeNull();
      expect(audit.createAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          tenantId: TENANT,
          actorUserId: ACTOR,
          action: CUSTOM_FIELD_AUDIT_ACTIONS.CREATED,
        }),
      );
    });

    it('refuses an explicit key that is already used', async () => {
      prisma.customFieldDefinition.findMany.mockResolvedValue([
        { key: 'unit_type', sortOrder: 0 },
      ]);

      await expect(
        service.create(TENANT, ACTOR, {
          label: 'Anything',
          key: 'unit_type',
          type: CustomFieldType.TEXT,
        }),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('needs at least one option for select fields', async () => {
      await expect(
        service.create(TENANT, ACTOR, {
          label: 'Unit type',
          type: CustomFieldType.MULTI_SELECT,
          options: [],
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it(`caps active fields at ${MAX_ACTIVE_CUSTOM_FIELDS}`, async () => {
      prisma.customFieldDefinition.count.mockResolvedValue(
        MAX_ACTIVE_CUSTOM_FIELDS,
      );

      await expect(
        service.create(TENANT, ACTOR, {
          label: 'One more',
          type: CustomFieldType.TEXT,
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(tx.customFieldDefinition.create).not.toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('edits options of a select field and audits the change', async () => {
      await service.update(TENANT, ACTOR, 'field-1', {
        options: ['Apartment'],
        isRequired: true,
      });

      expect(tx.customFieldDefinition.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'field-1' },
          data: expect.objectContaining({
            options: ['Apartment'],
            isRequired: true,
          }),
        }),
      );
      expect(audit.createAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          action: CUSTOM_FIELD_AUDIT_ACTIONS.UPDATED,
          metadata: {
            key: 'unit_type',
            changes: {
              options: { from: ['Apartment', 'Villa'], to: ['Apartment'] },
              isRequired: { from: false, to: true },
            },
          },
        }),
      );
    });

    it('does not write or audit when nothing changed', async () => {
      await service.update(TENANT, ACTOR, 'field-1', { label: 'Unit type' });

      expect(tx.customFieldDefinition.update).not.toHaveBeenCalled();
      expect(audit.createAuditLog).not.toHaveBeenCalled();
    });

    it('refuses options on a non-select field', async () => {
      prisma.customFieldDefinition.findFirst.mockResolvedValue(
        record({ type: CustomFieldType.NUMBER, options: null }),
      );

      await expect(
        service.update(TENANT, ACTOR, 'field-1', { options: ['a'] }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('only finds fields of the caller tenant', async () => {
      prisma.customFieldDefinition.findFirst.mockResolvedValue(null);

      await expect(
        service.update(TENANT, ACTOR, 'field-1', { label: 'x' }),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(prisma.customFieldDefinition.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ id: 'field-1', tenantId: TENANT }),
        }),
      );
    });
  });

  describe('archive / restore', () => {
    it('archives without touching lead values', async () => {
      const field = await service.archive(TENANT, ACTOR, 'field-1');

      expect(field.archivedAt).toBeInstanceOf(Date);
      expect(audit.createAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          action: CUSTOM_FIELD_AUDIT_ACTIONS.ARCHIVED,
        }),
      );
    });

    it('checks the active cap before restoring', async () => {
      prisma.customFieldDefinition.findFirst.mockResolvedValue(
        record({ archivedAt: new Date('2026-11-02') }),
      );
      prisma.customFieldDefinition.count.mockResolvedValue(
        MAX_ACTIVE_CUSTOM_FIELDS,
      );

      await expect(
        service.restore(TENANT, ACTOR, 'field-1'),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('reorder', () => {
    it('writes sortOrder by position', async () => {
      prisma.customFieldDefinition.findMany
        .mockResolvedValueOnce([
          { id: 'b', key: 'b_key' },
          { id: 'a', key: 'a_key' },
        ])
        .mockResolvedValueOnce([]);

      await service.reorder(TENANT, ACTOR, { ids: ['b', 'a'] });

      expect(tx.customFieldDefinition.update).toHaveBeenNthCalledWith(1, {
        where: { id: 'b' },
        data: { sortOrder: 0 },
      });
      expect(tx.customFieldDefinition.update).toHaveBeenNthCalledWith(2, {
        where: { id: 'a' },
        data: { sortOrder: 1 },
      });
      expect(audit.createAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          action: CUSTOM_FIELD_AUDIT_ACTIONS.REORDERED,
          metadata: { order: ['b_key', 'a_key'] },
        }),
      );
    });

    it('refuses ids from another tenant', async () => {
      prisma.customFieldDefinition.findMany.mockResolvedValue([
        { id: 'a', key: 'a_key' },
      ]);

      await expect(
        service.reorder(TENANT, ACTOR, { ids: ['a', 'foreign'] }),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(tx.customFieldDefinition.update).not.toHaveBeenCalled();
    });
  });

  describe('resolveLeadValues', () => {
    it('turns validation errors into a 400 with per-field details', () => {
      try {
        service.resolveLeadValues({
          definitions: [
            {
              key: 'bedrooms',
              label: 'Bedrooms',
              type: CustomFieldType.NUMBER,
              options: null,
              isRequired: false,
              archivedAt: null,
            },
          ],
          existing: null,
          submitted: { bedrooms: 'many' },
          required: 'all',
        });
        throw new Error('expected a 400');
      } catch (error) {
        expect(error).toBeInstanceOf(BadRequestException);
        expect((error as BadRequestException).getResponse()).toEqual({
          code: 'VALIDATION_ERROR',
          message: 'Bedrooms must be a number',
          details: { customFields: { bedrooms: 'Bedrooms must be a number' } },
        });
      }
    });
  });
});

describe('custom field DTOs', () => {
  it('refuses to change key or type after create', async () => {
    const dto = plainToInstance(UpdateCustomFieldDto, {
      type: 'NUMBER',
      key: 'other_key',
    });
    const errors = await validate(dto);

    expect(errors.map((error) => error.property).sort()).toEqual([
      'key',
      'type',
    ]);
  });

  it('trims, dedupes and drops blank options', async () => {
    const dto = plainToInstance(CreateCustomFieldDto, {
      label: '  Unit   type ',
      type: 'SELECT',
      options: [' Villa', 'Villa', '', 'Apartment '],
    });

    expect(await validate(dto)).toEqual([]);
    expect(dto.label).toBe('Unit type');
    expect(dto.options).toEqual(['Villa', 'Apartment']);
  });

  it('only accepts keys the database accepts', async () => {
    const dto = plainToInstance(CreateCustomFieldDto, {
      label: 'x',
      type: 'TEXT',
      key: 'Unit-Type',
    });

    expect((await validate(dto)).map((error) => error.property)).toEqual([
      'key',
    ]);
  });
});
