require('dotenv').config();
const bcrypt = require('bcryptjs');
const { v4: uuid } = require('uuid');
const { initDb } = require('./src/db');

initDb().then(db => {
  console.log('🔧 Fixing passwords...\n');

  const accounts = [
    { email: 'admin@rootswings.org', pw: 'Admin@123',  name: 'Admin',        role: 'ADMIN'  },
    { email: 'arjun@example.com',    pw: 'Arjun@123',  name: 'Arjun Mehta',  role: 'ALUMNI' },
    { email: 'sunita@example.com',   pw: 'Sunita@123', name: 'Sunita Rao',   role: 'ALUMNI' },
    { email: 'rahul@example.com',    pw: 'Rahul@123',  name: 'Rahul Verma',  role: 'ALUMNI' },
    { email: 'ananya@example.com',   pw: 'Ananya@123', name: 'Ananya Singh', role: 'ALUMNI' },
    { email: 'deepak@example.com',   pw: 'Deepak@123', name: 'Deepak Nair',  role: 'ALUMNI' },
    { email: 'kavya@example.com',    pw: 'Kavya@123',  name: 'Kavya Reddy',  role: 'ALUMNI' },
  ];

  for (const a of accounts) {
    const hash = bcrypt.hashSync(a.pw, 10);
    const exists = db.prepare('SELECT id FROM users WHERE email = ?').get(a.email);
    if (exists) {
      db.prepare('UPDATE users SET password_hash = ? WHERE email = ?').run(hash, a.email);
    } else {
      db.prepare('INSERT INTO users (id,name,email,password_hash,role) VALUES (?,?,?,?,?)').run(
        uuid(), a.name, a.email, hash, a.role
      );
    }
  }

  console.log('✅ All passwords saved to disk.\n');

  // Verify every single one
  console.log('🔍 Verifying...');
  let allPass = true;
  for (const a of accounts) {
    const row = db.prepare('SELECT password_hash FROM users WHERE email = ?').get(a.email);
    if (!row) { console.log(`❌ ${a.email} — NOT FOUND`); allPass = false; continue; }
    const ok = bcrypt.compareSync(a.pw, row.password_hash);
    console.log(`${ok ? '✅' : '❌'} ${a.email} — ${ok ? 'OK' : 'HASH MISMATCH'}`);
    if (!ok) allPass = false;
  }

  console.log(allPass
    ? '\n🌿 All good! Now run: npm start\n   Then login: admin@rootswings.org / Admin@123'
    : '\n❌ Some passwords failed — paste this output in the chat'
  );
  process.exit(0);
}).catch(e => { console.error('Error:', e.message); process.exit(1); });
