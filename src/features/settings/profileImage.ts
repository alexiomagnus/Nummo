import { profileAvatars, type ProfileAvatarId } from './profileAvatars.ts';
import { accentSwatches, accents, type Accent } from '../../theme/palette.ts';

// Picture of the account button: nothing (Standard: the person glyph; Advanced: the Google photo, or the person glyph
// when there is none), one of the preset avatars, or a photo chosen by the user. Presentation only, kept in this browser
// under `nummo.profile.v1` (Standard) or `nummo.profile.v1.<uid>` (Advanced, one per account, since 22 November): never in
// the archive, in a backup or sent anywhere. Validated at every read.
export const profileImageKey = 'nummo.profile.v1';
// `scope`: `local` for the Standard mode (the key it has used from the start), the UID in the Advanced mode.
export const profileImageKeyFor = (scope: string): string => scope === 'local' ? profileImageKey : `${profileImageKey}.${scope}`;

// Preset pictures: the five abstract avatars of `profileAvatars.ts` (22 November, user's request). They replaced the
// category icons offered the same day (`kind: 'icon'`), which now read as no picture.
export type ProfileImage =
  | { kind: 'none' }
  | { kind: 'avatar'; avatar: ProfileAvatarId }
  // A small square JPEG (`prepareAvatar` in features/receipts/image.ts) as a data URL.
  | { kind: 'photo'; photo: string };

export const noProfileImage: ProfileImage = Object.freeze({ kind: 'none' });

// 192 px JPEG weighs ~10–30 kB as base64; the cap keeps a corrupted or foreign value out of the page and of localStorage.
export const maxPhotoLength = 200_000;
const photoPattern = /^data:image\/(?:jpeg|png|webp);base64,[A-Za-z0-9+/]+={0,2}$/;

export const isPhotoDataUrl = (value: unknown): value is string =>
  typeof value === 'string' && value.length <= maxPhotoLength && photoPattern.test(value);

export function parseProfileImage(raw: string | null): ProfileImage {
  if (!raw) return noProfileImage;
  let value: unknown;
  try { value = JSON.parse(raw); } catch { return noProfileImage; }
  if (typeof value !== 'object' || value === null) return noProfileImage;
  const record = value as Record<string, unknown>;
  if (record.kind === 'avatar' && (profileAvatars as readonly unknown[]).includes(record.avatar)) return { kind: 'avatar', avatar: record.avatar as ProfileAvatarId };
  if (record.kind === 'photo' && isPhotoDataUrl(record.photo)) return { kind: 'photo', photo: record.photo };
  return noProfileImage;
}

export const serializeProfileImage = (image: ProfileImage): string | null => image.kind === 'none' ? null : JSON.stringify(image);

// Colour of the ring around the account picture, Advanced mode only (the ring marks it; user's request, 22 November):
// the app's main colour (default, it follows «Colore») or the main colour of one of the six accents of «Colore», in the
// current light or dark scheme (contrast already tested there). One per account, kept in this browser under
// `nummo.profileRing.v1.<uid>` like the picture: never in the archive or a backup. Validated at every read.
export const profileRingKey = 'nummo.profileRing.v1';
export const profileRingKeyFor = (scope: string): string => `${profileRingKey}.${scope}`;
export type ProfileRing = 'app' | Accent;
export const defaultProfileRing: ProfileRing = 'app';
export const profileRings: readonly ProfileRing[] = ['app', ...accents];

export function parseProfileRing(raw: string | null): ProfileRing {
  return raw !== null && (profileRings as readonly string[]).includes(raw) ? raw as ProfileRing : defaultProfileRing;
}

export const serializeProfileRing = (ring: ProfileRing): string | null => ring === defaultProfileRing ? null : ring;

// `appColor`: the current accent as shown (`accentSwatchColor` of the theme). The ring is decoration, not text: it takes the
// accents' shown colours (accentSwatches), not the darker text-safe primary of the light scheme (23 November).
export function profileRingColor(ring: ProfileRing, appColor: string, dark: boolean): string {
  return ring === 'app' ? appColor : accentSwatches(ring, 'mono', dark)[0]!;
}
