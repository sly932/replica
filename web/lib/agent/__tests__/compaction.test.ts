// 上下文压缩逻辑单测。纯逻辑，无需网络/DB。
// 跑法：npx tsx lib/agent/__tests__/compaction.test.ts

import {
  compactionLevel,
  microCompact,
  summarizeMessages,
  contextWindowFor,
} from '../compaction'
import type { AgentMessage } from '@earendil-works/pi-agent-core'

let passed = 0
let failed = 0

function assert(cond: boolean, name: string) {
  if (cond) {
    passed++
    console.log(`  ✓ ${name}`)
  } else {
    failed++
    console.error(`  ✗ ${name}`)
  }
}

// 构造假消息工具。
function user(text: string): AgentMessage {
  return { role: 'user', content: text, timestamp: 0 } as unknown as AgentMessage
}
function assistant(text: string): AgentMessage {
  return {
    role: 'assistant',
    content: [{ type: 'text', text }],
    timestamp: 0,
  } as unknown as AgentMessage
}
function toolResult(text: string): AgentMessage {
  return {
    role: 'toolResult',
    toolCallId: 'c1',
    toolName: 'search',
    content: [{ type: 'text', text }],
    isError: false,
    timestamp: 0,
  } as unknown as AgentMessage
}

console.log('compactionLevel:')
assert(compactionLevel(85, 100) === 'summary', '>0.8 → summary')
assert(compactionLevel(81, 100) === 'summary', '0.81 → summary')
assert(compactionLevel(70, 100) === 'micro', '>0.6 → micro')
assert(compactionLevel(61, 100) === 'micro', '0.61 → micro')
assert(compactionLevel(60, 100) === 'none', '=0.6 → none')
assert(compactionLevel(50, 100) === 'none', '0.5 → none')
assert(compactionLevel(0, 100) === 'none', '0 → none')
assert(compactionLevel(100, 0) === 'none', 'window 0 → none (no div by zero)')

console.log('microCompact:')
{
  const orig: AgentMessage[] = [
    user('问题1'),
    assistant('我来查一下'),
    toolResult('一大段工具输出内容...'),
    assistant('结果是42'),
  ]
  const out = microCompact(orig)

  // 工具结果被裁剪。
  const tr = out[2] as { content: { type: string; text: string }[] }
  assert(tr.content.length === 1 && tr.content[0].text === '[此工具输出已被裁剪]', '工具结果内容被替换')
  // 其余消息原样。
  assert((out[0] as any).content === '问题1', 'user 消息原样')
  assert((out[3] as any).content[0].text === '结果是42', 'assistant 消息原样')
  // 不可变：原数组未被改动。
  assert((orig[2] as any).content[0].text === '一大段工具输出内容...', '原数组未被修改')
  assert(out !== orig && out[2] !== orig[2], '返回新数组/新对象')

  // content 数组里的 tool_result block 也被裁剪。
  const withBlock: AgentMessage[] = [
    { role: 'user', content: [{ type: 'tool_result', text: '原始' }], timestamp: 0 } as unknown as AgentMessage,
  ]
  const out2 = microCompact(withBlock)
  assert((out2[0] as any).content[0].text === '[此工具输出已被裁剪]', 'content 内 tool_result block 被替换')
}

console.log('summarizeMessages:')
{
  const fakeSummarize = async (text: string) => `共${text.split('\n').length}行`
  // 6 条 user + 穿插其它，足够 3 条 user。
  const msgs: AgentMessage[] = [
    user('u1'),
    assistant('a1'),
    toolResult('t1'),
    user('u2'),
    assistant('a2'),
    user('u3'), // 倒数第3条 user → 从这里开始保留
    assistant('a3'),
    user('u4'),
    assistant('a4'),
    user('u5'),
  ]
  const out = await summarizeMessages(msgs, fakeSummarize)

  // 第一条是摘要 assistant 消息。
  assert((out[0] as any).role === 'assistant', '首条为 assistant 摘要')
  assert(
    typeof (out[0] as any).content[0].text === 'string' &&
      (out[0] as any).content[0].text.startsWith('[前文摘要] '),
    '摘要文本带 [前文摘要] 前缀',
  )

  // 保留最后 3 条 user（u3,u4,u5）及其之后所有消息。
  const keptRoles = out.slice(1).map((m) => (m as any).role)
  const keptUsers = out.slice(1).filter((m) => (m as any).role === 'user')
  assert(keptUsers.length === 3, '保留 3 条 user 消息')
  assert((keptUsers[0] as any).content === 'u3', '从倒数第3条 user(u3) 开始保留')
  assert((keptUsers[2] as any).content === 'u5', '保留到最后一条 user(u5)')
  // u3 之后的 assistant 也原样保留。
  assert(keptRoles.includes('assistant'), 'u3 之后的 assistant 原样保留')
  // 总长度：1 摘要 + 5 条(u3,a3,u4,a4,u5)。
  assert(out.length === 6, '总长度 = 1摘要 + 5保留')

  // 不足 3 条 user → 原样返回。
  const few: AgentMessage[] = [user('x'), assistant('y'), user('z')]
  const out3 = await summarizeMessages(few.slice(0, 2), fakeSummarize) // 1 条 user
  assert(out3.length === 2 && out3 === out3, '不足3条user 原样返回(长度不变)')
  assert((await summarizeMessages([user('a'), user('b')], fakeSummarize)).length === 2, '2条user 原样返回')
}

console.log('contextWindowFor:')
assert(contextWindowFor('claude-sonnet-4') === 200000, 'sonnet → 200000')
assert(contextWindowFor('claude-opus-4') === 200000, 'opus → 200000')
assert(contextWindowFor('claude-3-5-haiku') === 200000, 'haiku → 200000')
assert(contextWindowFor('some-unknown-model') === 200000, '未知 → 默认 200000')

console.log(`\n${passed} passed, ${failed} failed`)
if (failed > 0) process.exit(1)
