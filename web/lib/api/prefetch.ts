// 切换/进入时预取当前用户的数据并写入 lib/cache，使各页面打开命中缓存。
// 并发预取 记忆/知识条目/文档/会话 列表，用与各页面 list 完全相同的 cache key 调 cacheSet。
import { listMemories, listArticles } from '@/lib/api/manage'
import { listConversations } from '@/lib/api/conversations'
import { cacheGet, cacheSet } from '@/lib/cache'

// 知识条目按 status 分页加载（key 与 ItemsPage / 服务端 route 一致）
const KNOWLEDGE_STATUSES = ['pending_answer', 'pending_review', 'approved', 'archived'] as const

async function prefetchKnowledge(replicaId: string): Promise<void> {
  await Promise.all(
    KNOWLEDGE_STATUSES.map(async (status) => {
      const key = `knowledge-items:${replicaId}:${status}`
      if (cacheGet(key)) return
      const r = await fetch(`/api/knowledge-items?replicaId=${replicaId}&status=${status}`)
      const d = await r.json()
      cacheSet(key, d.items || [])
    }),
  )
}

// 会话列表：ChatPage 用的 key 为 convs:${replicaId}:${tab}（tab 为 askMe/iAsk），对应 direction ask_me/i_ask
const CONV_TABS: { tab: string; direction: string }[] = [
  { tab: 'askMe', direction: 'ask_me' },
  { tab: 'iAsk', direction: 'i_ask' },
]

async function prefetchConversations(replicaId: string): Promise<void> {
  await Promise.all(
    CONV_TABS.map(async ({ tab, direction }) => {
      const key = `convs:${replicaId}:${tab}`
      if (cacheGet(key)) return
      const cs = await listConversations(replicaId, direction)
      cacheSet(key, cs)
    }),
  )
}

export async function prefetchUser(replicaId: string): Promise<void> {
  if (!replicaId) return
  // listMemories / listArticles 自身即「cacheGet 命中则用，否则 fetch + cacheSet」，直接调用即落缓存
  await Promise.allSettled([
    listMemories(replicaId),
    listArticles(replicaId),
    prefetchKnowledge(replicaId),
    prefetchConversations(replicaId),
  ])
}
