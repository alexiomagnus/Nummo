// Web-only charts drawn with inline SVG (react-dom renders it under react-native-web).
// Mark specs follow the dataviz guidance: 2px lines, 10% area wash, bars <= 24px with a
// 4px rounded data end, 2px surface gaps between touching fills, hairline recessive grid.
import { useState } from 'react';
import { StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import { formatAmountMinor } from '../../domain/expense';
import type { Breakdown, Series } from '../../domain/history';

export type ChartColors = {
  series: readonly string[]; // 8 validated categorical slots, fixed order
  neutral: string; // "Senza categoria"
  surface: string;
  text: string;
  muted: string;
  grid: string;
  baseline: string;
};
export type ChartProps = {
  data: Breakdown;
  colors: ChartColors;
  active: number | null;
  onActive: (index: number | null) => void;
};

export function seriesColor(series: Series, colors: ChartColors): string {
  return series.slot === null ? colors.neutral : colors.series[series.slot] ?? colors.neutral;
}

function useWidth(): [number, (event: LayoutChangeEvent) => void] {
  const [width, setWidth] = useState(0);
  return [width, (event) => setWidth(Math.round(event.nativeEvent.layout.width))];
}

// Clean axis maximum and step (1/2/2.5/5 × 10^n) so ticks read as round euros.
function niceScale(maxMinor: number, ticks = 4): { max: number; step: number } {
  const max = Math.max(maxMinor, 100);
  const raw = max / ticks;
  const power = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * power).find((candidate) => candidate >= raw)!;
  return { max: Math.ceil(max / step) * step, step };
}
const euroFormat = new Intl.NumberFormat('it-IT', { maximumFractionDigits: 0 });
function axisEuro(minor: number, axisMax: number): string {
  const euros = minor / 100;
  return axisMax / 100 >= 10_000 ? `${euroFormat.format(euros / 1000)}K €` : `${euroFormat.format(euros)} €`;
}
// Sparse x labels: at most ~7 so they never collide.
function showLabel(index: number, count: number): boolean {
  const every = Math.ceil(count / 7);
  return index % every === 0 || index === count - 1;
}

