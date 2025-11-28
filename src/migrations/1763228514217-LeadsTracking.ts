import { MigrationInterface, QueryRunner } from 'typeorm';

export class LeadsTracking1763228514217 implements MigrationInterface {
  name = 'LeadsTracking1763228514217';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add slug and publicId as nullable first
    await queryRunner.query(`ALTER TABLE "lead-forms" ADD "slug" character varying`);
    await queryRunner.query(
      `COMMENT ON COLUMN "lead-forms"."slug" IS 'Unique slug for public URL access'`,
    );
    await queryRunner.query(`ALTER TABLE "lead-forms" ADD "publicId" character varying`);
    await queryRunner.query(
      `COMMENT ON COLUMN "lead-forms"."publicId" IS 'Random public ID for sharing'`,
    );

    // Generate slug and publicId for existing rows
    // Slug: lowercase title, replace non-alphanumeric with hyphens, add short UUID
    await queryRunner.query(`
            UPDATE "lead-forms" 
            SET 
                "slug" = LOWER(REGEXP_REPLACE(REGEXP_REPLACE("title", '[^a-z0-9]+', '-', 'gi'), '^-|-$', '', 'g')) || '-' || SUBSTRING(MD5(RANDOM()::text || id::text), 1, 6),
                "publicId" = SUBSTRING(MD5(RANDOM()::text || id::text || NOW()::text), 1, 12)
            WHERE "slug" IS NULL OR "publicId" IS NULL
        `);

    // Ensure uniqueness by appending id if needed
    await queryRunner.query(`
            UPDATE "lead-forms" lf1
            SET "slug" = "slug" || '-' || id::text
            WHERE EXISTS (
                SELECT 1 FROM "lead-forms" lf2 
                WHERE lf2.id != lf1.id AND lf2."slug" = lf1."slug"
            )
        `);

    // Now make them NOT NULL and add unique constraints
    await queryRunner.query(`ALTER TABLE "lead-forms" ALTER COLUMN "slug" SET NOT NULL`);
    await queryRunner.query(
      `ALTER TABLE "lead-forms" ADD CONSTRAINT "UQ_5185f5a19d5159aca97cb080915" UNIQUE ("slug")`,
    );
    await queryRunner.query(`ALTER TABLE "lead-forms" ALTER COLUMN "publicId" SET NOT NULL`);
    await queryRunner.query(
      `ALTER TABLE "lead-forms" ADD CONSTRAINT "UQ_08be2ee9a486a9b9e0e5667844b" UNIQUE ("publicId")`,
    );
    await queryRunner.query(
      `ALTER TABLE "lead-forms" ADD "requireEmailVerification" boolean NOT NULL DEFAULT false`,
    );
    await queryRunner.query(
      `COMMENT ON COLUMN "lead-forms"."requireEmailVerification" IS 'Require email verification before accepting lead'`,
    );
    await queryRunner.query(
      `ALTER TABLE "lead-forms" ADD "enableCaptcha" boolean NOT NULL DEFAULT false`,
    );
    await queryRunner.query(
      `COMMENT ON COLUMN "lead-forms"."enableCaptcha" IS 'Enable CAPTCHA verification'`,
    );
    await queryRunner.query(
      `ALTER TABLE "lead-forms" ADD "sendEmailNotification" boolean NOT NULL DEFAULT true`,
    );
    await queryRunner.query(
      `COMMENT ON COLUMN "lead-forms"."sendEmailNotification" IS 'Send email notification on new lead'`,
    );
    await queryRunner.query(`ALTER TABLE "lead-forms" ADD "successMessage" character varying`);
    await queryRunner.query(
      `COMMENT ON COLUMN "lead-forms"."successMessage" IS 'Custom success message after submission'`,
    );
    await queryRunner.query(`ALTER TABLE "lead-forms" ADD "redirectUrl" character varying`);
    await queryRunner.query(
      `COMMENT ON COLUMN "lead-forms"."redirectUrl" IS 'Redirect URL after successful submission'`,
    );
    await queryRunner.query(
      `ALTER TABLE "lead-forms" ADD "submissionCount" integer NOT NULL DEFAULT '0'`,
    );
    await queryRunner.query(
      `COMMENT ON COLUMN "lead-forms"."submissionCount" IS 'Total number of submissions received'`,
    );
    await queryRunner.query(
      `ALTER TABLE "lead-forms" ADD "maxSubmissions" integer NOT NULL DEFAULT '0'`,
    );
    await queryRunner.query(
      `COMMENT ON COLUMN "lead-forms"."maxSubmissions" IS 'Maximum submissions allowed (0 = unlimited)'`,
    );
    await queryRunner.query(`ALTER TABLE "lead-forms" ADD "allowedDomains" jsonb`);
    await queryRunner.query(
      `COMMENT ON COLUMN "lead-forms"."allowedDomains" IS 'Allowed domains for CORS (for embedded forms)'`,
    );
    await queryRunner.query(`ALTER TABLE "lead-forms" ADD "customStyling" jsonb`);
    await queryRunner.query(
      `COMMENT ON COLUMN "lead-forms"."customStyling" IS 'Custom styling for embedded form'`,
    );

