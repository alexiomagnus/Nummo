// Google Drive backup of the «Standard» mode (pure rules, no SDK or network). Drive is only a place to keep copies of
// the device archive: the same versioned JSON as a manual export (backup.ts), restored only on request and only whole.
// Nothing here synchronises, merges or resolves conflicts between devices.
import { parseBackup, type ImportData } from './backup.ts';
import { isUtcTimestamp } from './contract.ts';

export const backupFrequencies = ['daily', 'weekly', 'monthly'] as const;
export type BackupFrequency = (typeof backupFrequencies)[number];
export const frequencyLabels: Record<BackupFrequency, string> = { daily: 'Ogni giorno', weekly: 'Ogni settimana', monthly: 'Ogni mese' };
const day = 24 * 60 * 60 * 1000;
const frequencyMs: Record<BackupFrequency, number> = { daily: day, weekly: 7 * day, monthly: 30 * day };

// Choices kept in this browser (`nummo.driveBackup.v1`): never a token, an address or any expense data.
// `connected` is only the user's intent to use Drive: access itself is asked again when it has expired.
export type DriveSettings = Readonly<{ connected: boolean; auto: boolean; frequency: BackupFrequency; lastBackupAt: string | null }>;
export const driveSettingsKey = 'nummo.driveBackup.v1';
export const defaultDriveSettings: DriveSettings = { connected: false, auto: false, frequency: 'weekly', lastBackupAt: null };

// Untrusted input (localStorage can be edited or corrupted): every field falls back on its own.
export function parseDriveSettings(raw: string | null): DriveSettings {
  let data: unknown;
  try { data = raw ? JSON.parse(raw) : null; } catch { data = null; }
  const o = typeof data === 'object' && data !== null ? data as Record<string, unknown> : {};
  return {
    connected: o.connected === true,
    auto: o.auto === true,
    frequency: (backupFrequencies as readonly unknown[]).includes(o.frequency) ? o.frequency as BackupFrequency : defaultDriveSettings.frequency,
    lastBackupAt: isUtcTimestamp(o.lastBackupAt) ? o.lastBackupAt : null,
  };
}

// An automatic backup is due when Drive is linked, the option is on, the archive holds something and has changed since
// the last successful backup, and the chosen interval has passed. An empty archive is never uploaded on its own: a new
// or cleared device must not push an empty copy over the real backups.
export function autoBackupDue(input: { settings: DriveSettings; lastChange: string | null; empty: boolean; now: Date }): boolean {
  const { settings, lastChange, empty, now } = input;
  if (!settings.connected || !settings.auto || empty || !lastChange) return false;
  if (!settings.lastBackupAt) return true;
  const last = Date.parse(settings.lastBackupAt);
  return Date.parse(lastChange) > last && now.getTime() - last >= frequencyMs[settings.frequency];
}

// One file per backup, so a bad copy never overwrites a good one. The newest `keptBackups` are kept.
export const keptBackups = 5;
const filePattern = /^nummo-backup-\d{8}T\d{6}Z\.json$/;
export const backupFileName = (now: Date): string => `nummo-backup-${now.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z')}.json`;
export const isBackupFileName = (name: unknown): name is string => typeof name === 'string' && filePattern.test(name);

export type DriveFile = Readonly<{ id: string; name: string; createdTime: string; size: number }>;
export const newestFirst = (files: readonly DriveFile[]): DriveFile[] => [...files].sort((a, b) => b.createdTime.localeCompare(a.createdTime) || b.name.localeCompare(a.name));
// Backups beyond the newest `keep`, to delete after a successful upload.
export const backupsToPrune = (files: readonly DriveFile[], keep = keptBackups): DriveFile[] => newestFirst(files).slice(keep);

export const isEmptyArchive = (data: { expenses: readonly unknown[]; categories: readonly unknown[]; funds: readonly unknown[]; movements: readonly unknown[]; lists: readonly unknown[]; budget?: readonly unknown[] }): boolean =>
  data.expenses.length + data.categories.length + data.funds.length + data.movements.length + data.lists.length + (data.budget?.length ?? 0) === 0;

// What the restore confirmation shows. The whole file is validated first (format, version, every record): an
// incompatible or damaged backup is refused here, before anything on the device is touched.
export type BackupSummary = Readonly<{ exportedAt: string | null; version: number; expenses: number; categories: number; funds: number; movements: number; lists: number; data: ImportData }>;
export const maxBackupBytes = 5_000_000;
export function readBackup(text: string): BackupSummary {
  if (text.length > maxBackupBytes) throw new Error('File troppo grande (massimo 5 MB).');
  let json: unknown;
  try { json = JSON.parse(text); } catch { throw new Error('Il file non è un backup JSON valido.'); }
  const data = parseBackup(json);
  const file = json as { exported_at?: unknown; version: number };
  return { exportedAt: isUtcTimestamp(file.exported_at) ? file.exported_at : null, version: file.version, expenses: data.expenses.length, categories: data.categories.length,
    funds: data.funds.length, movements: data.movements.length, lists: data.lists.length, data };
}
