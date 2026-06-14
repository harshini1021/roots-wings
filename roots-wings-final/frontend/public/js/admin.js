// Admin panel logic — runs on admin.html

const Admin = {
  user: null,

  init: async () => {
    Admin.user = Auth.requireAdmin();
    if (!Admin.user) return;

    document.getElementById('admin-name').textContent = Admin.user.name;
    document.getElementById('admin-email').textContent = Admin.user.email;

    document.getElementById('admin-signout')?.addEventListener('click', () => {
      Auth.clear(); window.location.href = '/login.html';
    });

    // Sidebar nav
    document.querySelectorAll('.si').forEach(item => {
      item.addEventListener('click', () => {
        document.querySelectorAll('.si').forEach(i => i.classList.remove('active'));
        item.classList.add('active');
        const panel = item.dataset.panel;
        document.querySelectorAll('.apanel').forEach(p => p.classList.remove('active'));
        document.getElementById(panel)?.classList.add('active');
        document.getElementById('a-title').textContent = item.dataset.title || '';
        Admin.loadPanel(panel);
      });
    });

    await Admin.loadDashboard();
  },

  loadPanel: (panel) => {
    if (panel === 'a-regs') Admin.loadRegistrations();
    else if (panel === 'a-jobs') Admin.loadJobs();
    else if (panel === 'a-stories') Admin.loadStories();
    else if (panel === 'a-users') Admin.loadUsers();
    else if (panel === 'a-log') Admin.loadActivity();
    else if (panel === 'a-dash') Admin.loadDashboard();
  },

  loadDashboard: async () => {
    try {
      const [stats, regsRes, actRes] = await Promise.all([
        api.admin.getStats(),
        api.admin.getRegistrations('PENDING'),
        api.admin.getActivity(),
      ]);

      document.getElementById('as-alumni').textContent = stats.totalAlumni;
      document.getElementById('as-pend').textContent = stats.pendingAlumni;
      document.getElementById('as-jobs').textContent = stats.liveJobs;
      document.getElementById('as-stories').textContent = stats.liveStories;

      // Sidebar badges
      const rc = document.getElementById('sb-rc');
      if (rc) { rc.textContent = stats.pendingAlumni; rc.style.display = stats.pendingAlumni ? '' : 'none'; }
      const jc = document.getElementById('sb-jc');
      if (jc) { jc.textContent = stats.pendingJobs; jc.style.display = stats.pendingJobs ? '' : 'none'; }

      // Pending list
      const pendEl = document.getElementById('d-pend');
      if (pendEl) {
        pendEl.innerHTML = regsRes.alumni.length
          ? regsRes.alumni.slice(0, 4).map((a, i) => Admin.regRow(a, i)).join('')
          : Components.empty('No pending registrations');
      }

      // Activity
      const actEl = document.getElementById('d-act');
      if (actEl) {
        actEl.innerHTML = actRes.logs.slice(0, 5).map(l => Admin.actRow(l)).join('')
          || Components.empty('No activity yet');
      }
    } catch (err) {
      Components.toast('Failed to load dashboard: ' + err.message, 'error');
    }
  },

  loadRegistrations: async (filter = 'all') => {
    const el = document.getElementById('reg-list');
    if (!el) return;
    el.innerHTML = Components.loading();
    try {
      const status = filter !== 'all' ? filter.toUpperCase() : undefined;
      const res = await api.admin.getRegistrations(status);
      el.innerHTML = res.alumni.length
        ? res.alumni.map((a, i) => Admin.regRow(a, i)).join('')
        : Components.empty('No registrations found');
      document.getElementById('rc-lbl').textContent =
        res.alumni.filter(a => a.status === 'PENDING').length + ' pending';
    } catch (err) {
      el.innerHTML = Components.empty('Failed to load');
    }
  },

  regRow: (a, i) => {
    const name = a.user?.name || a.name;
    const actions = a.status === 'PENDING'
      ? `<button class="b-appr" onclick="Admin.approveReg('${a.id}','${name}')">Approve</button>
         <button class="b-rej" onclick="Admin.rejectReg('${a.id}','${name}')">Reject</button>`
      : `<button class="b-view" onclick="Admin.viewProfile('${a.id}','${name}','${a.user?.email||''}','${a.field}','${a.year}','${a.currentRole||a.current_role||''}')">View</button>`;
    return Components.adminRow(
      avatar(name, i, 36), name,
      `${a.user?.email || ''} · ${a.field} · Class of ${a.year}`,
      a.status, actions
    );
  },

  approveReg: async (id, name) => {
    try {
      await api.admin.updateRegistration(id, 'APPROVED');
      Components.toast(`${name} approved! Email sent.`, 'success');
      Admin.loadDashboard();
      if (document.getElementById('a-regs')?.classList.contains('active')) Admin.loadRegistrations();
    } catch (err) { Components.toast(err.message, 'error'); }
  },

  rejectReg: async (id, name) => {
    try {
      await api.admin.updateRegistration(id, 'REJECTED');
      Components.toast(`${name}'s registration rejected. Email sent.`, 'info');
      Admin.loadDashboard();
      if (document.getElementById('a-regs')?.classList.contains('active')) Admin.loadRegistrations();
    } catch (err) { Components.toast(err.message, 'error'); }
  },

  loadJobs: async (filter = 'all') => {
    const el = document.getElementById('job-list');
    if (!el) return;
    el.innerHTML = Components.loading();
    try {
      const status = filter !== 'all' ? filter.toUpperCase() : undefined;
      const res = await api.admin.getJobs(status);
      el.innerHTML = res.jobs.length
        ? res.jobs.map((j, i) => {
          const actions = j.status === 'PENDING'
            ? `<button class="b-appr" onclick="Admin.approveJob('${j.id}','${j.title}')">Approve</button>
               <button class="b-rej" onclick="Admin.removeJob('${j.id}')">Remove</button>`
            : `<button class="b-rej" onclick="Admin.removeJob('${j.id}')">Remove</button>`;
          return Components.adminRow(
            avatar(j.postedBy?.name || '?', i, 36),
            j.title, `${j.company} · ${j.type} · by ${j.postedBy?.name || ''}`,
            j.status, actions
          );
        }).join('')
        : Components.empty('No jobs');
      document.getElementById('jc-lbl').textContent =
        res.jobs.filter(j => j.status === 'PENDING').length + ' awaiting review';
    } catch (err) {
      el.innerHTML = Components.empty('Failed to load');
    }
  },

  approveJob: async (id, title) => {
    try {
      await api.admin.updateJob(id, 'LIVE');
      Components.toast(`"${title}" is now live!`, 'success');
      Admin.loadJobs();
    } catch (err) { Components.toast(err.message, 'error'); }
  },

  removeJob: async (id) => {
    try {
      await api.admin.updateJob(id, 'REMOVED');
      Components.toast('Job removed', 'info');
      Admin.loadJobs();
    } catch (err) { Components.toast(err.message, 'error'); }
  },

  loadStories: async () => {
    const el = document.getElementById('story-list');
    if (!el) return;
    el.innerHTML = Components.loading();
    try {
      const res = await api.admin.getStories();
      el.innerHTML = res.stories.length
        ? res.stories.map((s, i) => {
          const name = s.alumni?.user?.name || '?';
          const actions = `<button class="b-view" onclick="Admin.viewStory('${s.id}')">View</button>
                           <button class="b-rej" onclick="Admin.removeStory('${s.id}')">Remove</button>`;
          return Components.adminRow(
            avatar(name, i, 36), name,
            (s.quote || '').substring(0, 60) + '...',
            s.status, actions
          );
        }).join('')
        : Components.empty('No stories');
      document.getElementById('sc-lbl').textContent = res.stories.filter(s => s.status === 'LIVE').length + ' live';
    } catch (err) { el.innerHTML = Components.empty('Failed to load'); }
  },

  removeStory: async (id) => {
    try {
      await api.admin.deleteStory(id);
      Components.toast('Story removed', 'info');
      Admin.loadStories();
    } catch (err) { Components.toast(err.message, 'error'); }
  },

  loadUsers: async (query = '', role = '') => {
    const el = document.getElementById('user-list');
    if (!el) return;
    el.innerHTML = Components.loading();
    try {
      const res = await api.admin.getUsers({ search: query, role: role || undefined });
      const rb = { ALUMNI: 'bap', RESIDENT: 'bp', ADMIN: 'blv' };
      el.innerHTML = res.users.length
        ? res.users.map((u, i) => {
          const actions = u.role !== 'ADMIN'
            ? `<button class="b-view" onclick="Admin.viewUser('${u.id}','${u.name}','${u.email}','${u.role}')">View</button>
               <button class="b-rej" onclick="Admin.removeUser('${u.id}','${u.name}')">Remove</button>`
            : `<button class="b-view" onclick="Admin.viewUser('${u.id}','${u.name}','${u.email}','${u.role}')">View</button>`;
          return `<div class="i-row">
            ${avatar(u.name, i, 36)}
            <div class="i-info"><div class="in">${u.name}</div><div class="im">${u.email}</div></div>
            <span class="bst ${rb[u.role] || 'bp'}">${u.role}</span>
            <div class="i-act">${actions}</div>
          </div>`;
        }).join('')
        : Components.empty('No users found');
      document.getElementById('uc-lbl').textContent = res.users.length + ' members';
    } catch (err) { el.innerHTML = Components.empty('Failed to load'); }
  },

  viewProfile: (id, name, email, field, year, role) => {
    const box = document.getElementById('modal-box');
    box.innerHTML = `
      <h3>${name}</h3>
      <p class="msub">${role} · Class of ${year}</p>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:14px 0">
        <div style="background:var(--warm);border-radius:8px;padding:10px 12px"><div style="font-size:10px;color:var(--muted);font-weight:600">FIELD</div><div style="font-size:12px;font-weight:500;margin-top:2px">${field}</div></div>
        <div style="background:var(--warm);border-radius:8px;padding:10px 12px"><div style="font-size:10px;color:var(--muted);font-weight:600">EMAIL</div><div style="font-size:12px;font-weight:500;margin-top:2px">${email}</div></div>
      </div>
      <div style="display:flex;gap:8px;margin-top:16px">
        <button class="btn-cancel" style="flex:1" onclick="Admin.closeModal()">Close</button>
        <button class="btn-main" style="flex:1;width:auto;padding:9px" onclick="Admin.approveReg('${id}','${name}');Admin.closeModal()">Approve</button>
      </div>`;
    document.getElementById('modal-overlay').classList.add('open');
  },

  viewStory: async (id) => {
    try {
      const res = await api.admin.getStories();
      const story = res.stories.find(s => s.id === id);
      if (!story) { Components.toast('Story not found', 'error'); return; }
      const box = document.getElementById('modal-box');
      const name = story.alumni?.user?.name || story.name || 'Alumni';
      box.innerHTML = `
        <h3>Success Story</h3>
        <div style="background:var(--forest-light);border-radius:10px;padding:16px;margin:12px 0">
          <div style="font-size:32px;color:#4a8c5c;opacity:.3;line-height:.7;margin-bottom:8px">"</div>
          <p style="font-size:13px;line-height:1.7;color:#1e4529;font-style:italic">${story.quote}</p>
        </div>
        <p style="font-size:12px;color:var(--muted);margin-bottom:4px"><strong>${name}</strong></p>
        <p style="font-size:12px;color:var(--muted);margin-bottom:16px">${story.detail || ''}</p>
        <div style="display:flex;gap:8px">
          <button class="btn-cancel" style="flex:1" onclick="Admin.closeModal()">Close</button>
          <button style="flex:1;padding:9px;background:#FCEBEB;color:#791F1F;border:1px solid #F09595;border-radius:8px;font-size:12px;font-weight:600;cursor:pointer" onclick="Admin.removeStory('${id}');Admin.closeModal()">Remove story</button>
        </div>`;
      document.getElementById('modal-overlay').classList.add('open');
    } catch(e) { Components.toast('Failed to load story', 'error'); }
  },

  viewUser: (id, name, email, role) => {
    const box = document.getElementById('modal-box');
    box.innerHTML = `
      <h3>${name}</h3>
      <div style="display:grid;gap:8px;margin:14px 0">
        <div style="background:var(--warm);border-radius:8px;padding:10px 12px"><div style="font-size:10px;color:var(--muted);font-weight:600">EMAIL</div><div style="font-size:12px;font-weight:500;margin-top:2px">${email}</div></div>
        <div style="background:var(--warm);border-radius:8px;padding:10px 12px"><div style="font-size:10px;color:var(--muted);font-weight:600">ROLE</div><div style="font-size:12px;font-weight:500;margin-top:2px">${role}</div></div>
      </div>
      <div style="display:flex;gap:8px;margin-top:16px">
        <button class="btn-cancel" style="flex:1" onclick="Admin.closeModal()">Close</button>
        ${role !== 'ADMIN' ? `<button style="flex:1;padding:9px;background:#FCEBEB;color:#791F1F;border:1px solid #F09595;border-radius:8px;font-size:12px;font-weight:600;cursor:pointer" onclick="Admin.removeUser('${id}','${name}');Admin.closeModal()">Remove user</button>` : ''}
      </div>`;
    document.getElementById('modal-overlay').classList.add('open');
  },

  closeModal: () => {
    document.getElementById('modal-overlay')?.classList.remove('open');
  },

    removeUser: async (id, name) => {
    if (!confirm(`Remove ${name}? This cannot be undone.`)) return;
    try {
      await api.admin.deleteUser(id);
      Components.toast(`${name} removed`, 'info');
      Admin.loadUsers();
    } catch (err) { Components.toast(err.message, 'error'); }
  },

  loadActivity: async () => {
    const el = document.getElementById('act-list');
    if (!el) return;
    el.innerHTML = Components.loading();
    try {
      const res = await api.admin.getActivity();
      el.innerHTML = res.logs.length
        ? res.logs.map(l => Admin.actRow(l)).join('')
        : Components.empty('No activity yet');
    } catch (err) { el.innerHTML = Components.empty('Failed to load'); }
  },

  actRow: (log) => {
    const icons = [
      { match: 'registration', icon: 'ti-user-plus', bg: '#eaf3de', c: '#27500a' },
      { match: 'approved', icon: 'ti-check', bg: '#e1f5ee', c: '#085041' },
      { match: 'rejected', icon: 'ti-x', bg: '#fcebeb', c: '#791f1f' },
      { match: 'job', icon: 'ti-briefcase', bg: '#faeeda', c: '#633806' },
      { match: 'story', icon: 'ti-quote', bg: '#e6f1fb', c: '#0c447c' },
    ];
    const style = icons.find(x => log.action.toLowerCase().includes(x.match)) || { icon: 'ti-activity', bg: '#f0ebe0', c: '#6b6b63' };
    const time = log.createdAt ? new Date(log.createdAt).toLocaleString() : '';
    return `<div class="act-row">
      <div class="act-ico" style="background:${style.bg};color:${style.c}"><i class="ti ${style.icon}"></i></div>
      <div class="act-txt">${log.action}<div class="act-tm">${time}</div></div>
    </div>`;
  },
};

window.Admin = Admin;

document.addEventListener('DOMContentLoaded', Admin.init);

// Filter wiring
document.querySelectorAll('[data-reg-filter]').forEach(btn => {
  btn.addEventListener('click', function () {
    document.querySelectorAll('[data-reg-filter]').forEach(b => b.classList.remove('active'));
    this.classList.add('active');
    Admin.loadRegistrations(this.dataset.regFilter);
  });
});
document.querySelectorAll('[data-job-filter]').forEach(btn => {
  btn.addEventListener('click', function () {
    document.querySelectorAll('[data-job-filter]').forEach(b => b.classList.remove('active'));
    this.classList.add('active');
    Admin.loadJobs(this.dataset.jobFilter);
  });
});
document.getElementById('user-search')?.addEventListener('input', function () {
  Admin.loadUsers(this.value, document.getElementById('user-role-filter')?.value);
});
document.getElementById('user-role-filter')?.addEventListener('change', function () {
  Admin.loadUsers(document.getElementById('user-search')?.value, this.value);
});
