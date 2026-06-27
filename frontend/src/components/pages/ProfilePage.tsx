export default function ProfilePage() {
  return (
    <div className="page show">
      <div className="wrap col">
        <div className="page-head"><h1>个人资料</h1><p>基本信息不可改；下方个性化信息会让你的分身更像你</p></div>
        <div className="profile scroll">
          <div className="pcard">
            <h3>基本信息（只读）</h3>
            <div className="field"><label>姓名</label><div className="val ro">陈昊 <span className="lock">🔒 不可修改</span></div></div>
            <div className="field"><label>MIS ID</label><div className="val ro">chenhao01 <span className="lock">🔒 不可修改</span></div></div>
            <div className="field"><label>组织</label><div className="val ro">星澜科技 · 智能产品线 · 灵犀客服组 <span className="lock">🔒 不可修改</span></div></div>
          </div>
          <div className="pcard">
            <h3>个性化信息（可编辑）</h3>
            <div className="field"><label>性别</label><select className="sel" defaultValue="男"><option>男</option><option>女</option><option>不愿透露</option></select></div>
            <div className="field top"><label>个人简介</label><textarea className="ta" defaultValue="灵犀客服后端负责人，主攻高并发与发布稳定性，乐于把踩过的坑写成文档。" /></div>
            <div className="field"><label>兴趣爱好</label><div className="val tags"><span className="tagchip">分布式系统</span><span className="tagchip">骑行</span><span className="tagchip">机械键盘</span><span className="tagchip add">＋ 添加</span></div></div>
            <div className="field"><label>MBTI</label><select className="sel narrow" defaultValue="ISTJ"><option>INTJ</option><option>INTP</option><option>ENTJ</option><option>ISTJ</option><option>…</option></select></div>
          </div>
        </div>
      </div>
    </div>
  )
}
