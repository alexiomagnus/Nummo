// How a whole hour is written for the user (the clock format is a display preference; nothing stored depends on it).
export const timeFormats = ['24h', '12h'] as const;
export type TimeFormat = (typeof timeFormats)[number];

// 24h: «9:00», «21:00». 12h: «9:00 AM», «12:00 PM», «9:00 PM» (midnight is «12:00 AM»).
export function formatHour(hour: number, format: TimeFormat): string {
  if (format === '24h') return `${hour}:00`;
  const suffix = hour < 12 ? 'AM' : 'PM';
  return `${hour % 12 === 0 ? 12 : hour % 12}:00 ${suffix}`;
}
