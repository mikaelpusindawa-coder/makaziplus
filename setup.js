/**
 * MakaziPlus Setup Script
 * Run ONCE after unzipping: node setup.js
 * Automatically generates correct bcrypt hashes and updates schema.sql
 */

const fs   = require('fs');
const path = require('path');

async function setup() {
  console.log('\n╔════════════════════════════════════════╗');
  console.log('║     MakaziPlus Setup v3.0              ║');
  console.log('║     Tanzania Property Platform         ║');
  console.log('╚════════════════════════════════════════╝\n');

  // Install bcryptjs if needed
  let bcrypt;
  try {
    bcrypt = require('bcryptjs');
  } catch {
    console.log('📦 Installing bcryptjs...');
    require('child_process').execSync('npm install bcryptjs', { stdio: 'inherit' });
    bcrypt = require('bcryptjs');
  }

  const sqlPath = path.join(__dirname, 'database', 'schema.sql');
  if (!fs.existsSync(sqlPath)) {
    console.error('❌ database/schema.sql not found. Make sure you unzipped correctly.');
    process.exit(1);
  }

  console.log('🔐 Generating bcrypt hashes (cost=12) — this takes ~10 seconds...\n');

  const passwords = ['demo123', 'agent123', 'admin123', 'owner123'];
  const hashes = await Promise.all(passwords.map(p => bcrypt.hash(p, 12)));

  console.log('✅ Hashes generated');

  let sql = fs.readFileSync(sqlPath, 'utf8');

  // Replace the PLACEHOLDER text for each user in order
  const emails = [
    'demo@makaziplus.co.tz',
    'agent@makaziplus.co.tz',
    'admin@makaziplus.co.tz',
    'owner@makaziplus.co.tz',
  ];

  emails.forEach((email, i) => {
    sql = sql.replace(
      new RegExp(`(${email.replace('.', '\\.')}.+?)\\$2a\\$12\\$PLACEHOLDER_REPLACE_WITH_SETUP_JS`, 's'),
      (match) => match.replace('$2a$12$PLACEHOLDER_REPLACE_WITH_SETUP_JS', hashes[i])
    );
  });

  fs.writeFileSync(sqlPath, sql, 'utf8');
  console.log('✅ database/schema.sql updated with real bcrypt hashes\n');

  // Check server/.env
  const envPath = path.join(__dirname, 'server', '.env');
  if (!fs.existsSync(envPath)) {
    const envExample = path.join(__dirname, 'server', '.env.example');
    if (fs.existsSync(envExample)) {
      fs.copyFileSync(envExample, envPath);
      console.log('✅ server/.env created from .env.example');
    }
  }

  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║  NEXT STEPS                                                ║');
  console.log('╠════════════════════════════════════════════════════════════╣');
  console.log('║  1. Open MySQL Workbench                                   ║');
  console.log('║  2. Open & run: database/schema.sql (Ctrl+Shift+Enter)     ║');
  console.log('║  3. Edit server/.env → set DB_PASSWORD=your_mysql_password ║');
  console.log('║  4. Run: npm run install-all                               ║');
  console.log('║  5. Run: npm run dev                                       ║');
  console.log('║  6. Open: http://localhost:3000                            ║');
  console.log('╠════════════════════════════════════════════════════════════╣');
  console.log('║  DEMO ACCOUNTS                                             ║');
  console.log('║  demo@makaziplus.co.tz   / demo123   (Mteja)              ║');
  console.log('║  agent@makaziplus.co.tz  / agent123  (Dalali)             ║');
  console.log('║  admin@makaziplus.co.tz  / admin123  (Admin)              ║');
  console.log('║  owner@makaziplus.co.tz  / owner123  (Mwenye)             ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');
}

setup().catch(err => {
  console.error('❌ Setup failed:', err.message);
  process.exit(1);
});
