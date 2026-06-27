'use client'
// 全局「当前用户(当前分身)」：Workbench 提供，各管理页通过 useReplica() 跟随。
import { createContext, useContext } from 'react'

export interface ReplicaLite {
  id: string
  name: string
  role?: string
  org?: string
  team?: string
  mis_id?: string
}

interface ReplicaCtxType {
  currentId: string
  current?: ReplicaLite
  replicas: ReplicaLite[]
  setCurrentId: (id: string) => void
}

export const ReplicaContext = createContext<ReplicaCtxType>({
  currentId: '',
  replicas: [],
  setCurrentId: () => {},
})

export const useReplica = () => useContext(ReplicaContext)
