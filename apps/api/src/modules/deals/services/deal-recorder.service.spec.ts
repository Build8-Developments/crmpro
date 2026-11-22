import {
  DealRecorderService,
  type PreparedDeal,
} from './deal-recorder.service';

describe('DealRecorderService.create', () => {
  const reservedAt = new Date('2026-11-18T10:00:00Z');
  const expectedContractAt = new Date('2026-12-01T10:00:00Z');
  const prepared: PreparedDeal = {
    tenantId: 't',
    leadId: 'lead-1',
    actorUserId: 'manager-1',
    data: {
      projectId: null,
      agentId: 'agent-1',
      unitType: 'Apartment',
      unitCode: null,
      price: 4_000_000,
      currency: 'EGP',
      downPaymentPct: null,
      paymentPlan: null,
      commissionPct: null,
      commissionAmount: null,
      reservedAt,
      expectedContractAt,
      notes: null,
    },
    projectName: null,
    agentName: 'Agent',
  };

  it('gives the deal agent the R10 paperwork task after writing the deal', async () => {
    const order: string[] = [];
    const tx = {
      deal: {
        create: jest.fn(() => {
          order.push('deal');
          return Promise.resolve({ id: 'deal-1' });
        }),
      },
    };
    const dealRules = {
      onDealReserved: jest.fn(() => {
        order.push('paperwork');
        return Promise.resolve();
      }),
    };
    const service = new DealRecorderService(
      {} as never,
      {} as never,
      { createActivity: jest.fn() } as never,
      { createAuditLog: jest.fn() } as never,
      dealRules as never,
    );

    await service.create(tx as never, prepared);

    expect(tx.deal.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ expectedContractAt }),
      }),
    );
    expect(dealRules.onDealReserved).toHaveBeenCalledWith(tx, {
      tenantId: 't',
      leadId: 'lead-1',
      assigneeId: 'agent-1',
      reservedAt,
      expectedContractAt,
    });
    expect(order).toEqual(['deal', 'paperwork']);
  });
});
