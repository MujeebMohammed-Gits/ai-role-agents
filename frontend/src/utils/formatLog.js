export function formatTime(ts) {
  if (ts == null) return '';
  let ms;
  if (typeof ts === 'number') {
    ms = ts < 1e12 ? ts * 1000 : ts;
  } else {
    const s = typeof ts === 'string' && !/[Zz]|[+-]\d{2}:?\d{2}$/.test(ts.trim())
      ? ts.trim() + 'Z'
      : ts;
    ms = Date.parse(s);
  }
  const d = new Date(ms);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export function formatLog(entry) {
  return {
    ...entry,
    time: formatTime(entry.ts),
  };
}

export const LEVEL_COLORS = {
  info: 'text-brand-500',
  warn: 'text-amber-500',
  error: 'text-rose-500',
  success: 'text-emerald-500',
};
