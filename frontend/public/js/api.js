// Central API client — all fetch calls go through here
const API_URL = window.ENV_API_URL || 'https://roots-wings-api.onrender.com';

const getToken = () => localStorage.getItem('rw_token');

const apiFetch = async (path, options = {}) => {
  const token = getToken();
  const res = await fetch(`${API_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
    ...options,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
};

const api = {
  // Auth
  register: (body) => apiFetch('/api/auth/register', { method: 'POST', body: JSON.stringify(body) }),
  login: (body) => apiFetch('/api/auth/login', { method: 'POST', body: JSON.stringify(body) }),
  forgotPassword: (email) => apiFetch('/api/auth/forgot-password', { method: 'POST', body: JSON.stringify({ email }) }),
  resetPassword: (body) => apiFetch('/api/auth/reset-password', { method: 'POST', body: JSON.stringify(body) }),
  getMe: () => apiFetch('/api/auth/me'),

  // Alumni
  getAlumni: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return apiFetch(`/api/alumni${q ? '?' + q : ''}`);
  },
  getAlumni: (params = {}) => apiFetch('/api/alumni?' + new URLSearchParams(params)),
  getAlumniById: (id) => apiFetch(`/api/alumni/${id}`),
  getStats: () => apiFetch('/api/alumni/stats'),

  // Jobs
  getJobs: () => apiFetch('/api/jobs'),
  postJob: (body) => apiFetch('/api/jobs', { method: 'POST', body: JSON.stringify(body) }),

  // Stories
  getStories: () => apiFetch('/api/stories'),
  postStory: (body) => apiFetch('/api/stories', { method: 'POST', body: JSON.stringify(body) }),

  // Mentors
  requestMentor: (body) => apiFetch('/api/mentors/request', { method: 'POST', body: JSON.stringify(body) }),

  // Admin
  admin: {
    getStats: () => apiFetch('/api/admin/stats'),
    getRegistrations: (status) => apiFetch('/api/admin/registrations' + (status ? `?status=${status}` : '')),
    updateRegistration: (id, status) => apiFetch(`/api/admin/registrations/${id}`, { method: 'PUT', body: JSON.stringify({ status }) }),
    getJobs: (status) => apiFetch('/api/admin/jobs' + (status ? `?status=${status}` : '')),
    updateJob: (id, status) => apiFetch(`/api/admin/jobs/${id}`, { method: 'PUT', body: JSON.stringify({ status }) }),
    getStories: () => apiFetch('/api/admin/stories'),
    deleteStory: (id) => apiFetch(`/api/admin/stories/${id}`, { method: 'DELETE' }),
    getUsers: (params = {}) => apiFetch('/api/admin/users?' + new URLSearchParams(params)),
    deleteUser: (id) => apiFetch(`/api/admin/users/${id}`, { method: 'DELETE' }),
    getActivity: () => apiFetch('/api/admin/activity'),
  },
};

window.api = api;
