import { next } from '@vercel/edge';

export const config = {
  // Apply this middleware to the projects directory and everything under it
  matcher: '/projects/:path*',
};

export default function middleware(request) {
  const authorization = request.headers.get('authorization');

  if (authorization) {
    const authValue = authorization.split(' ')[1];
    
    try {
      // Decode the base64 auth string (user:pass)
      const decoded = atob(authValue);
      const [user, pwd] = decoded.split(':');

      const expectedUser = 'darion';
      const expectedPwd = process.env.CLIENT_PASSWORD || 'client2026';

      if (user === expectedUser && pwd === expectedPwd) {
        // Authentication successful, proceed to the requested route
        return next();
      }
    } catch (e) {
      console.error('Auth decoding failed', e);
    }
  }

  // Authentication failed or missing, prompt for credentials
  return new Response('Authentication Required', {
    status: 401,
    headers: {
      'WWW-Authenticate': 'Basic realm="Darion Secure Delivery Portal"',
    },
  });
}
