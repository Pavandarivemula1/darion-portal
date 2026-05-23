const fs = require('fs');
const raw = JSON.parse(fs.readFileSync('db_phases.json', 'utf8'));
const PHASES = raw.map(p => ({
      id:           p.id,
      code:         p.code,
      month:        p.month,
      title:        p.title,
      status:       p.status,
      progress:     p.progress
}));
function esc(str) {
  return String(str).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
function progressBar(pct, green) {
  return `<div class="progress-track"><div class="progress-fill${green ? ' green' : ''}" style="width:${pct}%"></div></div>`;
}
const activePhaseId = 1;
const html = PHASES.map(phase => `
    <button
      class="phase-btn${phase.id === activePhaseId ? " active" : ""}"
      data-phase-id="${phase.id}"
      role="tab"
      aria-selected="${phase.id === activePhaseId}"
      aria-label="${esc(phase.title)}"
    >
      <div class="phase-btn-top">
        <div>
          <p class="phase-btn-meta">${esc(phase.month)} · ${esc(phase.code)}</p>
          <p class="phase-btn-title">${esc(phase.title)}</p>
        </div>
        <span class="phase-btn-pct">${phase.progress}%</span>
      </div>
      <div class="phase-btn-bar">${progressBar(phase.progress, phase.status === "Completed")}</div>
    </button>
  `).join("");
console.log(html);
