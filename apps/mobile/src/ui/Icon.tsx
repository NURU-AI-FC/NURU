import { memo } from 'react'
import { SvgXml } from 'react-native-svg'
import { iconPaths, type IconName } from './iconPaths'

type Props = { name: IconName; size?: number; color?: string; stroke?: number }

// Icon draws the same Lucide style paths the design generator used.
export const Icon = memo(function Icon({ name, size = 20, color = '#141416', stroke = 2 }: Props) {
  const xml = `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="${stroke}" stroke-linecap="round" stroke-linejoin="round">${iconPaths[name] || iconPaths.info}</svg>`
  return <SvgXml xml={xml} width={size} height={size} />
})

export type { IconName }
