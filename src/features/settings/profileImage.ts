import { profileAvatars, type ProfileAvatarId } from './profileAvatars.ts';

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

// The ring around the account picture (Advanced mode only) is always the app's colour (`accentSwatchColor` of the theme): the
// choice of another colour (22 November) went on 27 November, on request. A value saved under `nummo.profileRing.v1.<uid>` is ignored.
