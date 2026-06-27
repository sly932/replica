'use client'

import { useState, useEffect } from 'react'
import { useReplica } from '@/lib/replicaContext'
import {
  getReplica, patchReplica,
  type ReplicaProfile,
} from '@/lib/api/manage'
import { alertDialog, promptDialog } from '@/lib/dialog'

const MBTI = ['INTJ', 'INTP', 'ENTJ', 'ENTP', 'INFJ', 'INFP', 'ENFJ', 'ENFP', 'ISTJ', 'ISFJ', 'ESTJ', 'ESFJ', 'ISTP', 'ISFP', 'ESTP', 'ESFP']

export default function ProfilePage() {
  const { currentId } = useReplica()
  const [p, setP] = useState<ReplicaProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [saved, setSaved] = useState(false)

  // 可编辑字段本地态
  const [gender, setGender] = useState('')
  const [bio, setBio] = useState('')
  const [hobbies, setHobbies] = useState<string[]>([])
  const [mbti, setMbti] = useState('')

  useEffect(() => {
    if (!currentId) return
    setLoading(true)
    getReplica(currentId).then((d) => {
      setP(d)
      setGender(d.gender || '')
      setBio(d.bio || '')
      setHobbies(d.hobbies || [])
      setMbti(d.mbti || '')
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [currentId])

  const addHobby = async () => {
    const h = await promptDialog('添加兴趣爱好：')
    if (h) setHobbies([...hobbies, h.trim()])
  }
  const delHobby = (i: number) => setHobbies(hobbies.filter((_, idx) => idx !== i))

  const save = async () => {
    try {
      await patchReplica(currentId, { gender, bio, hobbies, mbti })
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (e) {
      await alertDialog((e as Error).message)
    }
  }

  const org = p ? [p.org, p.team].filter(Boolean).join(' · ') : ''

  return (
    <div className="page show">
      <div className="wrap col">
        <div className="page-head row-head">
          <div><h1>个人资料</h1><p>基本信息不可改；下方个性化信息会让你的分身更像你</p></div>
        </div>
        <div className="profile scroll">
          {loading || !p ? (
            <div style={{ color: 'var(--mute)', padding: '12px 26px' }}>加载中…</div>
          ) : (
            <>
              <div className="pcard">
                <h3>基本信息（只读）</h3>
                <div className="field"><label>姓名</label><div className="val ro">{p.name} <span className="lock">🔒 不可修改</span></div></div>
                <div className="field"><label>MIS ID</label><div className="val ro">{p.mis_id || '-'} <span className="lock">🔒 不可修改</span></div></div>
                <div className="field"><label>组织</label><div className="val ro">{org || '-'} <span className="lock">🔒 不可修改</span></div></div>
                <div className="field"><label>角色</label><div className="val ro">{p.role || '-'} <span className="lock">🔒 不可修改</span></div></div>
              </div>
              <div className="pcard">
                <h3>个性化信息（可编辑）</h3>
                <div className="field"><label>性别</label>
                  <select className="sel" value={gender} onChange={(e) => setGender(e.target.value)}>
                    <option value="">未填写</option><option value="男">男</option><option value="女">女</option><option value="不愿透露">不愿透露</option>
                  </select>
                </div>
                <div className="field top"><label>个人简介</label>
                  <textarea className="ta" value={bio} onChange={(e) => setBio(e.target.value)} />
                </div>
                <div className="field"><label>兴趣爱好</label>
                  <div className="val tags">
                    {hobbies.map((h, i) => <span className="tagchip" key={i} onClick={() => delHobby(i)} title="点击删除">{h} ✕</span>)}
                    <span className="tagchip add" onClick={addHobby}>＋ 添加</span>
                  </div>
                </div>
                <div className="field"><label>MBTI</label>
                  <select className="sel narrow" value={mbti} onChange={(e) => setMbti(e.target.value)}>
                    <option value="">未填写</option>
                    {MBTI.map((m) => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
              </div>
              <div className="pcard">
                <button className="btn" onClick={save}>{saved ? '已保存 ✓' : '保存资料'}</button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
