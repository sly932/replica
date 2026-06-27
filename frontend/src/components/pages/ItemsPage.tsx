import { IcBulb, IcEdit, IcCheck } from '../../icons'
import { Toggle } from '../ui'

export default function ItemsPage() {
  return (
    <div className="page show">
      <div className="wrap">
        <div className="page-head"><h1>知识条目</h1><p>由「答不出→真人补答」与「长链路推理」自动沉淀的问答条目 · 待审批 1</p></div>
        <div className="list scroll">
          <div className="card">
            <div className="ico"><IcBulb /></div>
            <div className="body"><div className="t">灰度发布时 A/B 配置与默认配置冲突如何处理？</div><div className="d">以 A/B 实验配置为准，灰度阶段锁定实验分流；新版本默认配置仅对未命中实验的流量生效…（陈昊 本人补答）</div><div className="meta"><span>来源：真人补答 · 待回答 #1037</span><span className="chip wait">待审批</span></div></div>
            <div className="acts"><span className="iconbtn"><IcCheck /></span><Toggle /></div>
          </div>
          <div className="card">
            <div className="ico"><IcBulb /></div>
            <div className="body"><div className="t">值班告警 P0 的响应时限是多久？</div><div className="d">P0 5 分钟内响应、15 分钟内启动止损；超时自动升级到组长。</div><div className="meta"><span>来源：推理沉淀 · 已审批</span><span className="chip done">已启用</span></div></div>
            <div className="acts"><span className="iconbtn"><IcEdit /></span><Toggle on /></div>
          </div>
        </div>
      </div>
    </div>
  )
}
