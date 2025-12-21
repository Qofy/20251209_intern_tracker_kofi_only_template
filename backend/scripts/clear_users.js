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

try {
  const users = db.prepare('SELECT id, email, role FROM users').all();
  console.log(`Found ${users.length} user(s) in ${dbFile}`);
  if (users.length > 0) {
    console.log('Sample users:');
    console.table(users.slice(0, 10));
  }

  const confirmed = process.argv.includes('--yes') || process.argv.includes('-y');
  if (!confirmed) {
    console.log('\nThis script will DELETE ALL ROWS from the `users` table.');
    console.log('If you are sure, re-run with the --yes flag:');
    console.log('\n  cd backend');
    console.log('  npm run clear:users -- --yes');
    process.exit(0);
  }

  // Backup DB file
  const backupPath = `${dbFile}.backup.${Date.now()}`;
  fs.copyFileSync(dbFile, backupPath);
  console.log('Backup created at:', backupPath);

  const deleteInfo = db.prepare('DELETE FROM users').run();
  console.log('Deleted users:', deleteInfo.changes);

  // Optionally vacuum to reclaim space
  try {
    db.prepare('VACUUM').run();
  } catch (e) {
    // VACUUM may require permissions; ignore if fails
  }

  console.log('All users removed. You can now recreate users afresh.');
} catch (err) {
  console.error('Error while clearing users:', err);
  process.exit(1);
} finally {
  try { db.close(); } catch (e) {}
}
