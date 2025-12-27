import { Context } from 'koishi'
import { Config } from './config'             // 导入 Schema 值
import type { Config as ConfigType } from './config' // 导入接口类型
import { applyBind } from './bind/bind'
import { applyFreeApi } from './JX3API/freeapi'
import { applyWebSocket } from './websocket/websocket'
import { applyHandler } from './websocket/handler'

export const name = 'jx3-search'
export { Config }
export const inject = ['database']
export function apply(ctx: Context, config: ConfigType) {
  // 1. 加载绑定模块 (必须最先加载以挂载 runtime 函数)
  applyBind(ctx, config)

  // 2. 加载免费查询指令 (日常、开服、科举等)
  applyFreeApi(ctx)
  // 3. 加载 WebSocket 模块
  applyWebSocket(ctx)
  // 4. 加载消息处理模块
  applyHandler(ctx) 

  ctx.logger('jx3-search').info('剑网3查询插件已就绪')
}