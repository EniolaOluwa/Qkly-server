import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { RolesSeedService } from '../database/seeds/roles.seed';

console.log('🚀 Seed command started');

async function bootstrap() {
  console.log('🔧 Bootstrapping Nest context...');

  const app = await NestFactory.createApplicationContext(AppModule);
  const seedService = app.get(RolesSeedService);


  try {
    await seedService.seed();
    await seedService.migrateExistingUsers();
    console.log('\n✅ Seeding completed successfully!\n');
  } catch (error) {
    console.error('\n❌ Seeding failed:', error);
    process.exit(1);
  } finally {
    await app.close();
  }
}

bootstrap();