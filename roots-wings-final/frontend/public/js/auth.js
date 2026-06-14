// Auth state management
const Auth = {
  getUser: () => JSON.parse(localStorage.getItem('rw_user') || 'null'),
  getToken: () => localStorage.getItem('rw_token'),
  isLoggedIn: () => !!localStorage.getItem('rw_token'),

  save: (token, user) => {
    localStorage.setItem('rw_token', token);
    localStorage.setItem('rw_user', JSON.stringify(user));
  },

  clear: () => {
    localStorage.removeItem('rw_token');
    localStorage.removeItem('rw_user');
  },

  redirectByRole: (user) => {
    if (user.role === 'ADMIN') {
      window.location.href = '/admin.html';
    } else {
      window.location.href = '/index.html';
    }
  },

  requireAuth: () => {
    if (!Auth.isLoggedIn()) {
      window.location.href = '/login.html';
      return null;
    }
    return Auth.getUser();
  },

  requireAdmin: () => {
    const user = Auth.requireAuth();
    if (user && user.role !== 'ADMIN') {
      window.location.href = '/index.html';
      return null;
    }
    return user;
  },
};

window.Auth = Auth;

// Login page logic
if (document.getElementById('login-form')) {
  const form = document.getElementById('login-form');
  const errEl = document.getElementById('login-error');
  const btnEl = document.getElementById('login-btn');

  // Role tab switching
  document.querySelectorAll('.rtab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.rtab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
    });
  });

  // Demo fill buttons
  document.querySelectorAll('[data-demo]').forEach(btn => {
    btn.addEventListener('click', () => {
      const [email, pw, role] = btn.dataset.demo.split('|');
      document.getElementById('email').value = email;
      document.getElementById('password').value = pw;
      const roleTab = document.querySelector(`[data-role="${role}"]`);
      if (roleTab) {
        document.querySelectorAll('.rtab').forEach(t => t.classList.remove('active'));
        roleTab.classList.add('active');
      }
    });
  });

  // Toggle password visibility
  document.querySelector('.pw-eye')?.addEventListener('click', function () {
    const inp = document.getElementById('password');
    inp.type = inp.type === 'password' ? 'text' : 'password';
    this.querySelector('i').className = inp.type === 'password' ? 'ti ti-eye' : 'ti ti-eye-off';
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    errEl.style.display = 'none';
    btnEl.disabled = true;
    btnEl.textContent = 'Signing in...';

    try {
      const email = document.getElementById('email').value.trim();
      const password = document.getElementById('password').value;
      const { token, user } = await api.login({ email, password });
      Auth.save(token, user);
      Auth.redirectByRole(user);
    } catch (err) {
      errEl.textContent = err.message;
      errEl.style.display = 'block';
    } finally {
      btnEl.disabled = false;
      btnEl.textContent = 'Sign in';
    }
  });
}

// Signup page logic
if (document.getElementById('signup-form')) {
  const form = document.getElementById('signup-form');
  const errEl = document.getElementById('signup-error');
  const okEl = document.getElementById('signup-ok');
  const btnEl = document.getElementById('signup-btn');

  document.querySelector('.pw-eye')?.addEventListener('click', function () {
    const inp = document.getElementById('password');
    inp.type = inp.type === 'password' ? 'text' : 'password';
    this.querySelector('i').className = inp.type === 'password' ? 'ti ti-eye' : 'ti ti-eye-off';
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    errEl.style.display = 'none';
    okEl.style.display = 'none';

    const name = document.getElementById('name').value.trim();
    const email = document.getElementById('email').value.trim();
    const year = document.getElementById('year').value;
    const field = document.getElementById('field').value;
    const currentRole = document.getElementById('currentRole').value.trim();
    const mentor = document.getElementById('mentor').value === 'true';
    const password = document.getElementById('password').value;

    if (!name || !email || !year || !field || !currentRole || password.length < 8 || !/[0-9]/.test(password)) {
      errEl.textContent = 'Fill all fields. Password must be 8+ chars with at least one number.';
      errEl.style.display = 'block';
      return;
    }

    btnEl.disabled = true;
    btnEl.textContent = 'Creating account...';

    try {
      await api.register({ name, email, password, year, field, currentRole, mentor });
      okEl.textContent = 'Account created! A welcome email has been sent. Pending admin approval.';
      okEl.style.display = 'block';
      form.reset();
      setTimeout(() => { window.location.href = '/login.html'; }, 2500);
    } catch (err) {
      errEl.textContent = err.message;
      errEl.style.display = 'block';
    } finally {
      btnEl.disabled = false;
      btnEl.textContent = 'Create account';
    }
  });
}

// Forgot password page
if (document.getElementById('forgot-form')) {
  document.getElementById('forgot-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('email').value.trim();
    const okEl = document.getElementById('forgot-ok');
    const errEl = document.getElementById('forgot-error');
    try {
      await api.forgotPassword(email);
      okEl.textContent = 'If that email exists, a reset link has been sent.';
      okEl.style.display = 'block';
      errEl.style.display = 'none';
    } catch (err) {
      errEl.textContent = err.message;
      errEl.style.display = 'block';
    }
  });
}
