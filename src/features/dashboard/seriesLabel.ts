import { otherCategoriesKey, uncategorizedKey, type Series } from '../../domain/history.ts';

export function seriesLabel(series: Pick<Series, 'key' | 'label'>, t: (text: string) => string): string {
  return series.key === otherCategoriesKey || series.key === uncategorizedKey ? t(series.label) : series.label;
}
