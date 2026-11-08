type ProfilePhotos = {
  photoURL: string | null;
  providerData: readonly { providerId: string; photoURL: string | null }[];
};

// Prefer the Google profile over a potentially older Firebase profile image.
// Empty strings must not mask the other available source.
export function profilePhotoURL(user: ProfilePhotos): string | null {
  const google = user.providerData.find((profile) => profile.providerId === 'google.com');
  return google?.photoURL?.trim() || user.photoURL?.trim() || null;
}
