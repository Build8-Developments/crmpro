-- CreateTable
CREATE TABLE "TenantNote" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "authorAdminId" UUID NOT NULL,
    "content" VARCHAR(5000) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "TenantNote_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TenantNote_tenantId_deletedAt_idx" ON "TenantNote"("tenantId", "deletedAt");

-- CreateIndex
CREATE INDEX "TenantNote_authorAdminId_idx" ON "TenantNote"("authorAdminId");

-- AddForeignKey
ALTER TABLE "TenantNote" ADD CONSTRAINT "TenantNote_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TenantNote" ADD CONSTRAINT "TenantNote_authorAdminId_fkey" FOREIGN KEY ("authorAdminId") REFERENCES "PlatformAdmin"("id") ON DELETE CASCADE ON UPDATE CASCADE;
