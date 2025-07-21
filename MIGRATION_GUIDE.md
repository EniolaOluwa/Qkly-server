# Database Migration Guide

This guide explains how to use TypeORM migrations in the NQkly server application.

## 🔧 Setup

TypeORM migrations have been configured with the following files:
- `ormconfig.ts` - TypeORM configuration for migrations
- `src/migrations/` - Directory containing migration files
- Migration scripts added to `package.json`

## 📋 Available Migration Commands

### Run Migrations
```bash
npm run migration:run
```
This applies all pending migrations to the database.

### Revert Last Migration
```bash
npm run migration:revert
```
This reverts the last applied migration.

### Show Migration Status
```bash
npm run migration:show
```
This shows which migrations have been applied and which are pending.

### Generate New Migration
```bash
npm run migration:generate -- src/migrations/YourMigrationName
```
This generates a new migration based on entity changes.

### Create Empty Migration
```bash
npm run migration:create -- src/migrations/YourMigrationName
```
This creates an empty migration file for manual SQL.

## 🎯 Current Migrations

### AddPurposeToOtp (1700000000000)
**Purpose**: Adds the `purpose` field to the `otps` table for distinguishing OTP types.

**Changes**:
- Adds `purpose` enum column with values: `phone_verification`, `password_reset`, `email_verification`
- Sets default value to `phone_verification`
- Column is NOT NULL

**SQL Applied**:
```sql
-- Creates enum type
CREATE TYPE "otp_purpose_enum" AS ENUM('phone_verification', 'password_reset', 'email_verification');

-- Adds column with default value
ALTER TABLE "otps" ADD COLUMN "purpose" "otp_purpose_enum" NOT NULL DEFAULT 'phone_verification';
```

## 🚀 Running the Purpose Migration

To apply the new `purpose` field to your database:

1. **Ensure your database is running** and accessible with the credentials in `.env`

2. **Run the migration**:
   ```bash
   npm run migration:run
   ```

3. **Verify the migration**:
   ```bash
   npm run migration:show
   ```

4. **Start your application**:
   ```bash
   npm run start:dev
   ```

## ⚠️ Important Notes

### Synchronize Mode Disabled
- `synchronize: false` is now set in TypeORM configuration
- This prevents automatic schema changes and ensures controlled migrations
- All schema changes must now be done through migrations

### Development vs Production
- In development: Run migrations manually for better control
- In production: Set `migrationsRun: true` to auto-run on app start (optional)

### Database State
- Existing `otps` records will get `purpose = 'phone_verification'` by default
- No data loss will occur during migration

## 🔄 Migration Workflow

1. **Make entity changes** in TypeScript files
2. **Generate migration**: `npm run migration:generate -- src/migrations/DescriptiveName`
3. **Review generated SQL** in the migration file
4. **Test migration** on development database: `npm run migration:run`
5. **Commit migration file** to version control
6. **Deploy and run** migration in production

## 🛠️ Troubleshooting

### Migration Fails
```bash
# Check current migration status
npm run migration:show

# Revert if needed
npm run migration:revert
```

### Database Connection Issues
- Verify `.env` database credentials
- Ensure PostgreSQL is running on specified port
- Check database exists and user has proper permissions

### TypeScript Compilation Issues
```bash
# Build the project first
npm run build

# Then run migrations
npm run migration:run
``` 