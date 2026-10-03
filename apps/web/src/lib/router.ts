/** Centralized route paths so pages, links and guards never hardcode strings. */
export const ROUTES = {
  home: '/',
  users: '/users',
  login: '/login',
  register: '/register',
  verifyEmail: '/verify-email',
  forgotPassword: '/forgot-password',
  resetPassword: '/reset-password',
  accountSecurity: '/account/security',
} as const;
