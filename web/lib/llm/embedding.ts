// Embedding 客户端（独立服务，OpenAI 兼容 /v1/embeddings）
// cloudsway 不提供 embedding，这里走 EMBEDDING_BASE_URL（如 ofox）。
const BASE = process.env.EMBEDDING_BASE_URL
const KEY = process.env.EMBEDDING_API_KEY
const MODEL = process.env.EMBEDDING_MODEL

export const EMBEDDING_DIM = Number(process.env.EMBEDDING_DIM || 1536)

export async function embed(input: string[]): Promise<number[][]> {
  if (!BASE || !KEY || !MODEL) {
    throw new Error('缺少 EMBEDDING_BASE_URL / EMBEDDING_API_KEY / EMBEDDING_MODEL')
  }
  const res = await fetch(`${BASE}/embeddings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${KEY}` },
    body: JSON.stringify({ model: MODEL, input }),
  })
  if (!res.ok) {
    throw new Error(`embedding 失败 ${res.status}: ${await res.text()}`)
  }
  const json = await res.json()
  return (json.data as Array<{ embedding: number[] }>).map((d) => d.embedding)
}

export async function embedOne(text: string): Promise<number[]> {
  return (await embed([text]))[0]
}
