import type { Person, Av } from '../types'

// 当前登录用户：陈昊（"我" / 我的分身，消息恒在右侧）
export const ME: Av = { cls: 'c1', ini: '昊' }

export const PEOPLE: Person[] = [
  {
    id: 'zheng', name: '郑萌', role: '灵犀组 · 新人', cls: 'c2', ini: '郑', online: true,
    unread: 2, last: '那 A/B 配置冲突怎么办？', time: '09:24',
    memo: '🧠 记得 TA 是本周入职的新人',
    askMe: [
      { id: 'z1', title: '关于灵犀部署的咨询', status: 'done', time: '今天 09:18', msgs: [
        { side: 'left', av: { cls: 'c2', ini: '郑' }, type: 'text', text: '灵犀的部署流程是怎样的？我刚接手，想先跑通一次发布。' },
        { side: 'right', av: ME, type: 'answer', text: '灵犀走容器化灰度发布，标准流程：',
          list: ['合并到 release，CI 自动构建镜像打 tag', '先发预发(staging)验证健康检查', '灰度 5% 流量观察 10 分钟（错误率 / P99）', '无异常全量；异常一键回滚上个 tag'],
          src: '《灵犀部署手册 v2.3》' },
        { side: 'left', av: { cls: 'c2', ini: '郑' }, type: 'text', text: '那灰度时 A/B 实验配置和新版本默认配置冲突了怎么办？' },
        { side: 'right', type: 'handoff',
          text: '知识库没覆盖「A/B 配置与灰度默认配置冲突」。比起编一个可能误导你的答案，我已转交<b>陈昊本人</b>并记为待回答；他回复后同步给你，<b>之后我也就学会了</b>。',
          hStatus: '已转交 <b>陈昊</b> · 待回答 <b>#1037</b> · 预计今日回复' },
      ]},
      { id: 'z2', title: '值班 SOP 告警分级', status: 'done', time: '昨天', msgs: [
        { side: 'left', av: { cls: 'c2', ini: '郑' }, type: 'text', text: '值班 SOP 里告警分级是怎么定的？' },
        { side: 'right', av: ME, type: 'answer', text: '按影响面分 P0–P3：P0 全站不可用、P1 核心功能受损、P2 体验降级、P3 轻微问题。', src: '《值班 SOP》' },
      ]},
    ],
    iAsk: [],
  },
  {
    id: 'linwan', name: '林晚', role: '账号权限中台', cls: 'c5', ini: '晚', online: false,
    unread: 0, last: '审批后当天生效', time: '昨天', leave: '下周休产假',
    memo: '🧠 TA 下周休产假，相关问题尽量先问分身',
    askMe: [],
    iAsk: [
      { id: 'w1', title: 'SSO 接入怎么开白名单', status: 'done', time: '昨天', msgs: [
        { side: 'right', av: ME, type: 'text', text: '灵犀要接 SSO，需要在你们这边开白名单吗？流程是啥？' },
        { side: 'left', av: { cls: 'c5', ini: '晚' }, type: 'answer', text: '要的。先在权限中台提「接入申请」单，附 callback 域名，我们审批后加白名单，一般当天生效。', src: '《SSO 接入指南》' },
      ]},
    ],
  },
  {
    id: 'zhao', name: '赵启明', role: '模型推理平台 MaaS', cls: 'c4', ini: '启', online: true,
    unread: 0, last: '超 50QPS 要二级审批', time: '昨天',
    askMe: [],
    iAsk: [
      { id: 'q1', title: 'MaaS 模型配额审批', status: 'done', time: '昨天', msgs: [
        { side: 'right', av: ME, type: 'text', text: '灵犀想申请 MaaS 的模型调用配额，找谁审批？' },
        { side: 'left', av: { cls: 'c4', ini: '启' }, type: 'answer', text: '走 MaaS 控制台「配额申请」，我是一级审批人；超过 50QPS 还要平台负责人二级审批。', src: '《MaaS 配额说明》' },
      ]},
    ],
  },
  {
    id: 'linyue', name: '林悦', role: '灵犀组 · 产品经理', cls: 'c3', ini: '悦', online: false,
    unread: 0, last: '建议周会上跟 PM 对齐', time: '周三',
    askMe: [
      { id: 'y1', title: '需求池优先级', status: 'done', time: '周三', msgs: [
        { side: 'left', av: { cls: 'c3', ini: '悦' }, type: 'text', text: '需求池里"导出报表"那条优先级能提吗？' },
        { side: 'right', av: ME, type: 'answer', text: '这块要看排期，建议在周会上跟 PM 对齐；技术上改动不大。', src: '《灵犀需求池》' },
      ]},
    ],
    iAsk: [],
  },
]
