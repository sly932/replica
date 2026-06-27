// app.js — UI demo 交互（纯前端，仅做形态/视觉校准）
// 对话页：人员 → 会话(TA问我/我问TA) → 聊天内容，三栏联动 + 可发消息

/* ============ 日/夜模式切换 ============ */
const themeBtn = document.getElementById('themeBtn');
if (themeBtn) themeBtn.addEventListener('click', () => {
  const cur = document.documentElement.getAttribute('data-theme');
  document.documentElement.setAttribute('data-theme', cur === 'light' ? 'dark' : 'light');
});

/* ============ 功能 bar 切页 ============ */
document.querySelectorAll('.nav .item').forEach(it => {
  it.addEventListener('click', () => {
    document.querySelectorAll('.nav .item').forEach(x => x.classList.remove('active'));
    it.classList.add('active');
    document.querySelectorAll('.page').forEach(p => p.classList.remove('show'));
    document.getElementById(it.dataset.p).classList.add('show');
  });
});

/* ============ 开关 toggle（静态页） ============ */
document.querySelectorAll('.toggle').forEach(t => t.addEventListener('click', () => t.classList.toggle('on')));

/* ============ 上传文档（模拟） ============ */
const uploadBtn = document.getElementById('uploadBtn');
if (uploadBtn) uploadBtn.addEventListener('click', () => {
  const url = prompt('输入系统文档链接（如 docs.xinglan.com/lingxi/xxx）：');
  if (!url) return;
  const list = document.getElementById('docList');
  const el = document.createElement('div');
  el.className = 'card';
  el.innerHTML = `<div class="ico"><svg viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M9 13h6M9 17h6"/></svg></div>
    <div class="body"><div class="t">新文档（解析中…）</div><div class="d">已提交，正在切块向量化入库。</div><div class="meta"><span>🔗 ${url}</span><span>刚刚</span></div></div>
    <div class="acts"><span class="iconbtn"><svg viewBox="0 0 24 24"><path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/></svg></span><div class="toggle on"></div></div>`;
  list.prepend(el);
  el.querySelector('.toggle').addEventListener('click', e => e.currentTarget.classList.toggle('on'));
});

/* ============ 对话页数据 ============ */
const ME = { cls: 'c1', ini: '昊' }; // 当前用户：陈昊（我 / 我的分身，恒在右）

const PEOPLE = [
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
    memo: '',
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
    memo: '',
    askMe: [
      { id: 'y1', title: '需求池优先级', status: 'done', time: '周三', msgs: [
        { side: 'left', av: { cls: 'c3', ini: '悦' }, type: 'text', text: '需求池里"导出报表"那条优先级能提吗？' },
        { side: 'right', av: ME, type: 'answer', text: '这块要看排期，建议在周会上跟 PM 对齐；技术上改动不大。', src: '《灵犀需求池》' },
      ]},
    ],
    iAsk: [],
  },
];

/* ============ 状态 ============ */
const state = { personId: 'zheng', tab: 'askMe', threadId: 'z1' };
const byId = id => PEOPLE.find(p => p.id === id);
const curPerson = () => byId(state.personId);
const curThreads = () => curPerson()[state.tab];
const curThread = () => curThreads().find(t => t.id === state.threadId);

/* ============ 渲染 ============ */
function renderPeople() {
  const el = document.getElementById('plist');
  el.innerHTML = PEOPLE.map(p => `
    <div class="pitem ${p.id === state.personId ? 'active' : ''}" data-id="${p.id}">
      <div class="av ${p.cls}">${p.ini}${p.online ? '<span class="online"></span>' : ''}</div>
      <div class="x">
        <div class="n">${p.name}${p.leave ? ` <span style="font-size:9.5px;color:var(--amber);border:1px solid rgba(240,168,90,.4);border-radius:6px;padding:0 5px">${p.leave}</span>` : ''} <time>${p.time}</time></div>
        <div class="m">${p.last}</div>
      </div>
      ${p.unread ? `<span class="unread">${p.unread}</span>` : ''}
    </div>`).join('');
  el.querySelectorAll('.pitem').forEach(it => it.addEventListener('click', () => selectPerson(it.dataset.id)));
}

function renderTabs() {
  document.querySelectorAll('.tab').forEach(t => t.classList.toggle('active', t.dataset.tab === state.tab));
}

