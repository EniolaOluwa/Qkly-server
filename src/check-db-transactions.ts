import { DataSource } from 'typeorm';
import { Transaction } from './core/transaction/entity/transaction.entity';
import { User } from './core/users/entity/user.entity';
import { Business } from './core/businesses/business.entity';
import { Order } from './core/order/entity/order.entity';
import * as dotenv from 'dotenv';

dotenv.config();

const dataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432'),
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  entities: [Transaction, User, Business, Order],
  synchronize: false,
});

async function checkTransactions() {
  try {
    await dataSource.initialize();
    console.log('Data Source initialized');

    // Use raw query to avoid entity issues
    const result = await dataSource.query('SELECT * FROM transactions');
    console.log(`\nTotal Transactions in DB: ${result.length}`);

    if (result.length > 0) {
      console.log('Transactions:', JSON.stringify(result, null, 2));
    } else {
      console.log('No transactions found in the database table.');
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    if (dataSource.isInitialized) {
      await dataSource.destroy();
    }
  }
}

checkTransactions();
