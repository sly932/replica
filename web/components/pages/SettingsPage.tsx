import { useState, useEffect } from 'react'
import { CHAT_MODELS, SUMMARY_MODELS } from '@/lib/models'

interface ToolMeta {
  name: string
  description: string
  parameters: { properties?: Record<string, Record<string, unknown>>; required?: string[] } | null
  ownerOnly: boolean
}

const taStyle: React.CSSProperties = {
  width: '100%', background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.12)',
  borderRadius: '10px', padding: '10px 12px', color: 'inherit', fontSize: '13px',
  lineHeight: 1.6, resize: 'vertical', fontFamily: 'inherit', marginTop: '6px',
}

function typeOf(p: Record<string, unknown>): string {
  if (p.type) return Array.isArray(p.type) ? (p.type as string[]).join('|') : (p.type as string)
  if (p.enum) return 'enum'
  if (p.anyOf) return (p.anyOf as Record<string, unknown>[]).map((x) => (x.type as string) || '?').join('|')
  return 'object'
}

function Params({ schema }: { schema: ToolMeta['parameters'] }) {
  const props = schema?.properties || {}
  const required = schema?.required || []
  const keys = Object.keys(props)
  if (!keys.length) return <div style={{ fontSize: '12px', color: 'var(--dim)' }}>无入参</div>
  return (
    <table style={{ width: '100%', fontSize: '12px', borderCollapse: 'collapse', marginTop: '4px' }}>
      <thead>
        <tr style={{ textAlign: 'left', color: 'var(--dim)' }}>
          <th style={{ padding: '4px 8px' }}>参数</th><th style={{ padding: '4px 8px' }}>类型</th>
          <th style={{ padding: '4px 8px' }}>必填</th><th style={{ padding: '4px 8px' }}>说明</th>
        </tr>
      </thead>
      <tbody>
        {keys.map((k) => (
          <tr key={k} style={{ borderTop: '1px solid rgba(255,255,255,.06)' }}>
            <td style={{ padding: '4px 8px' }}><code>{k}</code></td>
            <td style={{ padding: '4px 8px', color: 'var(--dim)' }}>{typeOf(props[k])}</td>
            <td style={{ padding: '4px 8px' }}>{required.includes(k) ? '是' : '否'}</td>
            <td style={{ padding: '4px 8px', color: 'var(--dim)' }}>{(props[k].description as string) || ''}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

export default function SettingsPage() {
  const [chatModel, setChatModel] = useState('')
  const [summaryModel, setSummaryModel] = useState('')
  const [visitorPrompt, setVisitorPrompt] = useState('')
  const [ownerPrompt, setOwnerPrompt] = useState('')
  const [tools, setTools] = useState<ToolMeta[]>([])
  const [openTool, setOpenTool] = useState('')
  const [loading, setLoading] = useState(true)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    fetch('/api/settings').then((r) => r.json()).then((d) => {
      setChatModel(d.chatModel); setSummaryModel(d.summaryModel)
      setVisitorPrompt(d.visitorPrompt || ''); setOwnerPrompt(d.ownerPrompt || '')
      setLoading(false)
    }).catch(() => setLoading(false))
    fetch('/api/tools').then((r) => r.json()).then((d) => setTools(d.tools || [])).catch(() => {})
  }, [])

  const save = async () => {
    await fetch('/api/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chatModel, summaryModel, visitorPrompt, ownerPrompt }),
    })
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="page show">
      <div className="wrap col">
        <div className="page-head"><h1>系统设置</h1><p>全局模型、场景提示词与工具一览</p></div>
        <div className="profile scroll">
          {/* 模型 */}
          <div className="pcard">
            <h3>模型设置</h3>
            <div className="field">
              <label>聊天模型</label>
              <select className="sel" value={chatModel} onChange={(e) => setChatModel(e.target.value)} disabled={loading}>
                {CHAT_MODELS.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            </div>
            <div className="field">
              <label>Summary 模型</label>
              <select className="sel" value={summaryModel} onChange={(e) => setSummaryModel(e.target.value)} disabled={loading}>
                {SUMMARY_MODELS.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            </div>
          </div>

          {/* 两处场景系统提示词 */}
          <div className="pcard">
            <h3>场景系统提示词</h3>
            <div style={{ marginBottom: '12px' }}>
              <label style={{ fontSize: '13px', fontWeight: 600 }}>回答别人（访客场景）</label>
              <textarea style={taStyle} rows={3} value={visitorPrompt} onChange={(e) => setVisitorPrompt(e.target.value)} disabled={loading} />
            </div>
            <div>
              <label style={{ fontSize: '13px', fontWeight: 600 }}>主人本人对话（owner 场景）</label>
              <textarea style={taStyle} rows={3} value={ownerPrompt} onChange={(e) => setOwnerPrompt(e.target.value)} disabled={loading} />
            </div>
            <p style={{ fontSize: '12px', color: 'var(--dim)', marginTop: '8px', lineHeight: 1.6 }}>
              这两段按对话场景（是否主人本人）拼接到分身人格（persona）之后，作为最终系统提示词。
            </p>
          </div>

          {/* 保存 */}
          <div className="pcard">
            <button className="btn" onClick={save} disabled={loading}>{saved ? '已保存 ✓' : '保存设置'}</button>
          </div>

          {/* 工具一览 */}
          <div className="pcard">
            <h3>工具一览（{tools.length}）</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '8px' }}>
              {tools.map((t) => (
                <div key={t.name} style={{ border: '1px solid rgba(255,255,255,.08)', borderRadius: '10px', padding: '10px 12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }} onClick={() => setOpenTool(openTool === t.name ? '' : t.name)}>
                    <code style={{ fontWeight: 700 }}>{t.name}</code>
                    {t.ownerOnly && <span className="pill">主人专属</span>}
                    <span style={{ marginLeft: 'auto', color: 'var(--dim)' }}>{openTool === t.name ? '▾' : '▸'}</span>
                  </div>
                  <div style={{ fontSize: '12.5px', color: 'var(--dim)', marginTop: '4px', lineHeight: 1.55 }}>{t.description}</div>
                  {openTool === t.name && <div style={{ marginTop: '8px' }}><Params schema={t.parameters} /></div>}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
