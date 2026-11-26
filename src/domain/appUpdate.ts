// Updates of the Android app (`android/`) from the GitHub Releases of the repository (27 November, on request). Pure rules:
// which releases are valid, which one is newer than the installed app, when the next automatic check is due, and the release
// notes as plain blocks. No backend: the page reads GitHub's public API, the app downloads, verifies and hands the APK to
// Android's installer (services/androidApp.ts, android/…/Updater.kt). Nothing here touches the user's data.

export const updateRepository = 'alexiomagnus/Nummo';
export const releasesApiUrl = `https://api.github.com/repos/${updateRepository}/releases?per_page=20`;
export const releasesPageUrl = `https://github.com/${updateRepository}/releases`;
// Tags of the app's releases: `android-v0.3.6`. Its APK: `nummo-0.3.6.apk`, with `nummo-0.3.6.apk.sha256` beside it.
export const releaseTagPrefix = 'android-v';
const downloadPrefix = `https://github.com/${updateRepository}/releases/download/`;
// At least a day between two automatic checks (GitHub allows 60 unauthenticated requests an hour per address).
export const updateCheckInterval = 24 * 60 * 60 * 1000;
// An APK larger than this is not an APK of Nummo (0.3.5 is 9 MB).
export const maxApkBytes = 100 * 1024 * 1024;
const maxNotes = 20_000;

export type AppRelease = {
  version: string;
  tag: string;
  name: string;
  notes: string;
  publishedAt: string | null;
  pageUrl: string;
  apk: { url: string; size: number; sha256: string | null; sha256Url: string | null };
};

const versionPattern = /^\d{1,4}(\.\d{1,4}){0,3}$/;

export function parseVersion(value: string): number[] | null {
  return versionPattern.test(value) ? value.split('.').map(Number) : null;
}

// Numeric, part by part; a missing part counts as 0 (0.3 = 0.3.0).
export function compareVersions(a: string, b: string): number {
  const left = parseVersion(a) ?? [];
  const right = parseVersion(b) ?? [];
  for (let index = 0; index < Math.max(left.length, right.length); index += 1) {
    const difference = (left[index] ?? 0) - (right[index] ?? 0);
    if (difference !== 0) return Math.sign(difference);
  }
  return 0;
}

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);
const text = (value: unknown): string | null => typeof value === 'string' ? value : null;

// One release of GitHub's API, or null if it is not a published release of the app with its APK. Only addresses of this
// repository's downloads are kept: the app refuses any other (Updater.kt checks again).
export function readRelease(value: unknown): AppRelease | null {
  if (!isRecord(value) || value.draft !== false || value.prerelease !== false) return null;
  const tag = text(value.tag_name);
  if (!tag?.startsWith(releaseTagPrefix)) return null;
  const version = tag.slice(releaseTagPrefix.length);
  if (!parseVersion(version)) return null;
  const assets = Array.isArray(value.assets) ? value.assets.filter(isRecord) : [];
  const apkName = `nummo-${version}.apk`;
  const assetUrl = (asset: Record<string, unknown> | undefined): string | null => {
    const url = text(asset?.browser_download_url);
    return url !== null && url === `${downloadPrefix}${tag}/${String(asset?.name)}` ? url : null;
  };
  const apk = assets.find((asset) => asset.name === apkName);
  const apkUrl = assetUrl(apk);
  const size = apk?.size;
  if (!apk || !apkUrl || typeof size !== 'number' || !Number.isSafeInteger(size) || size <= 0 || size > maxApkBytes) return null;
  const digest = /^sha256:([0-9a-f]{64})$/i.exec(text(apk.digest) ?? '');
  const pageUrl = text(value.html_url);
  const publishedAt = text(value.published_at);
  return {
    version, tag,
    name: (text(value.name) ?? '').trim().slice(0, 200) || `Nummo ${version}`,
    notes: (text(value.body) ?? '').slice(0, maxNotes),
    publishedAt: publishedAt !== null && !Number.isNaN(Date.parse(publishedAt)) ? publishedAt : null,
    pageUrl: pageUrl?.startsWith(`${releasesPageUrl}/`) ? pageUrl : `${releasesPageUrl}/tag/${tag}`,
    apk: {
      url: apkUrl, size,
      sha256: digest?.[1]?.toLowerCase() ?? null,
      sha256Url: assetUrl(assets.find((asset) => asset.name === `${apkName}.sha256`)),
    },
  };
}

// The app's releases, newest version first; anything else in the answer is ignored.
export function readReleases(value: unknown): AppRelease[] {
  if (!Array.isArray(value)) return [];
  return value.map(readRelease).filter((release): release is AppRelease => release !== null)
    .sort((a, b) => compareVersions(b.version, a.version));
}