    // Add businessId and createdBy as nullable first (existing rows won't have these values)
    await queryRunner.query(`ALTER TABLE "lead-forms" ADD "businessId" integer`);
    await queryRunner.query(`ALTER TABLE "lead-forms" ADD "createdBy" integer`);

    // Delete leads associated with lead-forms that will be deleted (due to missing businessId/createdBy)
    // Then delete existing lead-forms that can't have businessId/createdBy populated
    // These are incomplete records that can't function without these required fields
    await queryRunner.query(`
            DELETE FROM "leads" 
            WHERE "formId" IN (
                SELECT id FROM "lead-forms" 
                WHERE "businessId" IS NULL OR "createdBy" IS NULL
            )
        `);
    await queryRunner.query(
      `DELETE FROM "lead-forms" WHERE "businessId" IS NULL OR "createdBy" IS NULL`,
    );

    // Now make them NOT NULL
    await queryRunner.query(`ALTER TABLE "lead-forms" ALTER COLUMN "businessId" SET NOT NULL`);
    await queryRunner.query(`ALTER TABLE "lead-forms" ALTER COLUMN "createdBy" SET NOT NULL`);

    // For leads, get businessId from the associated form
    await queryRunner.query(`ALTER TABLE "leads" ADD "businessId" integer`);
    await queryRunner.query(`
            UPDATE "leads" l
            SET "businessId" = (
                SELECT lf."businessId" 
                FROM "lead-forms" lf 
                WHERE lf.id = l."formId"
            )
        `);

    // Delete leads that don't have a valid businessId (orphaned leads)
    await queryRunner.query(`DELETE FROM "leads" WHERE "businessId" IS NULL`);

