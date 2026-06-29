-- Duplicate detection hot path: match secondaryPhoneNormalized within tenant
CREATE INDEX "Lead_tenantId_secondaryPhoneNormalized_idx" ON "Lead"("tenantId", "secondaryPhoneNormalized");
