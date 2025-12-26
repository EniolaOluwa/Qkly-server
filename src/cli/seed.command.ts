import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { RolesSeedService } from '../database/seeds/roles.seed';
import { TestDataSeedService } from '../database/seeds/test-data.seed';

console.log('🚀 Seed command started');

async function bootstrap() {
  console.log('🔧 Bootstrapping Nest context...');

  const app = await NestFactory.createApplicationContext(AppModule);
  const rolesSeedService = app.get(RolesSeedService);
  const testDataSeedService = app.get(TestDataSeedService);

  try {
    // Run roles seed
    await rolesSeedService.seed();
    await rolesSeedService.migrateExistingUsers();

    // Run test data seed
    await testDataSeedService.seed();

    console.log('\n✅ Seeding completed successfully!\n');
  } catch (error) {
    console.error('\n❌ Seeding failed:', error);
    process.exit(1);
  } finally {
    await app.close();
  }
}

bootstrap();