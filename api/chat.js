// /api/chat.js — Gemini-powered project assistant
// Env var required: GEMINI_API_KEY

const PROJECT_CONTEXT = `
You are the project assistant for DARION-BPO-2026-001 — an Omnichannel BPO Platform delivery project by Darion Technologies.

Project facts:
- 8-month fixed-price engagement, total value ₹28 lakhs
- 7 delivery phases: DISC (M1, done), CORE (M2, 68% in progress), CRM (M3), ACD (M4), WFM (M5-M6), BI (M7), SHIP (M8)
- Current active phase: CORE — Platform Foundation, Access Control & DevOps Base
- Current status: Authentication stable, RBAC & tenant isolation in progress, CI/CD pending
- Pending client action: Review and approve access roles for RBAC
- Payment: 7 milestone gates, advance 20% (₹5.6L), then 15%/15%/15%/15%/10%/10%
- Contact: support@darion.in

Answer only questions related to this project. Be concise (max 3 sentences). Do not reveal internal pricing unless directly asked. Do not make up dates or details not in this context. If you cannot answer confidently, say "I'll need to check with the Darion team on that."
`;

const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent`;

// Simple in-memory rate limiter (resets per function invocation on Vercel — good enough)
const reqLog = new Map();
function isRateLimited(ip) {
  const now = Date.now();
  const window = 60 * 60 * 1000; // 1 hour
  const key = ip || 'anon';
  if (!reqLog.has(key)) reqLog.set(key, []);
  const times = reqLog.get(key).filter(t => now - t < window);
  if (times.length >= 30) return true;
  times.push(now);
  reqLog.set(key, times);
  return false;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const ip = req.headers['x-forwarded-for'] || req.socket?.remoteAddress;
  if (isRateLimited(ip)) return res.status(429).json({ error: 'Too many requests' });

  const { question } = req.body || {};
  if (!question || typeof question !== 'string' || question.trim().length < 2) {
    return res.status(400).json({ error: 'Invalid question' });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'AI not configured' });

  try {
    const gemRes = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          { role: 'user', parts: [{ text: PROJECT_CONTEXT }] },
          { role: 'model', parts: [{ text: 'Understood. I am ready to assist with DARION-BPO-2026-001 queries.' }] },
          { role: 'user', parts: [{ text: question.slice(0, 500) }] }
        ],
        generationConfig: { maxOutputTokens: 300, temperature: 0.3 }
      })
    });

    if (!gemRes.ok) return res.status(502).json({ error: 'AI unavailable' });

    const data = await gemRes.json();
    const answer = data?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!answer) return res.status(502).json({ error: 'No answer' });
    return res.status(200).json({ answer: answer.trim() });
  } catch (err) {
    console.error('Gemini error:', err);
    return res.status(500).json({ error: 'Internal error' });
  }
}
