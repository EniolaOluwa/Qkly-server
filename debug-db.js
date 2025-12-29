
const { Client } = require('pg');
require('dotenv').config();

const client = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    user: process.env.DB_USERNAME || 'qkly_admin',
    password: process.env.DB_PASSWORD || 'qkly_password',
    database: process.env.DB_NAME || 'qkly_db',
});

async function run() {
    try {
        await client.connect();
        console.log('Connected to DB');
        
        // Check columns
        const resCols = await client.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'product_variants'");
        console.log('Columns:', resCols.rows.map(r => r.column_name));

        // Check row
        const resRow = await client.query('SELECT id, "quantityInStock", sku FROM product_variants WHERE id = 2');
        console.log('Row 2:', resRow.rows[0]);
        
        await client.end();
    } catch (err) {
        console.error('Error:', err);
        process.exit(1);
    }
}

run();
