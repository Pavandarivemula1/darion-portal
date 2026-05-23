// /api/contact.js — Email escalation to support@darion.in
// Env vars required: MAIL_USER, MAIL_PASS (Gmail App Password)

import nodemailer from 'nodemailer';

const reqLog = new Map();
function isRateLimited(ip) {
  const now = Date.now();
  const window = 60 * 60 * 1000; // 1 hour
  const key = ip || 'anon';
  if (!reqLog.has(key)) reqLog.set(key, []);
  const times = reqLog.get(key).filter(t => now - t < window);
  if (times.length >= 3) return true; // max 3 emails per IP per hour
  times.push(now);
  reqLog.set(key, times);
  return false;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const ip = req.headers['x-forwarded-for'] || req.socket?.remoteAddress;
  if (isRateLimited(ip)) {
    return res.status(429).json({ error: 'Too many requests. Please email support@darion.in directly.' });
  }

  const { question, ref } = req.body || {};
  if (!question || typeof question !== 'string' || question.trim().length < 3) {
    return res.status(400).json({ error: 'Invalid request' });
  }

  const { MAIL_USER, MAIL_PASS } = process.env;
  if (!MAIL_USER || !MAIL_PASS) {
    return res.status(500).json({ error: 'Mail not configured' });
  }

  try {
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: { user: MAIL_USER, pass: MAIL_PASS }
    });

    const subject = `[BPO Portal Query] ${question.slice(0, 70)}${question.length > 70 ? '…' : ''}`;
    const ts = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });

    await transporter.sendMail({
      from: `"Darion Portal" <${MAIL_USER}>`,
      to: 'support@darion.in',
      replyTo: MAIL_USER,
      subject,
      html: `
        <div style="font-family:'IBM Plex Sans',Arial,sans-serif;max-width:560px;color:#161616">
          <div style="background:#161616;padding:16px 24px;margin-bottom:24px">
            <span style="font-size:16px;font-weight:600;color:#fff">DARION<span style="color:#78a9ff">OS</span></span>
          </div>
          <h2 style="font-size:18px;font-weight:400;margin-bottom:8px">New portal query</h2>
          <table style="width:100%;border-collapse:collapse;font-size:13px;margin-bottom:20px">
            <tr>
              <td style="padding:8px 12px;background:#f4f4f4;border:1px solid #e0e0e0;font-weight:600;width:30%">Project ref</td>
              <td style="padding:8px 12px;border:1px solid #e0e0e0">${ref || 'DARION-BPO-2026-001'}</td>
            </tr>
            <tr>
              <td style="padding:8px 12px;background:#f4f4f4;border:1px solid #e0e0e0;font-weight:600">Received</td>
              <td style="padding:8px 12px;border:1px solid #e0e0e0">${ts} IST</td>
            </tr>
            <tr>
              <td style="padding:8px 12px;background:#f4f4f4;border:1px solid #e0e0e0;font-weight:600">Channel</td>
              <td style="padding:8px 12px;border:1px solid #e0e0e0">Client portal chat</td>
            </tr>
          </table>
          <div style="background:#edf5ff;border-left:4px solid #0f62fe;padding:16px 20px;margin-bottom:24px">
            <p style="margin:0;font-size:14px;font-weight:600;color:#0043ce;margin-bottom:8px">Client question</p>
            <p style="margin:0;font-size:14px;color:#161616;line-height:1.6">${question.replace(/</g,'&lt;').replace(/>/g,'&gt;')}</p>
          </div>
          <p style="font-size:12px;color:#6f6f6f">Please respond to the client within 1 business day. This message was auto-generated from the BPO portal chat assistant.</p>
          <div style="border-top:1px solid #e0e0e0;margin-top:24px;padding-top:16px">
            <p style="font-size:11px;color:#6f6f6f;margin:0">Darion Technologies · DARION-BPO-2026-001</p>
          </div>
        </div>
      `
    });

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('Mail error:', err);
    return res.status(500).json({ error: 'Failed to send email' });
  }
}
