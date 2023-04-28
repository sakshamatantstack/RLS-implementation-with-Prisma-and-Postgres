-- AlterTable
ALTER TABLE "User" ALTER COLUMN "companyId" SET DEFAULT (current_setting('app.current_company_id'::text))::uuid;
