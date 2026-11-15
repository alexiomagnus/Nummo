// Time zones the user can pick for the notification hour (Settings → «Fuso orario»). «auto» follows the device; the others are
// IANA names. A short list of the zones most people live in (not all ~400), plus the device's own and any saved choice.
export const autoTimeZone = 'auto';

export const commonTimeZones = [
  'Pacific/Honolulu', 'America/Anchorage', 'America/Los_Angeles', 'America/Vancouver', 'America/Denver', 'America/Mexico_City',
  'America/Chicago', 'America/Bogota', 'America/Lima', 'America/New_York', 'America/Toronto', 'America/Halifax', 'America/Santiago',
  'America/Sao_Paulo', 'America/Argentina/Buenos_Aires', 'Atlantic/Azores', 'UTC', 'Europe/London', 'Europe/Dublin', 'Europe/Lisbon',
  'Europe/Paris', 'Europe/Berlin', 'Europe/Rome', 'Europe/Madrid', 'Europe/Amsterdam', 'Europe/Zurich', 'Africa/Lagos', 'Africa/Johannesburg',
  'Europe/Athens', 'Europe/Helsinki', 'Africa/Cairo', 'Asia/Jerusalem', 'Europe/Istanbul', 'Europe/Moscow', 'Africa/Nairobi', 'Asia/Riyadh',
  'Asia/Tehran', 'Asia/Dubai', 'Asia/Karachi', 'Asia/Kolkata', 'Asia/Dhaka', 'Asia/Bangkok', 'Asia/Jakarta', 'Asia/Singapore',
  'Asia/Shanghai', 'Asia/Hong_Kong', 'Asia/Manila', 'Australia/Perth', 'Asia/Tokyo', 'Asia/Seoul', 'Australia/Sydney', 'Pacific/Auckland',
] as const;

// A usable IANA name (the browser must know it): anything else is not a time zone choice.
export function isTimeZone(value: unknown): value is string {
  if (typeof value !== 'string' || value === '' || value === autoTimeZone) return false;
  try { new Intl.DateTimeFormat('en-GB', { timeZone: value }); return true; } catch { return false; }
}

// «auto» or a valid IANA name; anything else (edited or corrupted storage) is «auto».
export const parseTimeZoneChoice = (value: unknown): string => (isTimeZone(value) ? value : autoTimeZone);

// «London»: the city of an IANA name.
export const timeZoneCity = (zone: string): string => zone.split('/').pop()!.replace(/_/g, ' ');

// «London (GMT+1)»: the city from the IANA name and the zone's offset at that moment (summer time included).
export function timeZoneLabel(zone: string, at: Date = new Date()): string {
  const city = timeZoneCity(zone);
  if (zone === 'UTC') return 'UTC';
  try {
    const offset = new Intl.DateTimeFormat('en-GB', { timeZone: zone, timeZoneName: 'shortOffset' }).formatToParts(at).find((part) => part.type === 'timeZoneName')?.value;
    // Browsers differ on zero («GMT» or «GMT+0»): always «GMT».
    return offset ? `${city} (${offset === 'GMT+0' || offset === 'GMT-0' ? 'GMT' : offset})` : city;
  } catch { return city; }
}

const offsetMinutes = (zone: string, at: Date): number => {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-GB', { timeZone: zone, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit' }).formatToParts(at).map((p) => [p.type, p.value]));
  return (Date.UTC(+parts.year!, +parts.month! - 1, +parts.day!, +parts.hour!, +parts.minute!) - Math.floor(at.getTime() / 60_000) * 60_000) / 60_000;
};

// The choices of the picker, from west to east: the common zones plus `extra` (the device's, the saved one) when missing.
export function timeZoneChoices(extra: readonly string[], at: Date = new Date()): { value: string; label: string }[] {
  const zones = [...new Set([...commonTimeZones, ...extra.filter(isTimeZone)])];
  return zones.map((zone) => ({ value: zone, label: timeZoneLabel(zone, at), offset: offsetMinutes(zone, at) }))
    .sort((a, b) => a.offset - b.offset || a.label.localeCompare(b.label)).map(({ value, label }) => ({ value, label }));
}
