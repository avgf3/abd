const postgres = require('postgres');
require('dotenv').config();

async function testConnection() {
  const connectionString = process.env.DATABASE_URL;
  console.log('Testing database connection...');
  console.log('Connection string present:', !!connectionString);
  
  if (!connectionString) {
    console.log('❌ DATABASE_URL not found');
    return;
  }

  try {
    const client = postgres(connectionString, { 
      ssl: 'require',
      max: 1,
      idle_timeout: 10,
      connect_timeout: 10
    });
    
    const result = await client`select 1 as test`;
    console.log('✅ Database connection successful:', result);
    await client.end();
  } catch (error) {
    console.log('❌ Database connection failed:', error.message);
  }
}

testConnection();