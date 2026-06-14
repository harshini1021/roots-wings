// fix-all.js — fixes demo accounts + verifies all passwords
require('dotenv').config();
const bcrypt = require('bcryptjs');
const { v4: uuid } = require('uuid');
const { initDb } = require('./src/db');

initDb().then(db => {
  console.log('🔧 Fixing all accounts...\n');
  const hash = pw => bcrypt.hashSync(pw, 10);

  // Fix all existing passwords
  const accounts = [
    { email: 'admin@rootswings.org', pw: 'Admin@123', name: 'Admin', role: 'ADMIN' },
    { email: 'arjun@example.com',    pw: 'Arjun@123',  name: 'Arjun Mehta',    role: 'ALUMNI' },
    { email: 'sunita@example.com',   pw: 'Sunita@123', name: 'Sunita Rao',     role: 'ALUMNI' },
    { email: 'rahul@example.com',    pw: 'Rahul@123',  name: 'Rahul Verma',    role: 'ALUMNI' },
    { email: 'ananya@example.com',   pw: 'Ananya@123', name: 'Ananya Singh',   role: 'ALUMNI' },
    { email: 'deepak@example.com',   pw: 'Deepak@123', name: 'Deepak Nair',    role: 'ALUMNI' },
    { email: 'kavya@example.com',    pw: 'Kavya@123',  name: 'Kavya Reddy',    role: 'ALUMNI' },
    { email: 'iqbal@example.com',    pw: 'Iqbal@123',  name: 'Mohammed Iqbal', role: 'ALUMNI' },
    { email: 'pooja@example.com',    pw: 'Pooja@123',  name: 'Pooja Krishnan', role: 'ALUMNI' },
  ];

  for (const a of accounts) {
    const exists = db.prepare('SELECT id FROM users WHERE email=?').get(a.email);
    if (exists) {
      db.prepare('UPDATE users SET password_hash=? WHERE email=?').run(hash(a.pw), a.email);
    } else {
      db.prepare('INSERT INTO users (id,name,email,password_hash,role) VALUES (?,?,?,?,?)').run(uuid(), a.name, a.email, hash(a.pw), a.role);
    }
    console.log(`✅ ${a.email} → ${a.pw}`);
  }

  // Create demo alumni account (priya@demo.com)
  const priyaExists = db.prepare('SELECT id FROM users WHERE email=?').get('priya@demo.com');
  if (!priyaExists) {
    const uid = uuid(); const aid = uuid();
    db.prepare('INSERT INTO users (id,name,email,password_hash,role) VALUES (?,?,?,?,?)').run(uid, 'Priya Demo', 'priya@demo.com', hash('Demo@123'), 'ALUMNI');
    db.prepare('INSERT INTO alumni (id,user_id,year,field,current_role,bio,mentor,status) VALUES (?,?,?,?,?,?,?,?)').run(
      aid, uid, '2020', 'Technology', 'Junior Developer', 'Demo alumni account for testing.', 0, 'APPROVED'
    );
    console.log('✅ priya@demo.com → Demo@123 (created)');
  } else {
    db.prepare('UPDATE users SET password_hash=? WHERE email=?').run(hash('Demo@123'), 'priya@demo.com');
    console.log('✅ priya@demo.com → Demo@123 (updated)');
  }

  // Create demo resident account
  const resExists = db.prepare('SELECT id FROM users WHERE email=?').get('resident@demo.com');
  if (!resExists) {
    const uid = uuid();
    db.prepare('INSERT INTO users (id,name,email,password_hash,role) VALUES (?,?,?,?,?)').run(uid, 'Resident Demo', 'resident@demo.com', hash('Demo@123'), 'RESIDENT');
    console.log('✅ resident@demo.com → Demo@123 (created)');
  } else {
    db.prepare('UPDATE users SET password_hash=? WHERE email=?').run(hash('Demo@123'), 'resident@demo.com');
    console.log('✅ resident@demo.com → Demo@123 (updated)');
  }

  // Verify all
  console.log('\n🔍 Verifying...');
  const verify = [
    { email: 'admin@rootswings.org', pw: 'Admin@123' },
    { email: 'priya@demo.com',       pw: 'Demo@123'  },
    { email: 'resident@demo.com',    pw: 'Demo@123'  },
  ];
  for (const v of verify) {
    const row = db.prepare('SELECT password_hash FROM users WHERE email=?').get(v.email);
    const ok = row && bcrypt.compareSync(v.pw, row.password_hash);
    console.log(`${ok ? '✅' : '❌'} ${v.email} — ${ok ? 'OK' : 'FAILED'}`);
  }

  console.log('\n🌿 Done! Demo credentials:');
  console.log('   Admin:    admin@rootswings.org / Admin@123');
  console.log('   Alumni:   priya@demo.com / Demo@123');
  console.log('   Resident: resident@demo.com / Demo@123');
  process.exit(0);
}).catch(e => { console.error(e.message); process.exit(1); });
