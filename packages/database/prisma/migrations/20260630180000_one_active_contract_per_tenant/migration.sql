-- At most one ACTIVE contract per tenant (partial unique index).
-- Pre-provision contracts keep tenantId NULL and are not constrained by this index.
CREATE UNIQUE INDEX "TenantContract_one_active_per_tenant_key"
ON "TenantContract"("tenantId")
WHERE "status" = 'ACTIVE'
  AND "tenantId" IS NOT NULL
  AND "deletedAt" IS NULL;