const pad = { top: 12, right: 8, bottom: 26, left: 52 };
// SVG text defaults to a serif face; match the app's system sans.
const svgFont = { fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif' };
const plotHeight = 200;

function Axes({ width, scale, colors, labels }: {
  width: number; scale: { max: number; step: number }; colors: ChartColors; labels: { x: number; text: string }[];
}) {
  const ticks: number[] = [];
  for (let value = 0; value <= scale.max; value += scale.step) ticks.push(value);
  const y = (value: number) => pad.top + plotHeight - (value / scale.max) * plotHeight;
  return (
    <g>
      {ticks.map((tick) => (
        <g key={tick}>
          <line x1={pad.left} x2={width - pad.right} y1={y(tick)} y2={y(tick)}
            stroke={tick === 0 ? colors.baseline : colors.grid} strokeWidth={1} />
          <text x={pad.left - 8} y={y(tick)} dy="0.32em" textAnchor="end" fontSize={11} fill={colors.muted}
            style={{ fontVariantNumeric: 'tabular-nums' }}>{axisEuro(tick, scale.max)}</text>
        </g>
      ))}
      {labels.map((label) => (
        <text key={label.x} x={label.x} y={pad.top + plotHeight + 18} textAnchor="middle" fontSize={11} fill={colors.muted}>
          {label.text}
        </text>
      ))}
    </g>
  );
}

export function DonutChart({ data, colors, active, onActive }: ChartProps) {
  const [width, onLayout] = useWidth();
  const size = Math.min(width, 240);
  const outer = size / 2;
  const inner = outer - 30;
  const segments: { d: string; color: string }[] = [];
  let angle = -Math.PI / 2;
  const point = (r: number, a: number) => `${outer + r * Math.cos(a)} ${outer + r * Math.sin(a)}`;
  for (const series of data.series) {
    // Full circle cannot be one SVG arc: draw a 99.99% sweep instead.
    const sweep = Math.min((series.total / data.total) * 2 * Math.PI, 2 * Math.PI - 0.0001);
    const end = angle + sweep;
    const large = sweep > Math.PI ? 1 : 0;
    segments.push({
      color: seriesColor(series, colors),
      d: `M ${point(outer, angle)} A ${outer} ${outer} 0 ${large} 1 ${point(outer, end)} `
        + `L ${point(inner, end)} A ${inner} ${inner} 0 ${large} 0 ${point(inner, angle)} Z`,
    });
    angle = end;
  }
  const focus = active === null ? null : data.series[active];
  return (
    <View onLayout={onLayout} style={styles.center}>
      {size > 0 && (
        <svg style={svgFont} width={size} height={size} role="img" aria-label="Grafico ad anello delle spese per categoria"
          onMouseLeave={() => onActive(null)}>
          {segments.map((segment, index) => (
            <path key={index} d={segment.d} fill={segment.color} stroke={colors.surface} strokeWidth={2}
              opacity={active === null || active === index ? 1 : 0.35} style={{ cursor: 'pointer' }}
              onMouseEnter={() => onActive(index)} onClick={() => onActive(active === index ? null : index)} />
          ))}
          <text x={outer} y={outer - 6} textAnchor="middle" fontSize={20} fontWeight={700} fill={colors.text}>
            {formatAmountMinor(focus ? focus.total : data.total)}
          </text>
          <text x={outer} y={outer + 16} textAnchor="middle" fontSize={12} fill={colors.muted}>
            {focus ? `${Math.round((focus.total / data.total) * 100)}% · ${focus.label}` : 'totale'}
          </text>
        </svg>
      )}
    </View>
  );
}

export function AreaChart({ data, colors, active, onActive }: ChartProps) {
  const [width, onLayout] = useWidth();
  const scale = niceScale(Math.max(...data.totals));
  const count = data.buckets.length;
  const plotWidth = Math.max(width - pad.left - pad.right, 1);
  const x = (index: number) => pad.left + (count === 1 ? plotWidth / 2 : (index / (count - 1)) * plotWidth);
  const y = (value: number) => pad.top + plotHeight - (value / scale.max) * plotHeight;
  const line = data.totals.map((value, index) => `${index === 0 ? 'M' : 'L'} ${x(index)} ${y(value)}`).join(' ');
  const area = `${line} L ${x(count - 1)} ${y(0)} L ${x(0)} ${y(0)} Z`;
  const color = colors.series[0]!;
  const band = plotWidth / Math.max(count - 1, 1);
  return (
    <View onLayout={onLayout}>
      {width > 0 && (
        <svg style={svgFont} width={width} height={pad.top + plotHeight + pad.bottom} role="img"
          aria-label="Grafico ad area dell’andamento delle spese" onMouseLeave={() => onActive(null)}>
          <Axes width={width} scale={scale} colors={colors}
            labels={data.buckets.flatMap((bucket, index) => (showLabel(index, count) ? [{ x: x(index), text: bucket.label }] : []))} />
          <path d={area} fill={color} fillOpacity={0.1} />
          <path d={line} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
          {active !== null && (
            <g pointerEvents="none">
              <line x1={x(active)} x2={x(active)} y1={pad.top} y2={pad.top + plotHeight} stroke={colors.muted} strokeWidth={1} />
              <circle cx={x(active)} cy={y(data.totals[active]!)} r={5} fill={color} stroke={colors.surface} strokeWidth={2} />
            </g>
          )}
          {data.buckets.map((bucket, index) => (
            <rect key={bucket.key} x={x(index) - band / 2} y={pad.top} width={band} height={plotHeight} fill="transparent"
              onMouseEnter={() => onActive(index)} onClick={() => onActive(active === index ? null : index)} />
          ))}
        </svg>
      )}
    </View>
  );
}

function roundedTop(x: number, y: number, w: number, h: number): string {
  const r = Math.min(4, h, w / 2);
  return `M ${x} ${y + h} L ${x} ${y + r} Q ${x} ${y} ${x + r} ${y} L ${x + w - r} ${y} Q ${x + w} ${y} ${x + w} ${y + r} L ${x + w} ${y + h} Z`;
}

export function StackedBarChart({ data, colors, active, onActive }: ChartProps) {
  const [width, onLayout] = useWidth();
  const scale = niceScale(Math.max(...data.totals));
  const count = data.buckets.length;
  const plotWidth = Math.max(width - pad.left - pad.right, 1);
  const band = plotWidth / count;
  const barWidth = Math.max(Math.min(24, band * 0.6), 2);
  const y = (value: number) => (value / scale.max) * plotHeight;
  const gap = 2;
  return (
    <View onLayout={onLayout}>
      {width > 0 && (
        <svg style={svgFont} width={width} height={pad.top + plotHeight + pad.bottom} role="img"
          aria-label="Grafico a barre impilate delle spese per categoria" onMouseLeave={() => onActive(null)}>
          <Axes width={width} scale={scale} colors={colors}
            labels={data.buckets.flatMap((bucket, index) => (showLabel(index, count)
              ? [{ x: pad.left + band * index + band / 2, text: bucket.label }] : []))} />
          {data.buckets.map((bucket, index) => {
            const left = pad.left + band * index + (band - barWidth) / 2;
            const parts = data.series.filter((series) => series.values[index]! > 0);
            let base = pad.top + plotHeight;
            return (
              <g key={bucket.key} opacity={active === null || active === index ? 1 : 0.35}>
                {parts.map((series, partIndex) => {
                  const height = y(series.values[index]!);
                  const top = base - height;
                  // Gap is cut from each segment's top, so stacked heights stay proportional.
                  const visible = Math.max(height - (partIndex < parts.length - 1 ? gap : 0), 0.5);
                  const shape = partIndex === parts.length - 1
                    ? <path key={series.key} d={roundedTop(left, top, barWidth, visible)} fill={seriesColor(series, colors)} />
                    : <rect key={series.key} x={left} y={top + (height - visible)} width={barWidth} height={visible} fill={seriesColor(series, colors)} />;
                  base = top;
                  return shape;
                })}
                <rect x={pad.left + band * index} y={pad.top} width={band} height={plotHeight} fill="transparent"
                  onMouseEnter={() => onActive(index)} onClick={() => onActive(active === index ? null : index)} />
              </g>
            );
          })}
        </svg>
      )}
    </View>
  );
}

const styles = StyleSheet.create({ center: { alignItems: 'center' } });
