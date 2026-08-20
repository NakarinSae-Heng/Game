// ตารางคะแนนในเครื่อง — เก็บ 10 อันดับสูงสุด

import { CFG } from './config.js';
import * as store from './storage.js';

export function submit(score, level) {
  const entry = { score, level, date: new Date().toISOString().slice(0, 10) };
  const scores = [...store.get('scores'), entry]
    .sort((a, b) => b.score - a.score)
    .slice(0, CFG.leaderboardSize);
  const best = Math.max(store.get('best'), score);
  const rank = scores.findIndex((s) => s === entry);
  store.set({ scores, best });
  return {
    rank: rank < 0 ? null : rank + 1,
    isRecord: score > 0 && score >= best && rank === 0,
    entry,
  };
}

export function top() {
  return store.get('scores');
}

export function best() {
  return store.get('best');
}
