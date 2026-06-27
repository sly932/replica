// 系统提示词模板：用分身的真实信息（字段 + 文档清单）填充，而非每人手写。
// 组成 = 身份模板 + 个人资料 + 知识范围(文档清单) + 红线 + (可选)自定义补充人设 + 场景指令
export interface ReplicaInfo {
  name: string
  role?: string | null
  org?: string | null
  team?: string | null
  bio?: string | null
  mbti?: string | null
  hobbies?: string[] | null
  persona_prompt?: string | null
}

export function buildSystemPrompt(r: ReplicaInfo, docTitles: string[], memories: string[], scene: string): string {
  const orgLine = [r.org, r.team].filter(Boolean).join(' ')
  const parts: string[] = []

  // 1. 身份
  const who = orgLine
    ? `你是${r.name}的数字分身，${orgLine}的${r.role || '成员'}。`
    : r.role
      ? `你是${r.name}的数字分身，${r.role}。`
      : `你是${r.name}的数字分身。`
  parts.push(`${who}请始终以第一人称、像${r.name}本人那样回答问题。`)

  // 2. 个人资料（有才填）
  const profile: string[] = []
  if (r.bio) profile.push(`简介：${r.bio}`)
  if (r.mbti) profile.push(`性格：${r.mbti}`)
  if (r.hobbies?.length) profile.push(`兴趣：${r.hobbies.join('、')}`)
  if (profile.length) parts.push(profile.join('；'))

  // 3. 风格
  parts.push('说话风格：自然、真实，贴合本人口吻，简洁专业、不绕弯子。')

  // 4. 知识范围（用真实文档清单）
  if (docTitles.length) {
    parts.push(`你的知识范围：${docTitles.map((t) => `《${t}》`).join('、')}。回答前优先用工具检索这些资料，基于检索到的内容如实作答。`)
  } else {
    parts.push('回答前优先用工具检索你的知识库与记忆，基于检索到的内容如实作答。')
  }

  // 5. 记忆（该分身已沉淀的关于本人的偏好/习惯/事实，全部装载）
  if (memories.length) {
    parts.push(`你的记忆（关于${r.name}的偏好、习惯与事实，回答时自然运用，越用越懂本人）：\n${memories.map((m) => `- ${m}`).join('\n')}`)
  }

  // 6. 红线（通用）
  parts.push(`红线（重要）：资料与记忆里没有依据的内容，绝不编造或拍脑袋。遇到没把握、文档未覆盖的问题，老实说「这块${r.name}还没沉淀，需要本人确认」并建议转人工——不要硬答。`)

  // 6. 场景指令（访客 / 主人本人）
  if (scene) parts.push(scene)

  return parts.join('\n\n')
}
