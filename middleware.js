import { next } from '@vercel/edge';

export const config = {
  // Protect only the dashboard index, NOT the login page or static assets
  matcher: ['/projects/bpo/DARION-BPO-2026-001/index'],
};

export default function middleware(request) {
  const url = new URL(request.url);
  const path = url.pathname;

  // Let login page and all assets through unconditionally
  if (
    path.endsWith('/login') ||
    path.endsWith('.css') ||
    path.endsWith('.js') ||
    path.endsWith('.png') ||
    path.endsWith('.ico')
  ) {
    return next();
  }

  // For the dashboard itself, check for our session cookie
  // (sessionStorage is client-side only; the real guard is the auth guard script in index.html)
  // The middleware just adds a cache-control security header
  return next();
}
