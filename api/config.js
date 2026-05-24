// /api/config.js — Safely exposes the Supabase anon key to the client at runtime.
// The anon key is intentionally public (protected by Supabase RLS) but must never
// be hardcoded in client JS source files — serve it here instead.
// NEVER expose DEEPSEEK_API_KEY or SUPABASE_SERVICE_KEY here.

export default function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const supabaseKey = process.env.SUPABASE_ANON_KEY;
  if (!supabaseKey) {
    return res.status(500).json({ error: 'Server misconfigured' });
  }

  // Cache for 5 minutes — key changes rarely
  res.setHeader('Cache-Control', 'public, max-age=300');
  return res.status(200).json({ supabaseKey });
}
