export type AvCls = 'c1' | 'c2' | 'c3' | 'c4' | 'c5'
export interface Av { cls: AvCls; ini: string }

export type MsgType = 'text' | 'answer' | 'handoff'
export interface Msg {
  side: 'left' | 'right'
  av?: Av
  type: MsgType
  text: string
  list?: string[]
  src?: string
  hStatus?: string
}

export interface Thread {
  id: string
  title: string
  status: 'done' | 'wait'
  time: string
  msgs: Msg[]
}

export type TabKey = 'askMe' | 'iAsk'

export interface Person {
  id: string
  name: string
  role: string
  cls: AvCls
  ini: string
  online: boolean
  unread: number
  last: string
  time: string
  leave?: string
  memo?: string
  askMe: Thread[]
  iAsk: Thread[]
}
