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


