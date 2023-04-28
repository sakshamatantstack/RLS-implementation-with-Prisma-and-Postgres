-- AlterTable
ALTER TABLE "User" ALTER COLUMN "companyId" SET DEFAULT (current_setting('current_company_id'::text))::uuid;
