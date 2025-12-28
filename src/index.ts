import { Context } from 'koishi'
import { Config } from './config'             // 导入 Schema 值
import type { Config as ConfigType } from './config' // 导入接口类型
import { applyBind } from './bind/bind'
import { applyFreeFunction } from './JX3API/freefunction'
import { applyOtherFunction } from './JX3API/otherfunction'
import { applyWebSocket } from './websocket/websocket'
import { applyHandler } from './websocket/handler'
import { applyJx3boxMacro } from './JX3box/macro'
import { applyJx3boxAdventure } from './JX3box/adventure'



export const name = 'jx3-search'
export { Config }
export const inject = ['database']

export function apply(ctx: Context, config: ConfigType) {
  // --- [新增] 全局指令冷却逻辑 ---
  const cooldowns = new Map<string, number>()

  ctx.before('command/execute', ({ session, command }) => {
    if (!session?.userId || !command?.name) return
    
    // 排除不需要冷却的指令（如：帮助）
    if (['help'].includes(command.name)) return

    const now = Date.now()
    const key = `${session.userId}:${command.name}`
    const lastTime = cooldowns.get(key) || 0
    const interval = 5000 // 5秒冷却时间

    if (now - lastTime < interval) {
      const remaining = ((interval - (now - lastTime)) / 1000).toFixed(1)
      return `⚠️ 指令 [${command.name}] 冷却中，还剩 ${remaining} 秒。`
    }

    cooldowns.set(key, now)
  })

  // 定期清理内存缓存 (每小时清理一次)
  ctx.setInterval(() => {
    const now = Date.now()
    for (const [key, lastTime] of cooldowns.entries()) {
      if (now - lastTime > 5000) cooldowns.delete(key)
    }
  }, 1000 * 60 * 60)
  // --- [新增结束] ---

  // 1. 加载绑定模块 (必须最先加载以挂载 runtime 函数)
  applyBind(ctx, config)

  // 2. 加载免费查询指令 (日常、开服、科举等)
  applyFreeFunction(ctx)

  //3. 加载其他查询指令 (贴吧、成就等)
  applyOtherFunction(ctx)

  // 4. 加载 WebSocket 模块
  applyWebSocket(ctx)

  // 5. 加载消息处理模块
  applyHandler(ctx) 

  // 6. 加载剑三魔盒宏查询指令
  applyJx3boxMacro(ctx)

  // 7. 加载剑三魔盒奇遇攻略指令
  applyJx3boxAdventure(ctx)

  ctx.logger('jx3-search').info('剑网3查询插件已就绪（已启用全局 5s 指令冷却）')
}