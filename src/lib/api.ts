import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';

// Create axios instance with default config
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem('refresh_token');
        if (refreshToken) {
          const response = await axios.post(`${API_BASE_URL}/auth/refresh`, {
            refresh_token: refreshToken,
          });

          const { access_token, refresh_token: newRefreshToken } = response.data;
          localStorage.setItem('access_token', access_token);
          localStorage.setItem('refresh_token', newRefreshToken);

          originalRequest.headers.Authorization = `Bearer ${access_token}`;
          return api(originalRequest);
        }
      } catch (refreshError) {
        // Refresh failed, redirect to login
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        window.location.href = '/login';
      }
    }

    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  login: (email: string, password: string, twoFactorCode?: string) =>
    api.post('/auth/login', { email, password, two_factor_code: twoFactorCode }),
  
  register: (userData: {
    name: string;
    email: string;
    password: string;
    role: 'parent' | 'child';
    phone_number?: string;
  }) => api.post('/auth/register', userData),
  
  logout: () => api.post('/auth/logout'),
  
  refreshToken: (refreshToken: string) =>
    api.post('/auth/refresh', { refresh_token: refreshToken }),
  
  enable2FA: () => api.post('/auth/enable-2fa'),
  
  verify2FA: (code: string) => api.post('/auth/verify-2fa', { code }),
};

// Goals API
export const goalsAPI = {
  getGoals: (params?: { status?: string; category?: string; skip?: number; limit?: number }) =>
    api.get('/goals', { params }),
  
  getGoal: (goalId: string) => api.get(`/goals/${goalId}`),
  
  createGoal: (goalData: {
    title: string;
    description?: string;
    target_amount: number;
    target_date: string;
    category: string;
    priority?: string;
    auto_save_amount?: number;
    auto_save_frequency?: string;
  }) => api.post('/goals', goalData),
  
  updateGoal: (goalId: string, updates: any) => api.put(`/goals/${goalId}`, updates),
  
  deleteGoal: (goalId: string) => api.delete(`/goals/${goalId}`),
  
  getGoalAnalytics: (goalId: string) => api.get(`/goals/${goalId}/analytics`),
  
  shareGoal: (goalId: string, email: string, permission: string = 'view') =>
    api.post(`/goals/${goalId}/share`, { shared_with_email: email, permission_level: permission }),
};

// Transactions API
export const transactionsAPI = {
  getTransactions: (params?: { goal_id?: string; status?: string; skip?: number; limit?: number }) =>
    api.get('/transactions', { params }),
  
  getTransaction: (transactionId: string) => api.get(`/transactions/${transactionId}`),
  
  createTransaction: (transactionData: {
    goal_id: string;
    amount: number;
    transaction_type: 'deposit' | 'withdrawal';
    method: 'mpesa' | 'bank' | 'cash';
    description?: string;
    phone_number?: string;
    paybill_number?: string;
    account_number?: string;
  }) => api.post('/transactions', transactionData),
  
  initiateMpesaPayment: (paymentData: {
    goal_id: string;
    amount: number;
    phone_number: string;
    paybill_number: string;
    account_number: string;
  }) => api.post('/transactions/mpesa/payment', paymentData),
};

// Analytics API
export const analyticsAPI = {
  getSavingsOverview: () => api.get('/analytics/savings-overview'),
  
  getGoalProgress: () => api.get('/analytics/goal-progress'),
  
  getSpendingPatterns: (periodDays: number = 30) =>
    api.get('/analytics/spending-patterns', { params: { period_days: periodDays } }),
  
  getFamilyComparison: () => api.get('/analytics/family-comparison'),
};

export default api;