// src/bind/types.ts
export interface GroupBind {
  groupId: string
  server: string
  ticket: string
  token: string
  wsToken: string
  pushes: Record<string, boolean>
}

export interface EffectiveConfig {
  server: string
  ticket: string
  token: string
  wsToken: string
  pushes: Record<string, boolean>
  isBind: boolean
}