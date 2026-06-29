-- AlterTable
ALTER TABLE "SubscriptionPlan" ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "SubscriptionPlan" ADD COLUMN "defaultPrice" DECIMAL(12,2);
ALTER TABLE "SubscriptionPlan" ADD COLUMN "currency" TEXT;

-- Make limit columns nullable (null = unlimited / negotiated per contract)
ALTER TABLE "SubscriptionPlan" ALTER COLUMN "maxUsers" DROP NOT NULL;
ALTER TABLE "SubscriptionPlan" ALTER COLUMN "maxLeads" DROP NOT NULL;
ALTER TABLE "SubscriptionPlan" ALTER COLUMN "maxProjects" DROP NOT NULL;
ALTER TABLE "SubscriptionPlan" ALTER COLUMN "maxStorageBytes" DROP NOT NULL;
