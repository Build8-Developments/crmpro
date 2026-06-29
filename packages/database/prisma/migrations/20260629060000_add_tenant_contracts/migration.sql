-- CreateEnum
CREATE TYPE "ContractStatus" AS ENUM ('DRAFT', 'ACTIVE', 'EXPIRED', 'TERMINATED');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('BANK_TRANSFER', 'CASH', 'CHEQUE', 'INSTAPAY', 'OTHER');

-- CreateEnum
CREATE TYPE "PaymentFrequency" AS ENUM ('MONTHLY', 'QUARTERLY', 'SEMI_ANNUAL', 'ANNUAL', 'CUSTOM');

-- CreateTable
CREATE TABLE "TenantContract" (
    "id" UUID NOT NULL,
    "tenantId" UUID,
    "planId" UUID NOT NULL,
    "contractName" TEXT,
    "agreedPrice" DECIMAL(12,2) NOT NULL,
    "currency" TEXT NOT NULL,
    "paymentMethod" "PaymentMethod" NOT NULL,
    "paymentFrequency" "PaymentFrequency" NOT NULL,
    "contractStartAt" TIMESTAMP(3) NOT NULL,
    "contractEndAt" TIMESTAMP(3),
    "discountPercent" INTEGER,
    "gracePeriodDays" INTEGER,
    "autoRenew" BOOLEAN NOT NULL DEFAULT false,
    "notes" VARCHAR(5000),
    "status" "ContractStatus" NOT NULL DEFAULT 'DRAFT',
    "createdByAdminId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "TenantContract_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TenantContract_status_idx" ON "TenantContract"("status");

-- CreateIndex
CREATE INDEX "TenantContract_planId_idx" ON "TenantContract"("planId");

-- CreateIndex
CREATE INDEX "TenantContract_tenantId_idx" ON "TenantContract"("tenantId");

-- CreateIndex
CREATE INDEX "TenantContract_deletedAt_idx" ON "TenantContract"("deletedAt");

-- AddForeignKey
ALTER TABLE "TenantContract" ADD CONSTRAINT "TenantContract_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TenantContract" ADD CONSTRAINT "TenantContract_planId_fkey" FOREIGN KEY ("planId") REFERENCES "SubscriptionPlan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TenantContract" ADD CONSTRAINT "TenantContract_createdByAdminId_fkey" FOREIGN KEY ("createdByAdminId") REFERENCES "PlatformAdmin"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
