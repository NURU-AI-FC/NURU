// Charts drawn with react-native-svg, ported from the SVG helpers in
// design/src/lib.mjs (bars, stacked, line, donut, ring).
import { useState, type ReactNode } from 'react'
import { Text, View, type LayoutChangeEvent } from 'react-native'
import Svg, { Circle, Defs, Line as SvgLine, LinearGradient, Path, Rect, Stop, Text as SvgText } from 'react-native-svg'
import { cat, font, useTheme } from '../lib/theme'

/** Measure gives its child the available width. */
function Measure({ height, children }: { height: number; children: (w: number) => ReactNode }) {
  const [w, setW] = useState(0)
  return (
    <View style={{ height, alignSelf: 'stretch' }} onLayout={(e: LayoutChangeEvent) => setW(Math.floor(e.nativeEvent.layout.width))}>
      {w > 0 && children(w)}
    </View>
  )
}

export function Bars({ values, labels = [], hi = -1, h = 80, color, base, rx = 6, gap = 0.38 }: {
  values: number[]; labels?: string[]; hi?: number; h?: number; color?: string; base?: string; rx?: number; gap?: number
}) {
  const { c } = useTheme()
  const max = Math.max(1, ...values) * 1.1
  return (
    <Measure height={h + 20}>
      {(w) => {
        const n = values.length, slot = w / n, bw = slot * (1 - gap)
        return (
          <Svg width={w} height={h + 20}>
            {values.map((v, i) => {
              const x = i * slot + (slot - bw) / 2, bh = Math.max(4, (v / max) * h)
              const on = i === hi || hi === -2
              return <Rect key={i} x={x} y={h - bh} width={bw} height={bh} rx={Math.min(rx, bw / 2)} fill={on ? color || c.red : base || c.surface2} />
            })}
            {labels.map((l, i) => l ? (
              <SvgText key={'l' + i} x={i * slot + slot / 2} y={h + 15} fontSize={10} fill={c.muted} textAnchor="middle" fontFamily={font[400]}>{l}</SvgText>
            ) : null)}
          </Svg>
        )
      }}
    </Measure>
  )
}

/** Grouped bars for two series, such as money in and money out. */
export function Grouped({ series, labels = [], colors, h = 110 }: { series: number[][]; labels?: string[]; colors: string[]; h?: number }) {
  const { c } = useTheme()
  const max = Math.max(1, ...series.flat()) * 1.1
  const n = series[0]?.length || 0
  return (
    <Measure height={h + 20}>
      {(w) => {
        const slot = w / Math.max(1, n), bw = (slot * 0.62) / series.length
        return (
          <Svg width={w} height={h + 20}>
            {series.map((s, k) => s.map((v, i) => {
              const bh = Math.max(3, (v / max) * h)
              const x = i * slot + slot * 0.19 + k * bw
              return <Rect key={k + '-' + i} x={x} y={h - bh} width={bw - 2} height={bh} rx={3} fill={colors[k]} />
            }))}
            {labels.map((l, i) => l ? <SvgText key={'l' + i} x={i * slot + slot / 2} y={h + 15} fontSize={10} fill={c.muted} textAnchor="middle" fontFamily={font[400]}>{l}</SvgText> : null)}
          </Svg>
        )
      }}
    </Measure>
  )
}

export function LineChart({ values, labels = [], h = 90, color, compare, dots, fill = true, sw = 2.5 }: {
  values: number[]; labels?: string[]; h?: number; color?: string; compare?: number[]; dots?: boolean; fill?: boolean; sw?: number
}) {
  const { c } = useTheme()
  const col = color || c.red
  const all = compare ? values.concat(compare) : values
  const hi = Math.max(...all) * 1.1 || 1
  const lo = Math.min(...all) * 0.85
  const extra = labels.length ? 20 : 6
  return (
    <Measure height={h + extra}>
      {(w) => {
        const pad = 6
        const iw = w - pad * 2
        const pt = (v: number, i: number, arr: number[]) => [pad + (i / Math.max(1, arr.length - 1)) * iw, 4 + (h - 8) - ((v - lo) / (hi - lo || 1)) * (h - 8)]
        const path = (arr: number[]) => arr.map((v, i) => { const [x, y] = pt(v, i, arr); return `${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}` }).join(' ')
        const [lx, ly] = pt(values[values.length - 1], values.length - 1, values)
        return (
          <Svg width={w} height={h + extra}>
            <Defs>
              <LinearGradient id="lg" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor={col} stopOpacity={0.22} />
                <Stop offset="1" stopColor={col} stopOpacity={0} />
              </LinearGradient>
            </Defs>
            {[1, 2, 3].map((k) => <SvgLine key={k} x1={0} x2={w} y1={(h / 4) * k} y2={(h / 4) * k} stroke={c.border} strokeDasharray="3 4" />)}
            {compare && <Path d={path(compare)} fill="none" stroke={c.muted} strokeWidth={2} strokeDasharray="5 5" />}
            {fill && <Path d={`${path(values)} L${pad + iw} ${h} L${pad} ${h} Z`} fill="url(#lg)" />}
            <Path d={path(values)} fill="none" stroke={col} strokeWidth={sw} strokeLinejoin="round" strokeLinecap="round" />
            {dots && values.map((v, i) => { const [x, y] = pt(v, i, values); return <Circle key={i} cx={x} cy={y} r={3.5} fill={c.bg} stroke={col} strokeWidth={2} /> })}
            <Circle cx={lx} cy={ly} r={5} fill={col} stroke={c.bg} strokeWidth={2.5} />
            {labels.map((l, i) => (
              <SvgText key={'t' + i} x={pad + (i / Math.max(1, labels.length - 1)) * iw} y={h + 16} fontSize={10} fill={c.muted} fontFamily={font[400]}
                textAnchor={i === 0 ? 'start' : i === labels.length - 1 ? 'end' : 'middle'}>{l}</SvgText>
            ))}
          </Svg>
        )
      }}
    </Measure>
  )
}

