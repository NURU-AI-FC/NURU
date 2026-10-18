import { useApp } from './store'
import { Icon } from './ui'

const MODES: ['light' | 'dark' | 'system', string, string][] = [['light', 'sun', 'Light'], ['dark', 'moon', 'Dark'], ['system', 'monitor', 'Match my device']]

// ThemePicker is the three-way light, dark or system switch used in headers.
export function ThemePicker({ className = '' }: { className?: string }) {
  const { theme, update } = useApp()
  return (
    <div className={'tpick ' + className} role="radiogroup" aria-label="Theme">
      {MODES.map(([v, ic, label]) => (
        <button key={v} type="button" role="radio" aria-checked={theme === v} className={theme === v ? 'on' : ''} title={label} aria-label={label} onClick={() => update({ theme: v })}>
          <Icon name={ic} size={16} />
        </button>
      ))}
    </div>
  )
}
