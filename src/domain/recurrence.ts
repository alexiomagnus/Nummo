export const recurrences = ['weekly', 'monthly', 'yearly'] as const;
export type Recurrence = (typeof recurrences)[number];
export const recurrenceLabels: Record<Recurrence, string> = {
  weekly: 'Settimanale', monthly: 'Mensile', yearly: 'Annuale',
};

export function isRecurrence(value: unknown): value is Recurrence {
  return typeof value === 'string' && (recurrences as readonly string[]).includes(value);
}

// Safety net against corrupted dates: ~19 years of weekly occurrences.
const maxOccurrences = 1000;

function daysInMonth(year: number, monthIndex: number): number {
  return new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
}
function iso(date: Date): string {
  return date.toISOString().slice(0, 10);
}

// Calendar dates (YYYY-MM-DD) from `start` to `until` inclusive. Monthly and yearly
// series keep the start day, clamped to shorter months (31 → 30/28, 29 Feb → 28 Feb).
export function occurrenceDates(start: string, recurrence: Recurrence, until: string): string[] {
  const [year, month, day] = start.split('-').map(Number) as [number, number, number];
  const dates: string[] = [];
  for (let n = 0; n < maxOccurrences; n++) {
    let date: Date;
    if (recurrence === 'weekly') {
      date = new Date(Date.UTC(year, month - 1, day + 7 * n));
    } else {
      const totalMonths = (month - 1) + (recurrence === 'monthly' ? n : 12 * n);
      const y = year + Math.floor(totalMonths / 12);
      const m = totalMonths % 12;
      date = new Date(Date.UTC(y, m, Math.min(day, daysInMonth(y, m))));
    }
    const value = iso(date);
    if (value > until) break;
    dates.push(value);
  }
  return dates;
}
