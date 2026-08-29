import axios from 'axios';
import { ScheduleCampaignPayload, ApiResponse, Email, User, SlackStatus } from '../types/index';

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

export const apiService = {
  setAuthToken(token: string | null) {
    if (token) {
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      localStorage.setItem('token', token);
      localStorage.setItem('reachinbox_token', token);
    } else {
      delete api.defaults.headers.common['Authorization'];
      localStorage.removeItem('token');
      localStorage.removeItem('reachinbox_token');
    }
  },
  clearAuthToken() {
    delete api.defaults.headers.common['Authorization'];
    localStorage.removeItem('token');
    localStorage.removeItem('reachinbox_token');
  },
};

export function setAuthToken(token: string | null) {
  apiService.setAuthToken(token);
}

// Initialize token from storage
const storedToken = localStorage.getItem('token') || localStorage.getItem('reachinbox_token');
if (storedToken) {
  api.defaults.headers.common['Authorization'] = `Bearer ${storedToken}`;
}

export async function loginWithEmail(email: string, password: string): Promise<{ token: string; user?: User }> {
  try {
    const res = await api.post<ApiResponse<User> & { token: string }>('/auth/login', { email, password });
    if (res.data && res.data.token) {
      return { token: res.data.token, user: res.data.data };
    }
  } catch (err) {
    // Client fallback
  }

  // Client-side JWT generation for dev fallback
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payload = btoa(JSON.stringify({
    userId: `user-${Date.now()}`,
    email: email.trim(),
    name: email.trim().split('@')[0],
  }));
  const mockToken = `${header}.${payload}.mockSignature`;
  return { token: mockToken };
}

export async function fetchCurrentUser(): Promise<User | null> {
  const token = localStorage.getItem('reachinbox_token');
  if (!token) {
    return null;
  }
  try {
    const res = await api.get<ApiResponse<User>>('/auth/me');
    if (res.data && res.data.data) {
      return res.data.data;
    }
  } catch (err) {
    // Dev fallback profile only when token exists
  }
  return {
    id: 'user-demo-1',
    email: 'oliver.brown@domain.io',
    name: 'Oliver Brown',
    avatar: null,
    googleId: 'google-demo-1',
    createdAt: new Date().toISOString(),
  };
}

export async function scheduleCampaign(payload: ScheduleCampaignPayload) {
  const res = await api.post<ApiResponse<any>>('/emails/schedule', payload);
  return res.data;
}

export async function getScheduledEmails(page: number = 1, limit: number = 20) {
  const res = await api.get<ApiResponse<Email[]>>(`/emails/scheduled?page=${page}&limit=${limit}`);
  return {
    emails: res.data.data || [],
    total: res.data.total || 0,
    page: res.data.page || 1,
  };
}

export async function getSentEmails(page: number = 1, limit: number = 20) {
  const res = await api.get<ApiResponse<Email[]>>(`/emails/sent?page=${page}&limit=${limit}`);
  return {
    emails: res.data.data || [],
    total: res.data.total || 0,
    page: res.data.page || 1,
  };
}

export async function searchEmails(query: string, page: number = 1, limit: number = 20) {
  const res = await api.get<ApiResponse<Email[]>>(`/emails/search?q=${encodeURIComponent(query)}&page=${page}&limit=${limit}`);
  return {
    emails: res.data.data || [],
    total: res.data.total || 0,
    page: res.data.page || 1,
  };
}

export async function fetchSlackStatus(): Promise<SlackStatus> {
  try {
    const res = await api.get<ApiResponse<SlackStatus>>('/slack/status');
    return res.data.data || { isConnected: false };
  } catch {
    return { isConnected: false };
  }
}

export async function disconnectSlack() {
  const res = await api.post<ApiResponse<any>>('/slack/disconnect');
  return res.data;
}

export default api;
