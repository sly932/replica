import { IcSparkle, IcFolder, IcEdit } from '../../icons'
import { Toggle } from '../ui'

export default function MemoryPage() {
  return (
    <div className="page show">
      <div className="wrap col">
        <div className="page-head"><h1>记忆</h1><p>分身「越用越懂你」的依据，回答时按需召回</p></div>
        <div className="scroll">
          <div className="sect">通用记忆</div>
          <div className="sect-body">
            <div className="card"><div className="ico"><IcSparkle /></div><div className="body"><div className="t">我倾向用简洁、结论先行的方式回答技术问题</div><div className="meta"><span>来源：多次对话归纳</span></div></div><div className="acts"><span className="iconbtn"><IcEdit /></span><Toggle on /></div></div>
            <div className="card"><div className="ico"><IcSparkle /></div><div className="body"><div className="t">部署相关问题优先引用《部署手册》而非口头经验</div><div className="meta"><span>来源：本人设置</span></div></div><div className="acts"><span className="iconbtn"><IcEdit /></span><Toggle on /></div></div>
          </div>
          <div className="sect">领域记忆</div>
          <div className="sect-body pb">
            <div className="card"><div className="ico"><IcFolder /></div><div className="body"><div className="t">灵犀的灰度阈值默认 5%，大促期间收紧到 2%</div><div className="meta"><span>领域：部署 / 发布</span></div></div><div className="acts"><span className="iconbtn"><IcEdit /></span><Toggle on /></div></div>
            <div className="card"><div className="ico"><IcFolder /></div><div className="body"><div className="t">SSO 接入需先找账号权限中台（林晚）开白名单</div><div className="meta"><span>领域：跨组协作</span></div></div><div className="acts"><span className="iconbtn"><IcEdit /></span><Toggle on /></div></div>
          </div>
        </div>
      </div>
    </div>
  )
}
