// Validated 12-colour categorical palette (light/dark), shared by the dashboard (slots follow category IDs) and the
// funds (slot chosen per fund). Labels always accompany a colour: a finite palette repeats.
export const chartPalette = {
  light: ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#008300', '#6250d6', '#e34948', '#0e9fb8', '#7a9400', '#a846b3', '#a85a1c'],
  dark: ['#3987e5', '#d95926', '#199e70', '#c98500', '#d55181', '#008300', '#9085e9', '#e66767', '#1fa0bd', '#7f9d00', '#b85bc2', '#b86a2a'],
} as const;

export function paletteColor(slot: number, dark: boolean): string {
  const colors = dark ? chartPalette.dark : chartPalette.light;
  return colors[((slot % colors.length) + colors.length) % colors.length]!;
}
