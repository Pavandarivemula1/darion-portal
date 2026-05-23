// /api/chat.js — Gemini assistant + Supabase logging
import { supabaseAnon } from '../lib/supabase.js';

const SUPABASE_URL = 'https://tigxrqqykijkofgntway.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY || 'sb_publishable_bty_r-Qe2gdS7k5KXIAOGw_DRtyaEJ8';

const PROJECT_CONTEXT = `You are the project assistant for DARION-BPO-2026-001 — an Omnichannel BPO Platform delivery project by Darion Technologies.
Project facts:
- 8-month fixed-price engagement, total value ₹28 lakhs
- 7 phases: DISC (M1, done 100%), CORE (M2, 68% in progress), CRM (M3), ACD (M4), WFM (M5-M6), BI (M7), SHIP (M8)
- Current active phase: CORE — Platform Foundation, Access Control & DevOps Base
- Authentication stable, RBAC & tenant isolation in progress, CI/CD pending
- Pending client action: Review and approve access roles for RBAC
- 7 milestone payment gates, advance 20% (₹5.6L), then 15%/15%/15%/15%/10%/10%
- Contact: support@darion.in
Answer only questions related to this project. Be concise (max 3 sentences). If you cannot answer confidently, say "I'll need to check with the Darion team on that."`;

const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

const reqLog = new Map();
function isRateLimited(ip) {
  const now = Date.now(), window = 3600000, key = ip || 'anon';
  if (!reqLog.has(key)) reqLog.set(key, []);
  const times = reqLog.get(key).filter(t => now - t < window);
  if (times.length >= 30) return true;
  times.push(now); reqLog.set(key, times); return false;
}

// Supabase REST helper (no SDK needed for simple inserts)
async function sbInsert(table, row) {
  try {
    await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify(row)
    });
  } catch(e) { /* non-critical, don't fail the request */ }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const ip = req.headers['x-forwarded-for'] || req.socket?.remoteAddress;
  if (isRateLimited(ip)) return res.status(429).json({ error: 'Too many requests' });

  const { question, session_id } = req.body || {};
  if (!question || typeof question !== 'string' || question.trim().length < 2)
    return res.status(400).json({ error: 'Invalid question' });

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'AI not configured' });

  // Log user message to Supabase (fire-and-forget)
  if (session_id) {
    sbInsert('chat_messages', {
      session_id, role: 'user', content: question.slice(0, 1000), gemini_used: false
    });
  }

  try {
    const gemRes = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          { role: 'user', parts: [{ text: PROJECT_CONTEXT }] },
          { role: 'model', parts: [{ text: 'Understood. Ready to assist with DARION-BPO-2026-001.' }] },
          { role: 'user', parts: [{ text: question.slice(0, 500) }] }
        ],
        generationConfig: { maxOutputTokens: 300, temperature: 0.3 }
      })
    });

    if (!gemRes.ok) return res.status(502).json({ error: 'AI unavailable' });

    const data = await gemRes.json();
    const answer = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!answer) return res.status(502).json({ error: 'No answer' });

    // Log AI reply to Supabase
    if (session_id) {
      sbInsert('chat_messages', {
        session_id, role: 'ai', content: answer.trim(), gemini_used: true
      });
    }

    return res.status(200).json({ answer: answer.trim() });
  } catch (err) {
    console.error('Gemini error:', err);
    return res.status(500).json({ error: 'Internal error' });
  }
}
