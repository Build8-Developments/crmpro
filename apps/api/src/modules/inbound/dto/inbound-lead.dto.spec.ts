import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { InboundLeadDto } from './inbound-lead.dto';

function parse(payload: Record<string, unknown>) {
  const dto = plainToInstance(InboundLeadDto, payload);
  const errors = validateSync(dto, { whitelist: true });
  return { dto, errors: errors.map((error) => error.property) };
}

describe('InboundLeadDto', () => {
  it('accepts what no-code tools send: blanks, numbers and loose enums', () => {
    const { dto, errors } = parse({
      fullName: '  Hany   Adel ',
      phone: 201012345678,
      email: '',
      secondaryPhone: '',
      budgetMin: '1,500,000',
      budgetMax: '',
      paymentPreference: 'cash',
      purchasePurpose: 'Vacation home',
      contactTimePreference: 'whenever',
      projectIds:
        '6f1c1f4e-8a4b-4b8e-9a52-0c9d3c1b2a10, 7a2d2e5f-9b5c-4c9f-8b63-1d0e4d2c3b21',
    });

    expect(errors).toEqual([]);
    expect(dto.fullName).toBe('Hany Adel');
    expect(dto.phone).toBe('201012345678');
    expect(dto.email).toBeUndefined();
    expect(dto.secondaryPhone).toBeUndefined();
    expect(dto.budgetMin).toBe(1_500_000);
    expect(dto.budgetMax).toBeUndefined();
    expect(dto.paymentPreference).toBe('CASH');
    expect(dto.purchasePurpose).toBe('VACATION_HOME');
    expect(dto.contactTimePreference).toBeUndefined();
    expect(dto.projectIds).toHaveLength(2);
  });

  it('rejects missing essentials and oversized or malformed values', () => {
    expect(parse({ phone: '01012345678' }).errors).toContain('fullName');
    expect(parse({ fullName: 'Hany Adel' }).errors).toContain('phone');
    expect(
      parse({ fullName: 'Hany', phone: '0101234567', email: 'not-an-email' })
        .errors,
    ).toContain('email');
    expect(
      parse({
        fullName: 'Hany',
        phone: '0101234567',
        message: 'x'.repeat(2001),
      }).errors,
    ).toContain('message');
    expect(
      parse({
        fullName: 'Hany',
        phone: '0101234567',
        externalId: 'x'.repeat(201),
      }).errors,
    ).toContain('externalId');
    expect(
      parse({ fullName: 'Hany', phone: '0101234567', projectIds: ['nope'] })
        .errors,
    ).toContain('projectIds');
    expect(
      parse({ fullName: 'Hany', phone: '0101234567', budgetMin: 'lots' })
        .errors,
    ).toContain('budgetMin');
  });
});
