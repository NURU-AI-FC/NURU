import { Link } from 'react-router-dom'
import { Shell } from '../../Shell'
import { Icon, Skeleton, useLoad } from '../../ui'
import { Prog, Ring, SubNav, Tip } from './parts'

type Part = { key: string; name: string; detail: string; score: number; weight: number }
type Out = { score: number; label: string; change: number; since: string; parts: Part[]; tip: string }

const color = (n: number) => (n >= 65 ? 'var(--green)' : n >= 45 ? 'var(--amber)' : 'var(--red)')
const icons: Record<string, string> = { saving: 'target', stability: 'scale', debt: 'landmark', buffer: 'umbrella' }

// p06-09 Financial health score
export default function Health() {
  const { data: d } = useLoad<Out>('/analytics/health')
  return (
    <Shell title="Financial health score" sub="A score from 0 to 100, from your own accounts">
      <SubNav area="insights" />
      <div className="grid g-21">
        <div className="card col center g8" style={{ padding: 28 }}>
          {d ? <>
            <Ring pct={d.score} size={170} stroke={15} color={color(d.score)} label={String(d.score)} sub="out of 100" />
            <span className="h2" style={{ marginTop: 8 }}>{d.label}{d.change > 0 ? ', and improving' : ''}</span>
            <span className="s t2">{d.change === 0 ? `Same as in ${d.since}` : `${d.change > 0 ? 'Up' : 'Down'} ${Math.abs(d.change)} ${Math.abs(d.change) === 1 ? 'point' : 'points'} since ${d.since}`}</span>
          </> : <Skeleton h={240} />}
        </div>
        <div className="card col g16">
          <span className="h3">What makes up your score</span>
          {d ? d.parts.map((p) => (
            <div key={p.key} className="col g6">
              <div className="row g10">
                <span className="tile" style={{ width: 30, height: 30 }}><Icon name={icons[p.key] || 'info'} size={15} /></span>
                <span className="s w6 grow">{p.name}</span>
                <span className="xs t2" style={{ textAlign: 'right' }}>{p.detail}</span>
              </div>
              <Prog pct={p.score} color={color(p.score)} />
              <span className="xs mu">{p.score} of 100 · counts for {p.weight}%</span>
            </div>
          )) : <Skeleton h={260} />}
        </div>
      </div>
      {d?.tip && <Tip icon="target">{d.tip}</Tip>}
      <Link to={'/ask?q=' + encodeURIComponent('How can I improve my financial health score?')} className="soft row g8 s"><Icon name="sparkles" size={14} color="var(--red)" />Ask NURU how to improve your score</Link>
    </Shell>
  )
}
