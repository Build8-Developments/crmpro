-- CreateEnum
CREATE TYPE "PaymentPreference" AS ENUM ('CASH', 'INSTALLMENTS', 'MORTGAGE', 'FLEXIBLE');

-- CreateEnum
CREATE TYPE "ContactChannelPreference" AS ENUM ('CALL', 'WHATSAPP', 'EMAIL', 'SMS');

-- CreateEnum
CREATE TYPE "ContactTimePreference" AS ENUM ('MORNING', 'AFTERNOON', 'EVENING', 'ANYTIME');

-- CreateEnum
CREATE TYPE "PurchasePurpose" AS ENUM ('LIVING', 'INVESTMENT', 'VACATION_HOME');

-- AlterEnum
ALTER TYPE "LeadActivityEventType" ADD VALUE 'CONTACT_ACCESSED';

-- AlterTable
ALTER TABLE "PipelineStage" ADD COLUMN     "icon" TEXT;

-- AlterTable
ALTER TABLE "Lead" ADD COLUMN     "contactChannelPreference" "ContactChannelPreference",
ADD COLUMN     "contactTimePreference" "ContactTimePreference",
ADD COLUMN     "occupation" TEXT,
ADD COLUMN     "paymentPreference" "PaymentPreference",
ADD COLUMN     "purchasePurpose" "PurchasePurpose",
ADD COLUMN     "residenceArea" TEXT;


-- Default icons for the standard stages (stage names from the tenant
-- bootstrap template and the demo commercial pipeline). Custom stages keep
-- NULL and get a generic icon in the UI until someone picks one.
UPDATE "PipelineStage" SET "icon" = CASE
  WHEN "closeType" = 'WON' THEN 'trophy'
  WHEN "closeType" = 'LOST' THEN 'circle-x'
  WHEN lower("name") IN ('new lead', 'new', 'inquiry') THEN 'sparkles'
  WHEN lower("name") = 'contacted' THEN 'phone'
  WHEN lower("name") = 'qualified' THEN 'circle-check'
  WHEN lower("name") IN ('proposal', 'interested') THEN 'file-text'
  WHEN lower("name") = 'negotiation' THEN 'handshake'
  WHEN lower("name") = 'site visit' THEN 'map-pin'
  ELSE NULL
END
WHERE "icon" IS NULL;