    // Now make businessId NOT NULL for leads
    await queryRunner.query(`ALTER TABLE "leads" ALTER COLUMN "businessId" SET NOT NULL`);
    await queryRunner.query(`ALTER TABLE "leads" ADD "formResponses" jsonb`);
    await queryRunner.query(`ALTER TABLE "leads" ADD "ipAddress" character varying`);
    await queryRunner.query(
      `COMMENT ON COLUMN "leads"."ipAddress" IS 'IP address of the submitter'`,
    );
    await queryRunner.query(`ALTER TABLE "leads" ADD "userAgent" text`);
    await queryRunner.query(
      `COMMENT ON COLUMN "leads"."userAgent" IS 'User agent string (browser/device info)'`,
    );
    await queryRunner.query(`ALTER TABLE "leads" ADD "referrer" character varying`);
    await queryRunner.query(
      `COMMENT ON COLUMN "leads"."referrer" IS 'Referrer URL - where the user came from'`,
    );
    await queryRunner.query(`ALTER TABLE "leads" ADD "utmParameters" jsonb`);
    await queryRunner.query(
      `COMMENT ON COLUMN "leads"."utmParameters" IS 'UTM parameters for marketing attribution'`,
    );
    await queryRunner.query(`ALTER TABLE "leads" ADD "country" character varying`);
    await queryRunner.query(`COMMENT ON COLUMN "leads"."country" IS 'Country derived from IP'`);
    await queryRunner.query(`ALTER TABLE "leads" ADD "city" character varying`);
    await queryRunner.query(`COMMENT ON COLUMN "leads"."city" IS 'City derived from IP'`);
    await queryRunner.query(`ALTER TABLE "leads" ADD "latitude" double precision`);
    await queryRunner.query(`COMMENT ON COLUMN "leads"."latitude" IS 'Latitude from geolocation'`);
    await queryRunner.query(`ALTER TABLE "leads" ADD "longitude" double precision`);
    await queryRunner.query(
      `COMMENT ON COLUMN "leads"."longitude" IS 'Longitude from geolocation'`,
    );
    await queryRunner.query(`ALTER TABLE "leads" ADD "deviceType" character varying`);
    await queryRunner.query(
      `COMMENT ON COLUMN "leads"."deviceType" IS 'Device type: mobile, tablet, desktop'`,
    );
    await queryRunner.query(`ALTER TABLE "leads" ADD "browser" character varying`);
    await queryRunner.query(`COMMENT ON COLUMN "leads"."browser" IS 'Browser name'`);
    await queryRunner.query(`ALTER TABLE "leads" ADD "operatingSystem" character varying`);
    await queryRunner.query(`COMMENT ON COLUMN "leads"."operatingSystem" IS 'Operating system'`);
    await queryRunner.query(`ALTER TABLE "leads" ADD "isContacted" boolean NOT NULL DEFAULT false`);
    await queryRunner.query(
      `COMMENT ON COLUMN "leads"."isContacted" IS 'Whether the lead has been contacted'`,
    );
    await queryRunner.query(`ALTER TABLE "leads" ADD "status" character varying`);
    await queryRunner.query(
      `COMMENT ON COLUMN "leads"."status" IS 'Status: new, contacted, qualified, converted, lost'`,
    );
    await queryRunner.query(`ALTER TABLE "leads" ADD "notes" text`);
    await queryRunner.query(`COMMENT ON COLUMN "leads"."notes" IS 'Notes added by business owner'`);
    await queryRunner.query(`ALTER TABLE "leads" ADD "metadata" jsonb`);
    await queryRunner.query(`COMMENT ON COLUMN "leads"."metadata" IS 'Custom metadata'`);
    await queryRunner.query(
      `ALTER TABLE "lead-forms" ADD CONSTRAINT "FK_67809c78e9c1f5974410eca85c2" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "lead-forms" ADD CONSTRAINT "FK_348e4860ecf98016ea9636ce6c0" FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "leads" ADD CONSTRAINT "FK_daf8eb3d52d018ea43df6d5edab" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "leads" DROP CONSTRAINT "FK_daf8eb3d52d018ea43df6d5edab"`);
    await queryRunner.query(
      `ALTER TABLE "lead-forms" DROP CONSTRAINT "FK_348e4860ecf98016ea9636ce6c0"`,
    );
    await queryRunner.query(
      `ALTER TABLE "lead-forms" DROP CONSTRAINT "FK_67809c78e9c1f5974410eca85c2"`,
    );
    await queryRunner.query(`COMMENT ON COLUMN "leads"."metadata" IS 'Custom metadata'`);
    await queryRunner.query(`ALTER TABLE "leads" DROP COLUMN "metadata"`);
    await queryRunner.query(`COMMENT ON COLUMN "leads"."notes" IS 'Notes added by business owner'`);
    await queryRunner.query(`ALTER TABLE "leads" DROP COLUMN "notes"`);
    await queryRunner.query(
      `COMMENT ON COLUMN "leads"."status" IS 'Status: new, contacted, qualified, converted, lost'`,
    );
    await queryRunner.query(`ALTER TABLE "leads" DROP COLUMN "status"`);
    await queryRunner.query(
      `COMMENT ON COLUMN "leads"."isContacted" IS 'Whether the lead has been contacted'`,
    );
    await queryRunner.query(`ALTER TABLE "leads" DROP COLUMN "isContacted"`);
    await queryRunner.query(`COMMENT ON COLUMN "leads"."operatingSystem" IS 'Operating system'`);
    await queryRunner.query(`ALTER TABLE "leads" DROP COLUMN "operatingSystem"`);
    await queryRunner.query(`COMMENT ON COLUMN "leads"."browser" IS 'Browser name'`);
    await queryRunner.query(`ALTER TABLE "leads" DROP COLUMN "browser"`);
    await queryRunner.query(
      `COMMENT ON COLUMN "leads"."deviceType" IS 'Device type: mobile, tablet, desktop'`,
    );
    await queryRunner.query(`ALTER TABLE "leads" DROP COLUMN "deviceType"`);
    await queryRunner.query(
      `COMMENT ON COLUMN "leads"."longitude" IS 'Longitude from geolocation'`,
    );
    await queryRunner.query(`ALTER TABLE "leads" DROP COLUMN "longitude"`);
    await queryRunner.query(`COMMENT ON COLUMN "leads"."latitude" IS 'Latitude from geolocation'`);
    await queryRunner.query(`ALTER TABLE "leads" DROP COLUMN "latitude"`);
    await queryRunner.query(`COMMENT ON COLUMN "leads"."city" IS 'City derived from IP'`);
    await queryRunner.query(`ALTER TABLE "leads" DROP COLUMN "city"`);
    await queryRunner.query(`COMMENT ON COLUMN "leads"."country" IS 'Country derived from IP'`);
    await queryRunner.query(`ALTER TABLE "leads" DROP COLUMN "country"`);
    await queryRunner.query(
      `COMMENT ON COLUMN "leads"."utmParameters" IS 'UTM parameters for marketing attribution'`,
    );
    await queryRunner.query(`ALTER TABLE "leads" DROP COLUMN "utmParameters"`);
    await queryRunner.query(
      `COMMENT ON COLUMN "leads"."referrer" IS 'Referrer URL - where the user came from'`,
    );
    await queryRunner.query(`ALTER TABLE "leads" DROP COLUMN "referrer"`);
    await queryRunner.query(
      `COMMENT ON COLUMN "leads"."userAgent" IS 'User agent string (browser/device info)'`,
    );
    await queryRunner.query(`ALTER TABLE "leads" DROP COLUMN "userAgent"`);
    await queryRunner.query(
      `COMMENT ON COLUMN "leads"."ipAddress" IS 'IP address of the submitter'`,
    );
    await queryRunner.query(`ALTER TABLE "leads" DROP COLUMN "ipAddress"`);
    await queryRunner.query(`ALTER TABLE "leads" DROP COLUMN "formResponses"`);
    await queryRunner.query(`ALTER TABLE "leads" DROP COLUMN "businessId"`);
    await queryRunner.query(`ALTER TABLE "lead-forms" DROP COLUMN "createdBy"`);
    await queryRunner.query(`ALTER TABLE "lead-forms" DROP COLUMN "businessId"`);
    await queryRunner.query(
      `COMMENT ON COLUMN "lead-forms"."customStyling" IS 'Custom styling for embedded form'`,
    );
    await queryRunner.query(`ALTER TABLE "lead-forms" DROP COLUMN "customStyling"`);
    await queryRunner.query(
      `COMMENT ON COLUMN "lead-forms"."allowedDomains" IS 'Allowed domains for CORS (for embedded forms)'`,
    );
    await queryRunner.query(`ALTER TABLE "lead-forms" DROP COLUMN "allowedDomains"`);
    await queryRunner.query(
      `COMMENT ON COLUMN "lead-forms"."maxSubmissions" IS 'Maximum submissions allowed (0 = unlimited)'`,
    );
    await queryRunner.query(`ALTER TABLE "lead-forms" DROP COLUMN "maxSubmissions"`);
    await queryRunner.query(
      `COMMENT ON COLUMN "lead-forms"."submissionCount" IS 'Total number of submissions received'`,
    );
    await queryRunner.query(`ALTER TABLE "lead-forms" DROP COLUMN "submissionCount"`);
    await queryRunner.query(
      `COMMENT ON COLUMN "lead-forms"."redirectUrl" IS 'Redirect URL after successful submission'`,
    );
    await queryRunner.query(`ALTER TABLE "lead-forms" DROP COLUMN "redirectUrl"`);
    await queryRunner.query(
      `COMMENT ON COLUMN "lead-forms"."successMessage" IS 'Custom success message after submission'`,
    );
    await queryRunner.query(`ALTER TABLE "lead-forms" DROP COLUMN "successMessage"`);
    await queryRunner.query(
      `COMMENT ON COLUMN "lead-forms"."sendEmailNotification" IS 'Send email notification on new lead'`,
    );
    await queryRunner.query(`ALTER TABLE "lead-forms" DROP COLUMN "sendEmailNotification"`);
    await queryRunner.query(
      `COMMENT ON COLUMN "lead-forms"."enableCaptcha" IS 'Enable CAPTCHA verification'`,
    );
    await queryRunner.query(`ALTER TABLE "lead-forms" DROP COLUMN "enableCaptcha"`);
    await queryRunner.query(
      `COMMENT ON COLUMN "lead-forms"."requireEmailVerification" IS 'Require email verification before accepting lead'`,
    );
    await queryRunner.query(`ALTER TABLE "lead-forms" DROP COLUMN "requireEmailVerification"`);
    await queryRunner.query(
      `COMMENT ON COLUMN "lead-forms"."publicId" IS 'Random public ID for sharing'`,
    );
    await queryRunner.query(
      `ALTER TABLE "lead-forms" DROP CONSTRAINT "UQ_08be2ee9a486a9b9e0e5667844b"`,
    );
    await queryRunner.query(`ALTER TABLE "lead-forms" DROP COLUMN "publicId"`);
    await queryRunner.query(
      `COMMENT ON COLUMN "lead-forms"."slug" IS 'Unique slug for public URL access'`,
    );
    await queryRunner.query(
      `ALTER TABLE "lead-forms" DROP CONSTRAINT "UQ_5185f5a19d5159aca97cb080915"`,
    );
    await queryRunner.query(`ALTER TABLE "lead-forms" DROP COLUMN "slug"`);
  }
}
