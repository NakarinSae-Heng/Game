// อัปเดตแถบสถานะที่เป็น DOM (ตัวหนังสือคมกว่าวาดใน canvas และไม่กินเวลาเฟรม)

const el = {};

export function initHud() {
  el.score = document.getElementById('hud-score');
  el.level = document.getElementById('hud-level');
  el.best = document.getElementById('hud-best');
  el.lives = document.getElementById('hud-lives');
  el.powerups = document.getElementById('hud-powerups');
  el.toast = document.getElementById('toast');
  el.hint = document.getElementById('swipe-hint');
}

let lastScore = -1;
let lastLevel = -1;
let lastLives = -1;
let lastChips = '';

export function updateHud(game, best) {
  if (game.score !== lastScore) {
    lastScore = game.score;
    el.score.textContent = game.score.toLocaleString('th-TH');
  }
  if (game.level !== lastLevel) {
    lastLevel = game.level;
    el.level.textContent = game.level;
  }
  el.best.textContent = Math.max(best, game.score).toLocaleString('th-TH');

  if (game.lives !== lastLives) {
    lastLives = game.lives;
    el.lives.innerHTML = '';
    for (let i = 0; i < Math.max(0, game.lives - 1); i++) {
      const d = document.createElement('i');
      d.className = 'life';
      el.lives.appendChild(d);
    }
  }

  const chips = game.powerups.chips();
  const sig = chips.map((c) => `${c.def.id}:${Math.ceil(c.left * 5)}`).join(',');
  if (sig !== lastChips) {
    lastChips = sig;
    el.powerups.innerHTML = chips
      .map((c) => `
        <span class="pu-chip${c.permanent ? ' perm' : ''}">
          <span class="pu-icon">${c.def.icon}</span>${c.def.label}
          <i class="pu-bar" style="width:${Math.round(c.frac * 100)}%"></i>
        </span>`)
      .join('');
  }
}

let toastTimer = 0;

export function toast(text, kind = '') {
  el.toast.textContent = text;
  el.toast.className = `toast ${kind}`;
  el.toast.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    el.toast.hidden = true;
  }, 1600);
}

export function hideHint() {
  el.hint?.classList.add('hidden');
}

export function resetHudCache() {
  lastScore = -1;
  lastLevel = -1;
  lastLives = -1;
  lastChips = '';
}
