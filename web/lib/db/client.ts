// Supabase 服务端 client（仅 server 侧使用：API routes / lib）
// 用 service_role key，拥有完整读写权限，绝不能在前端 import。
import { createClient } from '@supabase/supabase-js'

const url = process.env.SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_KEY

if (!url || !serviceKey) {
  throw new Error('缺少 SUPABASE_URL / SUPABASE_SERVICE_KEY（检查 web/.env.local）')
}

export const supabaseAdmin = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
})
