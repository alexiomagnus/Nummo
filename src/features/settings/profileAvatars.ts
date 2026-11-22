import { iconRamp, type IconHue } from '../../theme/iconPalette.ts';

// The five abstract profile pictures of the Standard mode (user's request, 22 November): drawn for Nummo only, not
// category icons; «Moduli» and «Prisma» redrawn the same day as «Girandola» and «Pietre» (a face, «Sorriso», and «Onde» tried and dropped). Pure: the SVG markup is built here from the shared icon palette (`theme/iconPalette.ts`), so the
// colours come from the design system and follow the light and dark theme. Square 100×100 with a full background;
// the shapes stay within ~36 of the centre, so they read whole in the round button and at 32–48 px.
//
// Roles per theme, from one hue of the palette: light = pale tint background, strong base shape, dark ink accent;
// dark = deep ink background, bright base shape, pale tint accent. Adjacent shapes of base and accent never touch
// (gaps or the background between them), so they stay apart even where the two are close in lightness.
export const profileAvatars = ['orbits', 'drop', 'arch', 'pinwheel', 'stones'] as const;
export type ProfileAvatarId = (typeof profileAvatars)[number];

type Roles = { bg: string; main: string; accent: string };
type AvatarSpec = { label: string; hue: IconHue; draw: (c: Roles) => string };

const specs: Record<ProfileAvatarId, AvatarSpec> = {
  // Two overlapping circles on a diagonal; their shared lens is cut out to the background.
  orbits: {
    label: 'Orbite', hue: 'violet',
    draw: (c) => `<defs><clipPath id="b"><circle cx="58" cy="44" r="19"/></clipPath></defs>`
      + `<circle cx="42" cy="56" r="19" fill="${c.main}"/><circle cx="58" cy="44" r="19" fill="${c.accent}"/>`
      + `<circle cx="42" cy="56" r="19" fill="${c.bg}" clip-path="url(#b)"/>`,
  },
  // A drop with one sharp corner and a small satellite flying off its point.
  drop: {
    label: 'Goccia', hue: 'teal',
    draw: (c) => `<path d="M41.5 40.5H59.5V58.5A18 18 0 0 1 41.5 76.5A18 18 0 0 1 23.5 58.5A18 18 0 0 1 41.5 40.5Z" fill="${c.main}"/>`
      + `<circle cx="69.5" cy="30.5" r="7" fill="${c.accent}"/>`,
  },
  // Two nested arches over a bar: the arch of the Nummo logo, taken apart.
  arch: {
    label: 'Arco', hue: 'orange',
    draw: (c) => `<g fill="none" stroke-width="8" stroke-linecap="round">`
      + `<path d="M26 55A24 24 0 0 1 74 55" stroke="${c.main}"/><path d="M38 55A12 12 0 0 1 62 55" stroke="${c.accent}"/>`
      + `<path d="M34 69H66" stroke="${c.main}"/></g>`,
  },
  // Four half-discs turning around the centre, alternating base and accent, apart by a small gap.
  pinwheel: {
    label: 'Girandola', hue: 'blue',
    draw: (c) => [0, 90, 180, 270].map((angle, index) =>
      `<path d="M48 48V20A14 14 0 0 0 48 48Z" fill="${index % 2 ? c.accent : c.main}" transform="rotate(${angle} 50 50)"/>`).join(''),
  },
  // Three pebbles balanced on each other, narrower towards the top, slightly tilted, apart by small gaps.
  stones: {
    label: 'Pietre', hue: 'pink',
    draw: (c) => `<ellipse cx="50" cy="66" rx="22" ry="9" fill="${c.main}"/>`
      + `<ellipse cx="48" cy="47" rx="15" ry="7" fill="${c.accent}" transform="rotate(-6 48 47)"/>`
      + `<ellipse cx="53" cy="31" rx="9" ry="6" fill="${c.main}" transform="rotate(8 53 31)"/>`,
  },
};

// Source (Italian) names, translated at the UI boundary (`tests/i18n.test.ts`).
export const profileAvatarLabels: Record<ProfileAvatarId, string> = Object.fromEntries(
  profileAvatars.map((id) => [id, specs[id].label])) as Record<ProfileAvatarId, string>;

export const profileAvatarHue = (id: ProfileAvatarId): IconHue => specs[id].hue;

export function profileAvatarRoles(id: ProfileAvatarId, dark: boolean): Roles {
  const ramp = iconRamp(specs[id].hue, dark);
  return dark ? { bg: ramp.i, main: ramp.b, accent: ramp.t } : { bg: ramp.t, main: ramp.b, accent: ramp.i };
}

// Complete SVG document (static, trusted markup) for one avatar in one theme.
export function profileAvatarSvg(id: ProfileAvatarId, dark: boolean): string {
  const roles = profileAvatarRoles(id, dark);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" fill="${roles.bg}"/>${specs[id].draw(roles)}</svg>`;
}
