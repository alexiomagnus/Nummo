// The animation behind the glass (27 November, on request, after Morphe's «Animazione dello sfondo»): pure choices, the drawing is in
// components/Orbs.tsx. `circles` is the first one (the large soft circles), `none` a plain background (the glass stays).
export const backgrounds = ['circles', 'rings', 'space', 'snow', 'particles', 'none'] as const;
export type Background = (typeof backgrounds)[number];
export const backgroundLabels: Record<Background, string> = {
  circles: 'Cerchi', rings: 'Anelli', space: 'Spazio', snow: 'Neve', particles: 'Particelle', none: 'Nessuna',
};

// `orbs` is the boolean of the first version: false = no animation.
export function parseBackground(value: unknown, legacyOrbs: unknown): Background {
  if (typeof value === 'string' && (backgrounds as readonly string[]).includes(value)) return value as Background;
  return legacyOrbs === false ? 'none' : 'circles';
}
