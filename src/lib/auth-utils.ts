/**
 * Authentication Utilities
 * Centralized functions for managing authentication state
 */

/**
 * Clears all authentication-related data from localStorage
 * This should be called on logout to ensure complete cleanup
 */
export const clearAuthData = () => {
  // Authentication tokens
  localStorage.removeItem('authToken');
  localStorage.removeItem('superAdminToken');
  
  // User data
  localStorage.removeItem('user');
  localStorage.removeItem('userRole');
  localStorage.removeItem('userEmail');
  localStorage.removeItem('superAdminUser');

  try {
    sessionStorage.removeItem('aslilearn_nav_initials');
  } catch {
    /* ignore */
  }
  
  // Temporary data (teacher assignments - can be cleared on logout)
  localStorage.removeItem('teacherClassAssignments');
  
  // Note: We intentionally DON'T clear:
  // - completed_content_* (user progress should persist across sessions)
};

/**
 * Gets the authentication token from localStorage
 */
export const getAuthToken = (): string | null => {
  return localStorage.getItem('authToken');
};

/**
 * Read `userId` / `id` from the JWT payload (no signature verify).
 * Used for React Query keys when `/api/auth/me` has not populated `user._id` yet.
 */
export const getUserIdFromAuthToken = (): string | null => {
  if (typeof window === 'undefined') return null;
  const token = getAuthToken();
  if (!token) return null;
  try {
    const body = token.split('.')[1];
    if (!body) return null;
    const base64 = body.replace(/-/g, '+').replace(/_/g, '/');
    const json = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    const payload = JSON.parse(json) as { userId?: string; id?: string; sub?: string };
    const id = payload.userId ?? payload.id ?? payload.sub;
    return id != null && String(id).trim() !== '' ? String(id) : null;
  } catch {
    return null;
  }
};

/**
 * Sets the authentication token in localStorage
 */
export const setAuthToken = (token: string): void => {
  localStorage.setItem('authToken', token);
};

/**
 * Checks if user is authenticated (has a token)
 */
export const isAuthenticated = (): boolean => {
  return !!localStorage.getItem('authToken');
};

/**
 * Gets user data from localStorage
 */
export const getUser = (): any | null => {
  const userStr = localStorage.getItem('user');
  if (!userStr) return null;
  try {
    return JSON.parse(userStr);
  } catch {
    return null;
  }
};

/**
 * Sets user data in localStorage
 */
export const setUser = (user: any): void => {
  localStorage.setItem('user', JSON.stringify(user));
};


