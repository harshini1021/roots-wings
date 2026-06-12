// Reusable UI component builders

const COLORS = [
  { bg: '#e8f2eb', c: '#2c5f3a' }, { bg: '#f5e9c0', c: '#7a5800' },
  { bg: '#e6f1fb', c: '#0c447c' }, { bg: '#fbeaf0', c: '#72243e' },
  { bg: '#eaf3de', c: '#27500a' }, { bg: '#e1f5ee', c: '#085041' },
];
const gc = (i) => COLORS[i % COLORS.length];
const ini = (n) => {
  const p = (n || '?').trim().split(' ');
  return (p[0][0] + (p[1] ? p[1][0] : '')).toUpperCase();
};
const avatar = (name, idx, size = 44) => {
  const c = gc(idx);
  return `<div class="av" style="width:${size}px;height:${size}px;border-radius:50%;background:${c.bg};color:${c.c};display:flex;align-items:center;justify-content:center;font-size:${Math.round(size * 0.33)}px;font-weight:500;flex-shrink:0">${ini(name)}</div>`;
};

const Components = {
  alumniCard: (a, idx, onclick) => `
    <div class="alumni-card" tabindex="0" onclick="${onclick || ''}" onkeydown="if(event.key==='Enter')this.click()">
      ${avatar(a.user?.name || a.name, idx)}
      <h4>${a.user?.name || a.name}</h4>
      <div class="r">${a.currentRole || a.role || ''}</div>
      <span class="badge ${a.mentor ? 'bm' : 'ba'}">${a.mentor ? 'Mentor available' : 'Alumni'}</span>
      <div class="yr">Class of ${a.year}</div>
    </div>`,

  jobCard: (j, idx) => {
    const colors = [
      { bg: '#e6f1fb', c: '#0c447c' }, { bg: '#fbeaf0', c: '#72243e' },
      { bg: '#f5e9c0', c: '#7a5800' }, { bg: '#e8f2eb', c: '#2c5f3a' },
      { bg: '#eaf3de', c: '#27500a' }, { bg: '#e1f5ee', c: '#085041' },
    ];
    const col = colors[idx % colors.length];
    const typeLabel = { FULL_TIME: 'Full-time', PART_TIME: 'Part-time', INTERNSHIP: 'Internship', FREELANCE: 'Freelance' };
    const safeId = (j.id || '').replace(/'/g, '');
    return `
    <div class="jcard" onclick="Portal.openJobModal('${safeId}')" style="cursor:pointer">
      <div class="j-ico" style="background:${col.bg}">
        <i class="ti ti-briefcase" style="color:${col.c}"></i>
      </div>
      <div class="j-info">
        <h4>${j.title}</h4>
        <div class="m">${j.company} · <span style="font-weight:600;color:${col.c}">${typeLabel[j.type] || j.type}</span></div>
        ${j.location ? `<div class="by"><i class="ti ti-map-pin" style="font-size:11px;vertical-align:-1px"></i> ${j.location}</div>` : ''}
        ${j.salary  ? `<div class="by" style="color:#0F6E56;font-weight:500"><i class="ti ti-cash" style="font-size:11px;vertical-align:-1px"></i> ${j.salary}</div>` : ''}
      </div>
      <button class="btn-sm" onclick="event.stopPropagation();Portal.applyJob('${safeId}','${(j.title||'').replace(/'/g,"\\'")}','${j.applyUrl||''}')">Apply</button>
    </div>`;
  },

  storyCard: (s, idx) => `
    <div class="story-card">
      <div class="story-top">
        <div class="qm">"</div>
        <blockquote>${s.quote}</blockquote>
      </div>
      <div class="story-bot">
        ${avatar(s.alumni?.user?.name || s.name, idx, 34)}
        <div>
          <div class="s-nm">${s.alumni?.user?.name || s.name}</div>
          <div class="s-dt">${s.detail}</div>
        </div>
      </div>
    </div>`,

  mentorCard: (a, idx) => {
    const c = gc(idx);
    return `
    <div class="m-card">
      <div class="m-av" style="background:${c.bg};color:${c.c}">${ini(a.user?.name || a.name)}</div>
      <h4>${a.user?.name || a.name}</h4>
      <div class="m-field">${a.field}</div>
      <div class="m-slots"><i class="ti ti-clock" style="font-size:12px;vertical-align:-1px"></i> Accepting requests</div>
      <button class="btn-conn" onclick="Portal.openMentorModal('${a.id}','${a.user?.name || a.name}')">Connect</button>
    </div>`;
  },

  toast: (msg, type = 'success') => {
    const el = document.getElementById('toast-el');
    if (!el) return;
    el.textContent = msg;
    el.className = `toast ${type} show`;
    clearTimeout(window._toastTimer);
    window._toastTimer = setTimeout(() => el.classList.remove('show'), 2800);
  },

  loading: (msg = 'Loading...') => `
    <div class="loading-state">
      <i class="ti ti-loader-2" style="font-size:28px;display:block;margin-bottom:10px;opacity:0.4;animation:spin 1s linear infinite"></i>
      ${msg}
    </div>`,

  empty: (msg) => `
    <div class="empty-state">
      <i class="ti ti-inbox" style="font-size:32px;display:block;margin-bottom:10px;opacity:0.3"></i>
      ${msg}
    </div>`,

  statusBadge: (s) => {
    const m = { PENDING: ['bp', 'Pending'], APPROVED: ['bap', 'Approved'], REJECTED: ['bfl', 'Rejected'], LIVE: ['blv', 'Live'], REMOVED: ['bfl', 'Removed'] };
    const [cls, label] = m[s] || ['bp', s];
    return `<span class="bst ${cls}">${label}</span>`;
  },

  adminRow: (av, name, meta, status, actions) => `
    <div class="i-row">
      ${av}
      <div class="i-info">
        <div class="in">${name}</div>
        <div class="im">${meta}</div>
      </div>
      ${Components.statusBadge(status)}
      <div class="i-act">${actions}</div>
    </div>`,
};

window.Components = Components;
window.avatar = avatar;
window.ini = ini;
window.gc = gc;