const arc = (cx: number, r: number, a0: number, a1: number) => {
  const p = (a: number) => [(cx + r * Math.sin(a)).toFixed(2), (cx - r * Math.cos(a)).toFixed(2)]
  const [x0, y0] = p(a0), [x1, y1] = p(a1)
  return `M${x0} ${y0} A${r} ${r} 0 ${a1 - a0 > Math.PI ? 1 : 0} 1 ${x1} ${y1}`
}

export function Donut({ values, size = 116, sw = 16, colors = cat, center, sub }: { values: number[]; size?: number; sw?: number; colors?: string[]; center?: string; sub?: string }) {
  const { c } = useTheme()
  const tot = values.reduce((a, b) => a + b, 0) || 1
  const r = (size - sw) / 2, cx = size / 2, gap = 3 / r
  let a = 0
  return (
    <Svg width={size} height={size}>
      <Circle cx={cx} cy={cx} r={r} fill="none" stroke={c.surface2} strokeWidth={sw} />
      {values.map((v, i) => {
        const sweep = (v / tot) * 2 * Math.PI
        const d = arc(cx, r, a, a + Math.max(0.01, sweep - gap))
        a += sweep
        return <Path key={i} d={d} fill="none" stroke={colors[i % colors.length]} strokeWidth={sw} />
      })}
      {center && <SvgText x={cx} y={cx + (sub ? 0 : 6)} fontSize={size > 130 ? 20 : 15} fontFamily={font[700]} fill={c.text} textAnchor="middle">{center}</SvgText>}
      {sub && <SvgText x={cx} y={cx + 18} fontSize={11} fontFamily={font[400]} fill={c.muted} textAnchor="middle">{sub}</SvgText>}
    </Svg>
  )
}

export function Ring({ pct, size = 64, sw = 7, color, label, track, textColor }: { pct: number; size?: number; sw?: number; color?: string; label?: string; track?: string; textColor?: string }) {
  const { c } = useTheme()
  const r = (size - sw) / 2, cx = size / 2, end = Math.min(0.9999, Math.max(0.001, pct / 100)) * 2 * Math.PI
  return (
    <Svg width={size} height={size}>
      <Circle cx={cx} cy={cx} r={r} fill="none" stroke={track || c.surface2} strokeWidth={sw} />
      <Path d={arc(cx, r, 0, end)} fill="none" stroke={color || c.red} strokeWidth={sw} strokeLinecap="round" />
      <SvgText x={cx} y={cx + size / 13} fontSize={size / 4.4} fontFamily={font[700]} fill={textColor || c.text} textAnchor="middle">{label ?? `${Math.round(pct)}%`}</SvgText>
    </Svg>
  )
}

export function Legend({ items, colors = cat }: { items: [string, string, string?][]; colors?: string[] }) {
  return (
    <View style={{ gap: 10 }}>
      {items.map(([l, v, p], i) => (
        <View key={l} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <View style={{ width: 10, height: 10, borderRadius: 3, backgroundColor: colors[i % colors.length] }} />
          <TextLine text={l} grow />
          {!!v && <TextLine text={v} bold />}
          {!!p && <TextLine text={p} muted width={36} />}
        </View>
      ))}
    </View>
  )
}

function TextLine({ text, grow, bold, muted, width }: { text: string; grow?: boolean; bold?: boolean; muted?: boolean; width?: number }) {
  const { c } = useTheme()
  return (
    <Text numberOfLines={1} style={{
      flex: grow ? 1 : undefined, width, textAlign: width ? 'right' : undefined,
      fontSize: muted ? 11 : 13, lineHeight: 18, fontFamily: font[bold ? 600 : 400], color: muted ? c.muted : c.text,
    }}>{text}</Text>
  )
}
