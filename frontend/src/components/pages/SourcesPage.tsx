import { useState } from 'react'
import { IcDoc, IcEdit } from '../../icons'
import { Toggle } from '../ui'

interface Doc { t: string; d: string; u: string; time: string; on: boolean }
const INIT: Doc[] = [
  { t: '灵犀部署手册 v2.3', d: '容器化灰度发布全流程：构建、预发验证、5% 灰度、全量与回滚。', u: 'docs.xinglan.com/lingxi/deploy', time: '更新于 3 天前', on: true },
  { t: '值班 SOP', d: '告警分级、响应时限、升级路径与值班交接清单。', u: 'docs.xinglan.com/lingxi/oncall', time: '更新于 1 周前', on: true },
  { t: '系统架构设计', d: '灵犀整体架构、核心模块依赖与对中台（账号/推送/MaaS）的调用关系。', u: 'docs.xinglan.com/lingxi/arch', time: '更新于 2 周前', on: true },
  { t: '踩坑记录（草稿）', d: '历史线上问题归档，部分内容可能过时，暂不对外开放。', u: 'docs.xinglan.com/lingxi/pitfalls', time: '更新于 2 个月前', on: false },
]

export default function SourcesPage() {
  const [docs, setDocs] = useState<Doc[]>(INIT)
  const upload = () => {
    const u = prompt('输入系统文档链接（如 docs.xinglan.com/lingxi/xxx）：')
    if (!u) return
    setDocs([{ t: '新文档（解析中…）', d: '已提交，正在切块向量化入库。', u, time: '刚刚', on: true }, ...docs])
  }
  return (
    <div className="page show">
      <div className="wrap">
        <div className="page-head row-head">
          <div><h1>知识来源</h1><p>分身回答只引用这里「已启用」的文档 · 共 {docs.length} 篇</p></div>
          <button className="btn" onClick={upload}>＋ 上传文档</button>
        </div>
        <div className="list scroll">
          {docs.map((d, i) => (
            <div className="card" key={i}>
              <div className="ico"><IcDoc /></div>
              <div className="body"><div className="t">{d.t}</div><div className="d">{d.d}</div><div className="meta"><span>🔗 {d.u}</span><span>{d.time}</span></div></div>
              <div className="acts"><span className="iconbtn"><IcEdit /></span><Toggle on={d.on} /></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
