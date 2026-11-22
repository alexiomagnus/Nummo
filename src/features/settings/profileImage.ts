import type { CategoryIcon } from '../../domain/category.ts';

// Picture of the account button in the Standard mode (no Google account, hence no Google photo): nothing (the person
// glyph), one of the preset icons, or a photo chosen by the user. Presentation only, kept in this browser under
// `nummo.profile.v1`: never in the archive, in a backup or sent anywhere. Validated at every read.
export const profileImageKey = 'nummo.profile.v1';

// Preset icons: category drawings, so they follow the chosen icon style (minimal, colourful, pixel). Only active icons
// with all three drawings (`tests/profileImage.test.ts`).
export const avatarIcons = ['paw', 'coffee', 'gamepad', 'music', 'cake', 'camera', 'sparkles', 'piggy', 'cloud', 'bike', 'laptop', 'film'] as const satisfies readonly CategoryIcon[];
export type AvatarIcon = (typeof avatarIcons)[number];

export type ProfileImage =
  | { kind: 'none' }
  | { kind: 'icon'; icon: AvatarIcon }
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
  if (record.kind === 'icon' && (avatarIcons as readonly unknown[]).includes(record.icon)) return { kind: 'icon', icon: record.icon as AvatarIcon };
  if (record.kind === 'photo' && isPhotoDataUrl(record.photo)) return { kind: 'photo', photo: record.photo };
  return noProfileImage;
}

export const serializeProfileImage = (image: ProfileImage): string | null => image.kind === 'none' ? null : JSON.stringify(image);
