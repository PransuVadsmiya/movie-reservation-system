/**
 * API Client for Movie Reservation System
 * 
 * Authentication Flow (matching backend implementation):
 * 1. POST /auth/login with { email, password }
 * 2. Backend validates credentials and returns JWT token
 * 3. Store token in localStorage
 * 4. Include token in all subsequent requests as: Authorization: Bearer {token}
 * 5. Backend validates token using HTTPBearer scheme
 * 6. Token contains user_id in "sub" claim, expires in 60 minutes (default)
 */

import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001';

// Create axios instance with base configuration
const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests automatically if it exists
apiClient.interceptors.request.use(
  (config) => {
    // Only add token in browser environment (not during SSR)
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('access_token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Handle 401 errors globally (token expired or invalid)
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid - clear local storage
      if (typeof window !== 'undefined') {
        localStorage.removeItem('access_token');
        localStorage.removeItem('user');
        // Redirect to login if not already there
        if (window.location.pathname !== '/login') {
          window.location.href = '/login';
        }
      }
    }
    return Promise.reject(error);
  }
);

// Type definitions matching backend schemas
export interface UserCreate {
  email: string;
  password: string;
}

export interface UserLogin {
  email: string;
  password: string;
}

export interface Token {
  access_token: string;
  token_type: string;
}

export interface User {
  id: string;
  email: string;
  full_name?: string | null;
  role: 'user' | 'admin';
  created_at: string;
  theater?: {
    id: string;
    name: string;
    address: string;
  } | null;
}

// Auth API calls
export const authAPI = {
  /**
   * Sign up a new user
   * POST /auth/signup
   * Backend creates user with hashed password (bcrypt)
   * Returns user object (does NOT auto-login)
   */
  signup: async (data: UserCreate): Promise<User> => {
    const response = await apiClient.post<User>('/auth/signup', data);
    return response.data;
  },

  /**
   * Login with email and password
   * POST /auth/login
   * Backend:
   * 1. Finds user by email
   * 2. Verifies password using bcrypt
   * 3. Creates JWT token with user_id in "sub" claim
   * 4. Returns { access_token, token_type: "bearer" }
   */
  login: async (data: UserLogin): Promise<Token> => {
    const response = await apiClient.post<Token>('/auth/login', data);
    return response.data;
  },

  /**
   * Get current authenticated user
   * GET /me
   * Backend:
   * 1. Extracts token from Authorization header
   * 2. Decodes JWT and gets user_id from "sub" claim
   * 3. Queries database for user
   * 4. Returns user object
   */
  getCurrentUser: async (): Promise<User> => {
    const response = await apiClient.get<User>('/me');
    return response.data;
  },

  /**
   * Test admin-only endpoint
   * GET /admin-check
   * Backend checks if current user has role="admin"
   * Returns 403 if not admin
   */
  adminCheck: async (): Promise<{ message: string }> => {
    const response = await apiClient.get('/admin-check');
    return response.data;
  },

  /**
   * Update current user profile
   * PUT /me
   */
  updateProfile: async (data: { full_name?: string }): Promise<User> => {
    const response = await apiClient.put<User>('/me', data);
    return response.data;
  },
};

export default apiClient;
