// Main portal logic — runs on index.html

const Portal = {
  user: null,
  alumni: [],
  jobs: [],
  stories: [],

  init: async () => {
    Portal.user = Auth.requireAuth();
    if (!Portal.user) return;

    // Set up nav user info
    const av = document.getElementById('p-uav');
    const c = gc(0);
    if (av) {
      av.style.cssText = `background:${c.bg};color:${c.c};width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:500`;
      av.textContent = ini(Portal.user.name);
    }
    const nameEl = document.getElementById('p-uname');
    if (nameEl) nameEl.textContent = Portal.user.name.split(' ')[0];
    const roleEl = document.getElementById('p-urole');
    if (roleEl) roleEl.textContent = Portal.user.role === 'RESIDENT' ? 'Resident' : 'Alumni';

    // Sign out
    document.getElementById('signout-btn')?.addEventListener('click', () => {
      Auth.clear();
      window.location.href = '/login.html';
    });

    // Nav tabs
    document.querySelectorAll('.ptab').forEach(tab => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('.ptab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        document.querySelectorAll('.ppanel').forEach(p => p.classList.remove('active'));
        document.getElementById(tab.dataset.panel)?.classList.add('active');
      });
    });

    await Portal.loadAll();
  },

  loadAll: async () => {
    try {
      const [alumniRes, jobsRes, storiesRes, statsRes] = await Promise.all([
        api.getAlumni({ status: 'APPROVED' }),
        api.getJobs(),
        api.getStories(),
        api.getStats(),
      ]);

      Portal.alumni = alumniRes.alumni || [];
      Portal.jobs = jobsRes.jobs || [];
      Portal.stories = storiesRes.stories || [];

      // Stats
      document.getElementById('stat-alumni').textContent = statsRes.totalAlumni;
      document.getElementById('stat-mentors').textContent = statsRes.mentors;
      document.getElementById('stat-jobs').textContent = statsRes.liveJobs;
      document.getElementById('stat-stories').textContent = statsRes.liveStories;

      Portal.renderHome();
      Portal.renderAlumni(Portal.alumni);
      Portal.renderJobs(Portal.jobs);
      Portal.renderStories(Portal.stories);
      Portal.renderMentors(Portal.alumni.filter(a => a.mentor));
    } catch (err) {
      Components.toast('Failed to load data: ' + err.message, 'error');
    }
  },

  renderHome: () => {
    const hAlumni = document.getElementById('h-alumni');
    const hJobs = document.getElementById('h-jobs');
    if (hAlumni) hAlumni.innerHTML = Portal.alumni.slice(0, 3).map((a, i) =>
      Components.alumniCard(a, i, `Portal.openAlumniModal('${a.id}')`)
    ).join('') || Components.empty('No alumni yet');
    if (hJobs) hJobs.innerHTML = Portal.jobs.slice(0, 3).map((j, i) =>
      Components.jobCard(j, i)
    ).join('') || Components.empty('No jobs yet');
  },

  renderAlumni: (list) => {
    const el = document.getElementById('all-alumni');
    if (!el) return;
    el.innerHTML = list.length
      ? list.map((a, i) => Components.alumniCard(a, i, `Portal.openAlumniModal('${a.id}')`)).join('')
      : Components.empty('No alumni found');
    document.getElementById('alumni-count').textContent = list.length + ' graduates';
  },

  renderJobs: (list) => {
    const el = document.getElementById('all-jobs');
    if (!el) return;
    el.innerHTML = list.length
      ? list.map((j, i) => Components.jobCard(j, i)).join('')
      : Components.empty('No job openings yet');
  },

  renderStories: (list) => {
    const el = document.getElementById('all-stories');
    if (!el) return;
    el.innerHTML = list.length
      ? list.map((s, i) => Components.storyCard(s, i)).join('')
      : Components.empty('No stories yet');
  },

  renderMentors: (list) => {
    const el = document.getElementById('all-mentors');
    if (!el) return;
    el.innerHTML = list.length
      ? list.map((m, i) => Components.mentorCard(m, i)).join('')
      : Components.empty('No mentors available yet');
  },

  // Search & filter alumni
  filterAlumni: (query, field) => {
    const q = (query || '').toLowerCase();
    const f = (field || '').toLowerCase();
    const filtered = Portal.alumni.filter(a => {
      const name = (a.user?.name || '').toLowerCase();
      const role = (a.currentRole || '').toLowerCase();
      const af = (a.field || '').toLowerCase();
      return (!q || name.includes(q) || role.includes(q)) && (!f || af === f);
    });
    Portal.renderAlumni(filtered);
  },

  // Open job detail modal
  openJobModal: (id) => {
    const j = Portal.jobs.find(x => x.id === id);
    if (!j) return;
    const typeLabel = { FULL_TIME: 'Full-time', PART_TIME: 'Part-time', INTERNSHIP: 'Internship', FREELANCE: 'Freelance' };
    const box = document.getElementById('modal-box');
    box.innerHTML = `
      <h3 style="margin-bottom:4px">${j.title}</h3>
      <div style="font-size:13px;color:var(--muted);margin-bottom:16px">${j.company} · ${typeLabel[j.type] || j.type}</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:16px">
        ${j.location ? `<div style="background:var(--warm);border-radius:8px;padding:10px 12px"><div style="font-size:10px;color:var(--muted);font-weight:600;margin-bottom:2px">LOCATION</div><div style="font-size:12px;font-weight:500">${j.location}</div></div>` : ''}
        ${j.salary  ? `<div style="background:var(--warm);border-radius:8px;padding:10px 12px"><div style="font-size:10px;color:var(--muted);font-weight:600;margin-bottom:2px">SALARY</div><div style="font-size:12px;font-weight:500;color:#0F6E56">${j.salary}</div></div>` : ''}
      </div>
      <div style="font-size:13px;line-height:1.7;color:var(--ink);margin-bottom:6px;font-weight:500">About this role</div>
      <p style="font-size:13px;line-height:1.7;color:var(--muted);margin-bottom:16px">${j.description}</p>
      <div style="font-size:12px;color:var(--muted);margin-bottom:16px">Posted by <strong>${j.postedBy?.name || ''}</strong></div>
      <div style="display:flex;gap:10px">
        <button class="btn-cancel" style="flex:1" onclick="Portal.closeModal()">Close</button>
        <button class="btn-main" style="flex:2;width:auto;padding:10px" onclick="Portal.applyJob('${j.id}','${(j.title||'').replace(/'/g,"\\'")}','${j.applyUrl||''}')">
          <i class="ti ti-external-link"></i> Apply now
        </button>
      </div>`;
    document.getElementById('modal-overlay').classList.add('open');
  },

  // Apply for a job — opens official website
  applyJob: (id, title, applyUrl) => {
    if (applyUrl && applyUrl.startsWith('http')) {
      window.open(applyUrl, '_blank', 'noopener,noreferrer');
      Components.toast('Opening application page...', 'success');
    } else {
      Components.toast('Contact the poster directly to apply for "' + title + '"', 'info');
    }
    Portal.closeModal();
  },

  // Open alumni profile modal
  openAlumniModal: async (id) => {
    const a = Portal.alumni.find(x => x.id === id);
    if (!a) return;
    const name = a.user?.name || a.name;
    const box = document.getElementById('modal-box');
    box.innerHTML = `
      <h3>${name}</h3>
      <p class="msub">${a.currentRole} · Class of ${a.year}</p>
      <p style="font-size:13px;line-height:1.7;color:var(--muted);margin-bottom:20px">
        Connect with ${name.split(' ')[0]} for mentorship, job referrals, or to learn from their journey.
      </p>
      <div style="display:flex;gap:10px">
        <button class="btn-p" style="flex:1" onclick="Components.toast('Message sent to ${name.split(' ')[0]}!','success');Portal.closeModal()">Send message</button>
        ${a.mentor ? `<button class="btn-o" style="flex:1" onclick="Portal.openMentorModal('${a.id}','${name}')">Request mentorship</button>` : ''}
      </div>`;
    document.getElementById('modal-overlay').classList.add('open');
  },

  // Open mentor request modal
  openMentorModal: (alumniId, name) => {
    Portal.closeModal();
    const box = document.getElementById('modal-box');
    box.innerHTML = `
      <h3>Request mentorship</h3>
      <p class="msub">Send a request to ${name}</p>
      <div class="field">
        <label>Your message (optional)</label>
        <textarea id="mentor-msg" placeholder="Tell them about yourself and what you're looking for..." style="width:100%;padding:10px;border:1px solid var(--border);border-radius:8px;font-family:inherit;font-size:13px;resize:vertical;min-height:90px"></textarea>
      </div>
      <div class="m-acts">
        <button class="btn-cancel" onclick="Portal.closeModal()">Cancel</button>
        <button class="btn-main" style="width:auto;padding:9px 22px" onclick="Portal.submitMentorRequest('${alumniId}','${name}')">Send request</button>
      </div>`;
    document.getElementById('modal-overlay').classList.add('open');
  },

  submitMentorRequest: async (alumniId, name) => {
    const message = document.getElementById('mentor-msg')?.value.trim();
    try {
      await api.requestMentor({ alumniId, message });
      Portal.closeModal();
      Components.toast(`Mentorship request sent to ${name}!`, 'success');
    } catch (err) {
      Components.toast(err.message, 'error');
    }
  },

  // Post a job modal
  openPostJobModal: () => {
    const box = document.getElementById('modal-box');
    box.innerHTML = `
      <h3>Post a job</h3>
      <p class="msub">Help community members find opportunities</p>
      <div class="field"><label>Job title</label><input type="text" id="m-title" placeholder="e.g. Frontend Developer"></div>
      <div class="field"><label>Company name</label><input type="text" id="m-company" placeholder="Your company"></div>
      <div class="field"><label>Job type</label>
        <select id="m-type">
          <option value="FULL_TIME">Full-time</option>
          <option value="INTERNSHIP">Internship</option>
          <option value="PART_TIME">Part-time</option>
          <option value="FREELANCE">Freelance</option>
        </select>
      </div>
      <div class="field"><label>Description</label>
        <textarea id="m-desc" placeholder="Describe the role and requirements..." style="min-height:80px"></textarea>
      </div>
      <div class="field"><label>Location</label><input type="text" id="m-location" placeholder="e.g. Bengaluru, India or Remote"></div>
      <div class="field"><label>Salary / Stipend (optional)</label><input type="text" id="m-salary" placeholder="e.g. ₹4–6 LPA or ₹10,000/month"></div>
      <div class="field"><label>Apply URL (optional)</label><input type="url" id="m-applyurl" placeholder="https://yourcompany.com/careers"></div>
      <div class="m-acts">
        <button class="btn-cancel" onclick="Portal.closeModal()">Cancel</button>
        <button class="btn-main" style="width:auto;padding:9px 22px" onclick="Portal.submitJob()">Submit for review</button>
      </div>`;
    document.getElementById('modal-overlay').classList.add('open');
  },

  submitJob: async () => {
    const title = document.getElementById('m-title')?.value.trim();
    const company = document.getElementById('m-company')?.value.trim();
    const type = document.getElementById('m-type')?.value;
    const description = document.getElementById('m-desc')?.value.trim();
    if (!title || !company || !description) {
      Components.toast('Please fill all fields', 'error'); return;
    }
    const location = document.getElementById('m-location')?.value.trim();
    const salary   = document.getElementById('m-salary')?.value.trim();
    const applyUrl = document.getElementById('m-applyurl')?.value.trim();
    try {
      await api.postJob({ title, company, type, description, location, salary, applyUrl });
      Portal.closeModal();
      Components.toast('Job submitted for admin review!', 'success');
    } catch (err) {
      Components.toast(err.message, 'error');
    }
  },

  // Share story modal
  openShareStoryModal: () => {
    const box = document.getElementById('modal-box');
    box.innerHTML = `
      <h3>Share your story</h3>
      <p class="msub">Inspire current residents with your journey</p>
      <div class="field"><label>Your story</label>
        <textarea id="m-quote" placeholder="Tell us how your journey has been..." style="min-height:100px"></textarea>
      </div>
      <div class="field"><label>Role & year</label>
        <input type="text" id="m-detail" placeholder="e.g. Doctor, Apollo · Class of 2015">
      </div>
      <div class="m-acts">
        <button class="btn-cancel" onclick="Portal.closeModal()">Cancel</button>
        <button class="btn-main" style="width:auto;padding:9px 22px" onclick="Portal.submitStory()">Publish story</button>
      </div>`;
    document.getElementById('modal-overlay').classList.add('open');
  },

  submitStory: async () => {
    const quote = document.getElementById('m-quote')?.value.trim();
    const detail = document.getElementById('m-detail')?.value.trim();
    if (!quote || !detail) { Components.toast('Please fill all fields', 'error'); return; }
    try {
      const res = await api.postStory({ quote, detail });
      Portal.closeModal();
      Portal.stories.unshift(res.story);
      Portal.renderStories(Portal.stories);
      Components.toast('Story published!', 'success');
    } catch (err) {
      Components.toast(err.message, 'error');
    }
  },

  closeModal: () => {
    document.getElementById('modal-overlay')?.classList.remove('open');
  },
};

window.Portal = Portal;

// Bootstrap on DOM ready
document.addEventListener('DOMContentLoaded', Portal.init);

// Modal overlay click to close
document.getElementById('modal-overlay')?.addEventListener('click', (e) => {
  if (e.target === document.getElementById('modal-overlay')) Portal.closeModal();
});

// Alumni search wiring
document.getElementById('alumni-search')?.addEventListener('input', function () {
  Portal.filterAlumni(this.value, document.getElementById('alumni-field')?.value);
});
document.getElementById('alumni-field')?.addEventListener('change', function () {
  Portal.filterAlumni(document.getElementById('alumni-search')?.value, this.value);
});