function renderThreads() {
  const el = document.getElementById('tlist');
  const list = curThreads();
  if (!list.length) {
    el.innerHTML = `<div class="empty-thread">${state.tab === 'askMe' ? '还没有人向 TA 提问' : `你还没向「${curPerson().name} 的分身」提过问`}</div>`;
    renderChatEmpty();
    return;
  }
  if (!list.find(t => t.id === state.threadId)) state.threadId = list[0].id;
  el.innerHTML = list.map(t => `
    <div class="titem ${t.id === state.threadId ? 'active' : ''}" data-id="${t.id}">
      <div class="tt">${t.title}</div>
      <div class="td"><span class="chip ${t.status === 'wait' ? 'wait' : 'done'}">${t.status === 'wait' ? '待回答' : '已回答'}</span> ${t.time}</div>
    </div>`).join('');
  el.querySelectorAll('.titem').forEach(it => it.addEventListener('click', () => { state.threadId = it.dataset.id; renderThreads(); renderChat(); }));
  renderChat();
}

function msgHTML(m) {
  if (m.type === 'handoff') {
    return `<div class="handoff ${m.side}">
      <div class="h-t">🤔 这个我不敢替陈昊乱答</div>${m.text}
      <div class="h-status"><span class="tick">✓</span> ${m.hStatus}</div>
    </div>`;
  }
  const inner = `${m.text}
    ${m.list ? `<ol class="ans-list">${m.list.map(li => `<li>${li}</li>`).join('')}</ol>` : ''}
    ${m.src ? `<span class="src">📄 来源：${m.src}</span>` : ''}`;
  return `<div class="row ${m.side}">
    <div class="mini-av ${m.av.cls}">${m.av.ini}</div>
    <div class="bubble">${inner}</div>
  </div>`;
}

function renderChat() {
  const p = curPerson(), th = curThread();
  const head = document.getElementById('cwHead');
  const hs = state.tab === 'askMe' ? '正在向「陈昊 的分身」提问' : `「${p.name} 的分身」· 7×24 在线`;
  head.innerHTML = `
    <div class="av ${p.cls}">${p.ini}${p.online ? '<span class="online"></span>' : ''}</div>
    <div><div class="hn">${p.name} <span class="pill">${p.role}</span></div><div class="hs">${hs}</div></div>
    ${p.memo ? `<div class="memo">${p.memo}</div>` : ''}`;
  const msgs = document.getElementById('msgs');
  msgs.innerHTML = `<div class="daydiv">${state.tab === 'askMe' ? '你的分身代你回答' : `你向 ${p.name} 的分身提问`}</div>` + th.msgs.map(msgHTML).join('');
  msgs.scrollTop = msgs.scrollHeight;
}

function renderChatEmpty() {
  document.getElementById('cwHead').innerHTML = '';
  document.getElementById('msgs').innerHTML = `<div class="empty-chat"><div class="e-ic">💬</div>选择左侧一条会话查看对话</div>`;
}

function selectPerson(id) {
  state.personId = id;
  const p = curPerson();
  // 选有内容的 tab，否则保持
  if (!p[state.tab].length) state.tab = p.askMe.length ? 'askMe' : (p.iAsk.length ? 'iAsk' : 'askMe');
  state.threadId = (curThreads()[0] || {}).id;
  renderPeople(); renderTabs(); renderThreads();
}

/* ============ tab 切换 ============ */
document.querySelectorAll('.tab').forEach(t => t.addEventListener('click', () => {
  state.tab = t.dataset.tab;
  state.threadId = (curThreads()[0] || {}).id;
  renderTabs(); renderThreads();
}));

/* ============ 发送消息（模拟） ============ */
const input = document.getElementById('composerInput');
const sendBtn = document.getElementById('sendBtn');
function send() {
  const v = input.value.trim();
  const th = curThread();
  if (!v || !th) return;
  th.msgs.push({ side: 'right', av: ME, type: 'text', text: v });
  input.value = '';
  renderChat();
}
if (sendBtn) sendBtn.addEventListener('click', send);
if (input) input.addEventListener('keydown', e => { if (e.key === 'Enter') send(); });

/* ============ 人员搜索过滤 ============ */
const psearch = document.getElementById('peopleSearch');
if (psearch) psearch.addEventListener('input', () => {
  const q = psearch.value.trim();
  document.querySelectorAll('.pitem').forEach(it => {
    const name = byId(it.dataset.id).name;
    it.style.display = name.includes(q) ? '' : 'none';
  });
});

/* ============ 初始化 ============ */
renderPeople(); renderTabs(); renderThreads();
