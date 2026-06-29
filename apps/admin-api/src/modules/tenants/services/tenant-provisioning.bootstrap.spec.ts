import {
  AGENT_PERMISSION_KEYS,
  DEFAULT_LEAD_SOURCES,
  DEFAULT_PIPELINE,
  DEFAULT_PIPELINE_STAGES,
  DEFAULT_TENANT_ROLES,
} from '@crmpro/shared/bootstrap';

describe('TenantProvisioning bootstrap alignment', () => {
  it('uses shared bootstrap templates as single source of truth', () => {
    expect(DEFAULT_TENANT_ROLES).toHaveLength(3);
    expect(DEFAULT_LEAD_SOURCES).toContain('Manual');
    expect(DEFAULT_PIPELINE.name).toBe('Default Sales Pipeline');
    expect(DEFAULT_PIPELINE_STAGES.map((stage) => stage.name)).toEqual([
      'New Lead',
      'Contacted',
      'Qualified',
      'Proposal',
      'Negotiation',
      'Won',
      'Lost',
    ]);
    expect(AGENT_PERMISSION_KEYS).toContain('lead.read');
    expect(AGENT_PERMISSION_KEYS).not.toContain('file.delete');
  });
});
