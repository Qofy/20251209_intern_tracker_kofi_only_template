const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

// Determine DB path (matches backend TypeOrmModule default)
const dbFile = process.env.DB_DATABASE || path.join(__dirname, '..', 'intern_tracker.db');

function exitWith(msg, code = 1) {
  console.error(msg);
  process.exit(code);
}

if (!fs.existsSync(dbFile)) {
  exitWith(`Database file not found: ${dbFile}`);
}

const db = new Database(dbFile);

// Tables to clear (in order to avoid foreign key constraints)
const tablesToClear = [
  'time_entries',
  'messages',
  'contracts',
  'tasks',
  'projects',
  'schedules',
  'vacancies',
  'students',
  'users',
  'companies'
];

try {
  // Show current counts
  console.log('\nCurrent database state:');
  console.log('========================');
  for (const table of tablesToClear) {
    try {
      const result = db.prepare(`SELECT COUNT(*) as count FROM ${table}`).get();
      console.log(`${table}: ${result.count} record(s)`);
    } catch (e) {
      console.log(`${table}: table not found or error`);
    }
  }

  const confirmed = process.argv.includes('--yes') || process.argv.includes('-y');
  if (!confirmed) {
    console.log('\n⚠️  WARNING: This script will DELETE ALL DATA from the following tables:');
    console.log(tablesToClear.join(', '));
    console.log('\nThis will remove all companies, users, students, contracts, time entries, and all related data.');
    console.log('\nIf you are sure, re-run with the --yes flag:');
    console.log('\n  cd backend');
    console.log('  npm run clear:all -- --yes');
    console.log('\nOr from project root:');
    console.log('  npm run clear:all -- --yes');
    process.exit(0);
  }

  // Backup DB file
  const backupPath = `${dbFile}.backup.${Date.now()}`;
  fs.copyFileSync(dbFile, backupPath);
  console.log('\n✓ Backup created at:', backupPath);

  // Disable foreign key constraints temporarily
  db.prepare('PRAGMA foreign_keys = OFF').run();

  console.log('\nClearing tables...');
  console.log('==================');

  let totalDeleted = 0;
  for (const table of tablesToClear) {
    try {
      const deleteInfo = db.prepare(`DELETE FROM ${table}`).run();
      console.log(`✓ ${table}: deleted ${deleteInfo.changes} record(s)`);
      totalDeleted += deleteInfo.changes;
    } catch (e) {
      console.log(`✗ ${table}: ${e.message}`);
    }
  }

  // Re-enable foreign key constraints
  db.prepare('PRAGMA foreign_keys = ON').run();

  // Optionally vacuum to reclaim space
  try {
    console.log('\nVacuuming database to reclaim space...');
    db.prepare('VACUUM').run();
    console.log('✓ Database vacuumed successfully');
  } catch (e) {
    console.log('✗ VACUUM failed (may require permissions):', e.message);
  }

  console.log('\n✓ All data cleared successfully!');
  console.log(`Total records deleted: ${totalDeleted}`);
  console.log('\nYou can now recreate companies and users afresh.');

} catch (err) {
  console.error('\n✗ Error while clearing data:', err);
  process.exit(1);
} finally {
  try { db.close(); } catch (e) {}
}
