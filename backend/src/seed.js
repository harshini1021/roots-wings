require('dotenv').config();
const bcrypt = require('bcryptjs');
const { v4: uuid } = require('uuid');
const { initDb } = require('./db');

async function seed() {
  const db = await initDb();
  console.log('🌱 Seeding database...');
  const hash = (pw) => bcrypt.hashSync(pw, 10);

  // ── Admin ──────────────────────────────────────────────────────────────────
  const adminExists = db.prepare('SELECT id FROM users WHERE email = ?').get('admin@rootswings.org');
  if (!adminExists) {
    db.prepare('INSERT INTO users (id,name,email,password_hash,role) VALUES (?,?,?,?,?)').run(
      uuid(), 'Admin', 'admin@rootswings.org', hash('Admin@1234'), 'ADMIN'
    );
    console.log('✅ Admin created   →  admin@rootswings.org  /  Admin@1234');
  } else {
    console.log('ℹ️  Admin already exists');
  }

  // ── Alumni ─────────────────────────────────────────────────────────────────
  const alumni = [
    { name:'Arjun Mehta',    email:'arjun@example.com',   pw:'Arjun@123',   year:'2015', field:'Technology', role:'Software Engineer at Infosys',  mentor:1, bio:'Arjun grew up at our campus and went on to study computer science. Now leads a team of 12 engineers.' },
    { name:'Sunita Rao',     email:'sunita@example.com',  pw:'Sunita@123',  year:'2013', field:'Healthcare', role:'Staff Nurse at Apollo Hospitals', mentor:1, bio:'Sunita volunteers to mentor current students every weekend at Apollo.' },
    { name:'Rahul Verma',    email:'rahul@example.com',   pw:'Rahul@123',   year:'2016', field:'Education',  role:'Mathematics Teacher, KV School',  mentor:0, bio:'Rahul credits the tutors at the orphanage for sparking his love of numbers.' },
    { name:'Ananya Singh',   email:'ananya@example.com',  pw:'Ananya@123',  year:'2017', field:'Technology', role:'Startup Founder, EduTech',         mentor:1, bio:'Ananya bootstrapped her edtech platform at 24. It has helped 10,000+ rural students.' },
    { name:'Deepak Nair',    email:'deepak@example.com',  pw:'Deepak@123',  year:'2012', field:'Law',        role:'Civil Lawyer, Legal Aid Society',  mentor:0, bio:'Deepak works pro-bono cases for families who cannot afford legal help.' },
    { name:'Kavya Reddy',    email:'kavya@example.com',   pw:'Kavya@123',   year:'2019', field:'Arts',       role:'Graphic Designer, TCS Digital',   mentor:1, bio:'Kavya\'s art caught the eye of a teacher who encouraged her. Now her designs reach millions.' },
    { name:'Mohammed Iqbal', email:'iqbal@example.com',   pw:'Iqbal@123',   year:'2014', field:'Business',   role:'Business Analyst, Deloitte',       mentor:1, bio:'Iqbal worked three jobs through university. Now mentors residents on financial literacy.' },
    { name:'Pooja Krishnan', email:'pooja@example.com',   pw:'Pooja@123',   year:'2011', field:'Healthcare', role:'Pediatric Doctor, AIIMS',           mentor:1, bio:'One of our oldest alumni. Returns every year to give health talks to residents.' },
  ];

  const alumniIds = {};
  const userIds = {};
  for (const a of alumni) {
    const exists = db.prepare('SELECT id FROM users WHERE email = ?').get(a.email);
    if (exists) { console.log(`ℹ️  ${a.name} already exists`); userIds[a.email] = exists.id; continue; }
    const userId = uuid(); const alumniId = uuid();
    db.prepare('INSERT INTO users (id,name,email,password_hash,role) VALUES (?,?,?,?,?)').run(userId, a.name, a.email, hash(a.pw), 'ALUMNI');
    db.prepare('INSERT INTO alumni (id,user_id,year,field,current_role,bio,mentor,status) VALUES (?,?,?,?,?,?,?,?)').run(alumniId, userId, a.year, a.field, a.role, a.bio, a.mentor, 'APPROVED');
    userIds[a.email] = userId; alumniIds[a.email] = alumniId;
    console.log(`✅ ${a.name}  (${a.email} / ${a.pw})`);
  }

  // ── Jobs with real apply URLs ───────────────────────────────────────────────
  const arjunId = (db.prepare('SELECT id FROM users WHERE email=?').get('arjun@example.com') || {}).id;
  const sunId   = (db.prepare('SELECT id FROM users WHERE email=?').get('sunita@example.com') || {}).id;
  const anId    = (db.prepare('SELECT id FROM users WHERE email=?').get('ananya@example.com') || {}).id;
  const iqId    = (db.prepare('SELECT id FROM users WHERE email=?').get('iqbal@example.com') || {}).id;
  const deepId  = (db.prepare('SELECT id FROM users WHERE email=?').get('deepak@example.com') || {}).id;
  const kavId   = (db.prepare('SELECT id FROM users WHERE email=?').get('kavya@example.com') || {}).id;

  const jobs = [
    { title:'Junior Software Developer', company:'Infosys', type:'FULL_TIME', location:'Bengaluru, India', salary:'₹4–6 LPA', description:'Join our engineering team as a junior developer. Work on real products used by millions. Training provided. Open to fresh graduates and career changers.', applyUrl:'https://career.infosys.com', postedBy: arjunId },
    { title:'Healthcare Internship', company:'Apollo Hospitals', type:'INTERNSHIP', location:'Hyderabad, India', salary:'₹10,000/month stipend', description:'3-month internship in our general ward. Ideal for nursing or healthcare students. Learn from experienced doctors and nurses in a top hospital.', applyUrl:'https://www.apollohospitals.com/careers/', postedBy: sunId },
    { title:'Content & Social Media Writer', company:'EduTech Startup', type:'PART_TIME', location:'Remote', salary:'₹15,000/month', description:'Write blog posts, social media content, and learning materials for our edtech platform. Flexible hours, fully remote. Great for students or early-career writers.', applyUrl:'https://wellfound.com', postedBy: anId },
    { title:'Business Development Executive', company:'Deloitte', type:'FULL_TIME', location:'Mumbai, India', salary:'₹7–10 LPA', description:'Drive client acquisition and partnership development for Deloitte\'s consulting division. Excellent communication skills required. MBA preferred but not mandatory.', applyUrl:'https://jobs2.deloitte.com', postedBy: iqId },
    { title:'Legal Research Intern', company:'Legal Aid Society of India', type:'INTERNSHIP', location:'New Delhi, India', salary:'Unpaid (Certificate provided)', description:'Support senior lawyers on pro-bono cases. Research case law, draft documents, and attend hearings. Great experience for law students.', applyUrl:'https://www.legalserviceindia.com', postedBy: deepId },
    { title:'Junior Graphic Designer', company:'TCS Digital', type:'FULL_TIME', location:'Pune, India', salary:'₹3.5–5 LPA', description:'Create visual content for digital campaigns, apps, and websites. Proficiency in Figma or Adobe Suite required. Portfolio must be submitted with application.', applyUrl:'https://ibegin.tcs.com', postedBy: kavId },
    { title:'Data Entry Operator', company:'Wipro BPS', type:'FULL_TIME', location:'Chennai, India', salary:'₹2–3 LPA', description:'Entry-level data processing role. Basic computer skills required. Training provided on the job. Great first job opportunity for freshers.', applyUrl:'https://careers.wipro.com', postedBy: arjunId },
    { title:'Nursing Assistant', company:'Fortis Healthcare', type:'FULL_TIME', location:'Bengaluru, India', salary:'₹2.5–3.5 LPA', description:'Assist nursing staff with patient care. Compassionate attitude required. Open to candidates with basic healthcare training or certification.', applyUrl:'https://www.fortishealthcare.com/careers', postedBy: sunId },
  ];

  for (const j of jobs) {
    if (!j.postedBy) continue;
    const exists = db.prepare('SELECT id FROM jobs WHERE title=? AND company=?').get(j.title, j.company);
    if (exists) { console.log(`ℹ️  Job "${j.title}" already exists`); continue; }
    db.prepare('INSERT INTO jobs (id,title,company,type,description,location,salary,apply_url,posted_by,status) VALUES (?,?,?,?,?,?,?,?,?,?)').run(
      uuid(), j.title, j.company, j.type, j.description, j.location, j.salary, j.applyUrl, j.postedBy, 'LIVE'
    );
    console.log(`✅ Job: ${j.title} @ ${j.company}`);
  }

  // ── Stories ────────────────────────────────────────────────────────────────
  const stories = [
    { email:'arjun@example.com', quote:'Growing up without parents, I thought university was a dream for others. The alumni who visited showed me it was possible. Today I lead an engineering team of 12 — I owe everything to this community.', detail:'Software Engineer at Infosys · Class of 2015' },
    { email:'sunita@example.com', quote:'The nurses who volunteered at our campus inspired me to become one. There are difficult days, but knowing I can save lives makes every sacrifice worth it.', detail:'Staff Nurse, Apollo Hospitals · Class of 2013' },
    { email:'ananya@example.com', quote:'My first laptop was donated by an alumnus. With it I taught myself to code, built my first app, and got a scholarship. Technology is the great equaliser.', detail:'Startup Founder, EduTech · Class of 2017' },
    { email:'deepak@example.com', quote:'I became a lawyer so children in situations like mine would have someone to fight for them. Every case I take is personal.', detail:'Civil Lawyer, Legal Aid Society · Class of 2012' },
    { email:'kavya@example.com', quote:'A teacher saw my sketches and gifted me a drawing tablet. That single act of kindness changed my life. Now my designs are seen by millions every day.', detail:'Graphic Designer, TCS Digital · Class of 2019' },
  ];

  for (const s of stories) {
    const aRow = db.prepare('SELECT id FROM alumni WHERE user_id=(SELECT id FROM users WHERE email=?)').get(s.email);
    if (!aRow) continue;
    const exists = db.prepare('SELECT id FROM stories WHERE alumni_id=?').get(aRow.id);
    if (exists) continue;
    db.prepare('INSERT INTO stories (id,alumni_id,quote,detail,status) VALUES (?,?,?,?,?)').run(uuid(), aRow.id, s.quote, s.detail, 'LIVE');
    console.log(`✅ Story: ${s.email}`);
  }

  // Demo accounts for login page
  const demoAccounts = [
    { email: 'priya@demo.com',    pw: 'Demo@123', name: 'Priya Demo',    role: 'ALUMNI',    year: '2020', field: 'Technology', roleTitle: 'Junior Developer' },
    { email: 'resident@demo.com', pw: 'Demo@123', name: 'Resident Demo', role: 'RESIDENT',  year: null,   field: null,         roleTitle: null },
  ];

  for (const d of demoAccounts) {
    const exists = db.prepare('SELECT id FROM users WHERE email=?').get(d.email);
    if (exists) {
      db.prepare('UPDATE users SET password_hash=? WHERE email=?').run(hash(d.pw), d.email);
      console.log(`ℹ️  ${d.email} password refreshed`);
    } else {
      const uid = uuid();
      db.prepare('INSERT INTO users (id,name,email,password_hash,role) VALUES (?,?,?,?,?)').run(uid, d.name, d.email, hash(d.pw), d.role);
      if (d.role === 'ALUMNI') {
        db.prepare('INSERT INTO alumni (id,user_id,year,field,current_role,bio,mentor,status) VALUES (?,?,?,?,?,?,?,?)').run(
          uuid(), uid, d.year, d.field, d.roleTitle, 'Demo alumni account.', 0, 'APPROVED'
        );
      }
      console.log(`✅ Demo: ${d.email} / ${d.pw}`);
    }
  }

  console.log('\n🌿 Seed complete! Run: npm start');
  process.exit(0);
}

seed().catch(err => { console.error('Seed failed:', err.message); process.exit(1); });
