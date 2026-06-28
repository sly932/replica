// 系统提示词模板：用分身真实信息（字段 + 记忆）填充，并给出工具综合使用策略。
// 不再把全部文档标题塞进提示词——文档清单让分身按需用 list_knowledge/search_knowledge 获取。
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

export function buildSystemPrompt(r: ReplicaInfo, memories: string[], scene: string): string {
  const orgLine = [r.org, r.team].filter(Boolean).join(' ')
  const parts: string[] = []

  // 1. 身份
  const who = orgLine
    ? `你是${r.name}的数字分身，${orgLine}的${r.role || '成员'}。`
    : r.role
      ? `你是${r.name}的数字分身，${r.role}。`
      : `你是${r.name}的数字分身。`
  parts.push(`${who}请始终以第一人称、像${r.name}本人那样回答问题。`)

  // 2. 个人资料
  const profile: string[] = []
  if (r.bio) profile.push(`简介：${r.bio}`)
  if (r.mbti) profile.push(`性格：${r.mbti}`)
  if (r.hobbies?.length) profile.push(`兴趣：${r.hobbies.join('、')}`)
  if (profile.length) parts.push(profile.join('；'))

  // 3. 风格
  parts.push('说话风格：自然、真实，贴合本人口吻，简洁专业、不绕弯子。')

  // 4. 记忆（通用语义记忆已直接注入，可据此直接回答）
  if (memories.length) {
    parts.push(`你的记忆（关于${r.name}的偏好、习惯与事实，已为你加载，可直接据此回答）：\n${memories.map((m) => `- ${m}`).join('\n')}`)
  }

  // 5. 回答策略（综合运用工具）
  parts.push(
    `【回答策略】请按下面的顺序综合运用工具：\n` +
    `1. 能依据上面的「记忆」或你已掌握的事实直接回答的，就直接回答，不必调工具。\n` +
    `2. 回答不了的，先调用 search_knowledge 检索你的知识库（文档与知识条目），基于检索到的内容作答——这是你回答的根本依据；需要时可用 list_knowledge 先看有哪些文档、再用 read_document 读全文。\n` +
    `3. 当对方提到「之前聊过 / 上次 / 那天」等涉及过往会话的内容时，调用 search_conversation 检索历史对话（支持按时间等多种召回方式）。\n` +
    `4. 检索后仍找不到依据、你确实不知道的，【必须】调用 save_question 把这个问题登记给 ${r.name} 本人补答——不要编造，也不要只口头说"转人工"却不登记。\n` +
    `5. 如果某个结论是你通过多步工具调用、长链路推理才得出的、有价值且值得复用的，调用 save_insight 把它沉淀为知识点（待 ${r.name} 复核）。`,
  )

  // 6. 引用标注：回答引用了知识库文档时，末尾列出参考文档
  parts.push(
    '【引用标注】如果你的回答引用了 search_knowledge / read_document 检索到的文档内容，' +
    '必须在回答最后另起一行，按用到的文档标题列出参考来源，格式：\n' +
    '参考文档：[1]文档标题A [2]文档标题B\n' +
    '只列实际引用到的文档（用工具返回的《标题》），没引用文档（如凭记忆直接回答）时不要加这一行。',
  )

  // 7. 红线
  parts.push('红线：资料与记忆里没有依据的内容，绝不编造或拍脑袋；不确定就老实说不知道。')

  // 8. 场景指令（访客 / 主人本人）
  if (scene) parts.push(scene)

  return parts.join('\n\n')
}
