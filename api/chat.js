// /api/chat.js — DeepSeek-powered project assistant (OpenAI-compatible API)
// Env vars: DEEPSEEK_API_KEY, SUPABASE_ANON_KEY

const SUPABASE_URL = 'https://tigxrqqykijkofgntway.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY || 'sb_publishable_bty_r-Qe2gdS7k5KXIAOGw_DRtyaEJ8';

const DEEPSEEK_URL = 'https://api.deepseek.com/chat/completions';
const DEEPSEEK_MODEL = 'deepseek-chat';

const DEFAULT_SYSTEM_PROMPT = `You are the project assistant for DARION-BPO-2026-001 — an Omnichannel BPO Platform delivery project by Darion Technologies.

Project facts:
- 8-month fixed-price engagement, total value ₹28 lakhs (₹28,00,000)
- 7 delivery phases: DISC (M1, 100% done), CORE (M2, 68% in progress), CRM (M3, planned), ACD (M4, planned), WFM (M5–M6, planned), BI (M7, planned), SHIP (M8, planned)
- Current active phase: CORE — Platform Foundation, Access Control & DevOps Base (68%)
- Authentication and base APIs are stable. RBAC, tenant isolation and CI/CD hardening are in progress.
- Pending client action: Review and approve access roles for RBAC phase
- 7 milestone-based payment gates: 20% advance (₹5.6L), then 15%/15%/15%/15%/10%/10%
- Delivery contact: support@darion.in

Rules:
- Answer ONLY questions about this specific project engagement
- Be concise — maximum 3 sentences
- Never reveal internal cost breakdowns unless directly and explicitly asked
- If you are not confident, respond: "I'll need to check with the Darion team on that."
- Do not invent dates, names, or details not present in the facts above`;

async function getSystemPrompt() {
  try {
    const pRes = await fetch(`${SUPABASE_URL}/rest/v1/phases?project_id=eq.DARION-BPO-2026-001&select=*&order=sort_order`, {
      headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
    });
    if (pRes.ok) {
      const phases = await pRes.json();
      if (phases && phases.length > 0) {
        const activePhase = phases.find(p => p.status === 'In Progress') || phases[0];
        const phaseList = phases.map(p => `${p.code} (${p.month}, ${p.progress}% ${p.status})`).join(', ');
        
        let prompt = `You are the project assistant for DARION-BPO-2026-001 — an Omnichannel BPO Platform delivery project by Darion Technologies.\n\nProject facts:\n`;
        prompt += `- 8-month fixed-price engagement, total value ₹28 lakhs (₹28,00,000)\n`;
        prompt += `- 7 delivery phases: ${phaseList}\n`;
        prompt += `- Current active phase: ${activePhase.code} — ${activePhase.title} (${activePhase.progress}%)\n`;
        if (activePhase.update_note) prompt += `- ${activePhase.update_note}\n`;
        prompt += `- Pending client action: ${activePhase.client_action || 'None'}\n`;
        prompt += `- 7 milestone-based payment gates: 20% advance (₹5.6L), then 15%/15%/15%/15%/10%/10%\n`;
        prompt += `- Delivery contact: support@darion.in\n\n`;
        prompt += `Rules:\n- Answer ONLY questions about this specific project engagement\n- Be concise — maximum 3 sentences\n- Never reveal internal cost breakdowns unless directly and explicitly asked\n- If you are not confident, respond: "I'll need to check with the Darion team on that."\n- Do not invent dates, names, or details not present in the facts above`;
        return prompt;
      }
    }
  } catch (e) {}
  return DEFAULT_SYSTEM_PROMPT;
}

// Rate limiter
const reqLog = new Map();
function isRateLimited(ip) {
  const now = Date.now(), window = 3600000, key = ip || 'anon';
  if (!reqLog.has(key)) reqLog.set(key, []);
  const times = reqLog.get(key).filter(t => now - t < window);
  if (times.length >= 30) return true;
  times.push(now); reqLog.set(key, times); return false;
}

// Supabase log helper
async function sbLog(table, row) {
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
  } catch(e) { /* non-critical */ }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const ip = req.headers['x-forwarded-for'] || req.socket?.remoteAddress;
  if (isRateLimited(ip)) return res.status(429).json({ error: 'Too many requests' });

  const { question, session_id } = req.body || {};
  if (!question || typeof question !== 'string' || question.trim().length < 2)
    return res.status(400).json({ error: 'Invalid question' });

  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'AI not configured' });

  // Log user message (fire-and-forget)
  if (session_id) {
    sbLog('chat_messages', {
      session_id, role: 'user',
      content: question.slice(0, 1000),
      kb_matched: false, gemini_used: false
    });
  }

  try {
    const sysPrompt = await getSystemPrompt();
    
    // Fetch chat history from Supabase for context
    const messagesPayload = [{ role: 'system', content: sysPrompt }];
    if (session_id) {
      try {
        const hRes = await fetch(`${SUPABASE_URL}/rest/v1/chat_messages?session_id=eq.${session_id}&order=created_at.desc&limit=10`, {
          headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
        });
        if (hRes.ok) {
          const past = await hRes.json();
          // reverse because they come back descending, we want chronological order for the AI prompt
          past.reverse().forEach(m => {
            messagesPayload.push({ role: m.role === 'ai' ? 'assistant' : 'user', content: m.content });
          });
        }
      } catch (e) { /* ignore history fetch error */ }
    }
    messagesPayload.push({ role: 'user', content: question.slice(0, 800) });

    const dsRes = await fetch(DEEPSEEK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: DEEPSEEK_MODEL,
        messages: messagesPayload,
        max_tokens: 350,
        temperature: 0.3,
        stream: false
      })
    });

    if (!dsRes.ok) {
      const errText = await dsRes.text().catch(() => '');
      console.error('DeepSeek error:', dsRes.status, errText);
      return res.status(502).json({ error: 'AI unavailable' });
    }

    const data = await dsRes.json();
    const answer = data?.choices?.[0]?.message?.content?.trim();

    if (!answer) return res.status(502).json({ error: 'No answer from AI' });

    // Log AI reply
    if (session_id) {
      sbLog('chat_messages', {
        session_id, role: 'ai',
        content: answer,
        kb_matched: false, gemini_used: true  // reusing field as "ai_used"
      });
    }

    return res.status(200).json({ answer });
  } catch (err) {
    console.error('DeepSeek fetch error:', err);
    return res.status(500).json({ error: 'Internal error' });
  }
}