// The newest release above the installed version, if any.
export function availableUpdate(installed: string, releases: readonly AppRelease[]): AppRelease | null {
  if (!parseVersion(installed)) return null;
  const newest = releases.reduce<AppRelease | null>((best, release) => !best || compareVersions(release.version, best.version) > 0 ? release : best, null);
  return newest && compareVersions(newest.version, installed) > 0 ? newest : null;
}

// An automatic check at most once a day; a time in the future (the clock moved back) does not block the checks for ever.
export function updateCheckDue(lastCheck: number | null, now: number): boolean {
  return lastCheck === null || now < lastCheck || now - lastCheck >= updateCheckInterval;
}

export type UpdateCheckState = { checkedAt: number | null };
export function readUpdateCheckState(raw: string | null): UpdateCheckState {
  try {
    const value: unknown = raw === null ? null : JSON.parse(raw);
    const at = isRecord(value) ? value.checkedAt : null;
    return { checkedAt: typeof at === 'number' && Number.isFinite(at) && at > 0 ? at : null };
  } catch { return { checkedAt: null }; }
}

// The release notes (GitHub Markdown) as blocks the page draws with its own type: headings, bullet and numbered items and
// paragraphs, with **bold** and `code` spans. Links, images and HTML are shown as text: never followed from here.
export type NoteSpan = { text: string; bold?: boolean; code?: boolean };
export type NoteBlock = { kind: 'heading' | 'bullet' | 'number' | 'paragraph'; marker?: string; spans: NoteSpan[] };

export function noteSpans(line: string): NoteSpan[] {
  const spans: NoteSpan[] = [];
  const plain = line.replace(/!?\[([^\]]*)\]\([^)]*\)/g, '$1');
  const pattern = /(\*\*([^*]+)\*\*|`([^`]+)`)/g;
  let last = 0;
  for (let match = pattern.exec(plain); match; match = pattern.exec(plain)) {
    if (match.index > last) spans.push({ text: plain.slice(last, match.index) });
    if (match[2] !== undefined) spans.push({ text: match[2], bold: true });
    else spans.push({ text: match[3] ?? '', code: true });
    last = match.index + match[0].length;
  }
  if (last < plain.length) spans.push({ text: plain.slice(last) });
  return spans.filter((span) => span.text !== '');
}

export function releaseNoteBlocks(markdown: string): NoteBlock[] {
  const blocks: NoteBlock[] = [];
  let paragraph: string[] = [];
  const flush = () => {
    if (paragraph.length > 0) blocks.push({ kind: 'paragraph', spans: noteSpans(paragraph.join(' ')) });
    paragraph = [];
  };
  for (const raw of markdown.replace(/\r\n?/g, '\n').split('\n')) {
    const line = raw.trim();
    const heading = /^#{1,6}\s+(.*)$/.exec(line);
    const bullet = /^[-*+]\s+(.*)$/.exec(line);
    const number = /^(\d{1,3})[.)]\s+(.*)$/.exec(line);
    if (line === '' || /^(-{3,}|\*{3,}|_{3,})$/.test(line)) { flush(); continue; }
    if (heading) { flush(); blocks.push({ kind: 'heading', spans: noteSpans(heading[1] ?? '') }); continue; }
    if (bullet) { flush(); blocks.push({ kind: 'bullet', spans: noteSpans(bullet[1] ?? '') }); continue; }
    if (number) { flush(); blocks.push({ kind: 'number', marker: `${number[1]}.`, spans: noteSpans(number[2] ?? '') }); continue; }
    paragraph.push(line);
  }
  flush();
  return blocks.filter((block) => block.spans.length > 0);
}

// The short «what's new»: at most three items of the first section. That is the items before the first heading or, when there are
// none (the notes often open with an introductory paragraph and then «## Novità»), those under the first heading up to the next one.
export function releaseSummary(blocks: readonly NoteBlock[]): NoteBlock[] {
  const items = (list: readonly NoteBlock[]) => list.filter((block) => block.kind === 'bullet' || block.kind === 'number');
  const firstHeading = blocks.findIndex((block) => block.kind === 'heading');
  const before = firstHeading < 0 ? blocks : blocks.slice(0, firstHeading);
  const after = firstHeading < 0 ? [] : blocks.slice(firstHeading + 1);
  const nextHeading = after.findIndex((block) => block.kind === 'heading');
  const section = items(before).length > 0 ? items(before) : items(nextHeading < 0 ? after : after.slice(0, nextHeading));
  return section.slice(0, 3);
}

// Progress of a download, 0–1; without a known total it stays unknown (null).
export function downloadProgress(received: number, total: number): number | null {
  if (!(total > 0) || !(received >= 0)) return null;
  return Math.min(1, received / total);
}
