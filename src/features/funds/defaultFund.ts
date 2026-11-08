// Default fund of the «Nuova spesa» form, remembered per account in this browser (an identifier, never expense data).
// A fund that no longer exists or is archived is simply ignored.
export const defaultFundKey = (uid: string) => `nummo.defaultFund.v1.${uid}`;

export function readDefaultFund(uid: string): string {
  try {
    const value = localStorage.getItem(defaultFundKey(uid));
    return value && /^[0-9a-f-]{36}$/.test(value) ? value : '';
  } catch { return ''; }
}

export function writeDefaultFund(uid: string, id: string): void {
  try {
    if (id) localStorage.setItem(defaultFundKey(uid), id);
    else localStorage.removeItem(defaultFundKey(uid));
  } catch { /* storage denied: the choice lasts for the session */ }
}
