const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'canteenhub',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'password',
});

async function runMigration() {
  const client = await pool.connect();
  
  try {
    console.log('🚀 Starting database migration...');
    
    // Read the schema file
    const schemaPath = path.join(__dirname, 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    
    // Split the schema into individual statements
    const statements = schema
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
    
    console.log(`📝 Found ${statements.length} SQL statements to execute`);
    
    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      if (statement.trim()) {
        try {
          console.log(`⏳ Executing statement ${i + 1}/${statements.length}...`);
          await client.query(statement);
          console.log(`✅ Statement ${i + 1} executed successfully`);
        } catch (error) {
          console.error(`❌ Error executing statement ${i + 1}:`, error.message);
          // Continue with other statements unless it's a critical error
          if (error.code === '42P07') { // Table already exists
            console.log('⚠️  Table already exists, skipping...');
          } else {
            throw error;
          }
        }
      }
    }
    
    console.log('🎉 Database migration completed successfully!');
    
    // Verify tables were created
    const tablesResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);
    
    console.log('📊 Created tables:');
    tablesResult.rows.forEach(row => {
      console.log(`   - ${row.table_name}`);
    });
    
  } catch (error) {
    console.error('💥 Migration failed:', error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

// Run migration if this file is executed directly
if (require.main === module) {
  runMigration();
}

module.exports = { runMigration };
