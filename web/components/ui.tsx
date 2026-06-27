import { useState } from 'react'

// 受控开关（demo：本地维护状态）
export function Toggle({ on = false }: { on?: boolean }) {
  const [v, setV] = useState(on)
  return <div className={'toggle' + (v ? ' on' : '')} onClick={() => setV(!v)} />
}
