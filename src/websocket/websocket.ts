import { Context } from 'koishi'
import JX3API from 'jx3api-ts'
import type { Config } from '../config'

export const name = 'jx3-websocket'


export function applyWebSocket(ctx: Context) {
  // 定义定时器变量
  let reconnectTimer: NodeJS.Timeout

  const connect = () => {
    // 如果插件已经卸载或停用，直接退出
    if (!ctx.scope.isActive) return

    const wsToken = (ctx.config as Config).wsToken

    const ws = new JX3API.JX3ws({
      wsUrl: 'wss://socket.jx3api.com',
      wstoken: wsToken || '',
    })

    if (wsToken) {
      ctx.logger('jx3-ws').info('WebSocket 已连接 (Token 模式)')
    } else {
      ctx.logger('jx3-ws').info('WebSocket 已连接 (基础模式)')
    }

    ws.on('message', (data: any) => {
      ctx.emit('jx3/ws-message', data)
    })

    ws.on('error', (err: any) => {
      ctx.logger('jx3-ws').error('WebSocket 错误:', err)
    })

    ws.on('close', () => {
      // 检查当前 context 作用域是否存活
      if (!ctx.scope.isActive) {
        ctx.logger('jx3-ws').info('插件已卸载，停止重连')
        return
      }

      ctx.logger('jx3-ws').warn('WebSocket 连接关闭，10秒后尝试重连...')
      
      // 清除旧的定时器防止堆叠
      if (reconnectTimer) clearTimeout(reconnectTimer)
      
      // 只有在插件活跃时才设置新的重连
      reconnectTimer = setTimeout(() => {
        connect()
      }, 10000)
    })
  }

  // 1. 第一次启动连接
  ctx.on('ready', () => {
    connect()
  })

  // 2. 插件卸载时的资源回收
  ctx.on('dispose', () => {
    if (reconnectTimer) {
      clearTimeout(reconnectTimer)
      ctx.logger('jx3-ws').info('已清除 WebSocket 重连定时器')
    }
    // 注意：由于 JX3ws 没有公开 close() 方法，
    // 我们只需确保它触发 close 事件后不再进入 connect() 循环即可。
  })
}