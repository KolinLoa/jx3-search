import { Context, Session, h } from 'koishi'
import type { Config } from '../config'
import { EffectiveConfig } from './types'

declare module 'koishi' {
  interface Tables {
    jx3_group_bind: {
      groupId: string
      server: string
      ticket: string
      token: string
      wsToken: string
      pushes: Record<string, boolean>
    }
  }
  interface Context {
    runtime: {
      getEffectiveConfig: (session: Session) => Promise<EffectiveConfig>
    }
  }
}

export function applyBind(ctx: Context, config: Config) {
  ctx.model.extend('jx3_group_bind', {
    groupId: 'string',
    server: 'string',
    ticket: 'string',
    token: 'string',
    wsToken: 'string',
    pushes: 'json',
  }, {
    primary: 'groupId',
  })

  ctx.runtime.getEffectiveConfig = async (session: Session): Promise<EffectiveConfig> => {
    if (!session?.guildId && !session?.channelId) {
      return { server: config.defaultServer, ticket: config.ticket, token: config.token, wsToken: config.wsToken, pushes: { ...config.推送 }, isBind: false }
    }
    const groupId = session.guildId || session.channelId!
    const [bind] = await ctx.database.get('jx3_group_bind', { groupId })
    if (bind) {
      return {
        server: bind.server ?? config.defaultServer,
        ticket: bind.ticket ?? config.ticket,
        token: bind.token ?? config.token,
        wsToken: bind.wsToken ?? config.wsToken,
        pushes: (bind.pushes as any) ?? { ...config.推送 },
        isBind: true,
      }
    }
    return { server: config.defaultServer, ticket: config.ticket, token: config.token, wsToken: config.wsToken, pushes: { ...config.推送 }, isBind: false }
  }

  // ==================== 指令部分优化 ====================
  
  // 1. 修改主命令定义，使其支持直接输入 server
  const cmd = ctx.command('jx3bind [server:string]', '剑网3 绑定管理')
    .alias('剑网3绑定')
    .action(async ({ session }, server) => {
      // 如果没有输入参数，显示当前绑定状态
      const groupId = session!.guildId || session!.channelId!
      const cfg = await ctx.runtime.getEffectiveConfig(session!)

      if (!server) {
        return [
          h('quote', { id: session?.messageId }),
          `📌 ${h('b', '本群绑定状态')}`,
          '━━━━━━━━━━━━━━',
          `服务器：${h('b', cfg.server)} ${cfg.isBind ? '✅' : '⚙️(默认)'}`,
          `推送状态：使用 .push 查看`,
          '━━━━━━━━━━━━━━',
          `💡 输入 [jx3bind 服务器名] 进行绑定`,
        ].join('\n')
      }

      // 执行绑定逻辑
      const [existing] = await ctx.database.get('jx3_group_bind', { groupId })
      await ctx.database.upsert('jx3_group_bind', [{
        groupId,
        server,
        ticket: existing?.ticket ?? config.ticket,
        token: existing?.token ?? config.token,
        wsToken: existing?.wsToken ?? config.wsToken,
        pushes: existing?.pushes ?? { ...config.推送 },
      }])
      return `✅ 本群默认服务器已设置为：${h('b', server)}`
    })

  // 2. 推送配置子命令
  cmd.subcommand('.push <action:string> <items...>', '开启/关闭推送项目')
    .alias('推送')
    .action(async ({ session }, action, ...items) => {
      const on = ['on', '开', '开启', 'true'].includes(action!.toLowerCase())
      const off = ['off', '关', '关闭', 'false'].includes(action!.toLowerCase())
      if (!on && !off) return '❌ 请指定动作：开/关 或 on/off'

      const nameToKey: Record<string, keyof Config['推送']> = {
        奇遇: '奇遇报时', 抓马: '抓马', 扶摇: '扶摇', 烟花: '烟花',
        玄晶: '玄晶报时', 追魂: '追魂点名', 诛恶: '诛恶事件', 的卢: '的卢',
        前线: '前线战况', 帮战: '帮会宣战', 领战: '领地宣战', 开服: '开服报时',
        新闻: '新闻资讯', 更新: '游戏更新', 八卦: '八卦速报', 关隘: '关隘首领',
        云丛: '云丛预告',
      }

      const groupId = session!.guildId || session!.channelId!
      const [bind] = await ctx.database.get('jx3_group_bind', { groupId })
      const currentPushes = { ...(bind?.pushes ?? config.推送) }

      const changed: string[] = []
      for (const item of items) {
        const key = nameToKey[item]
        if (key) {
          currentPushes[key] = on
          changed.push(item)
        }
      }

      if (changed.length === 0) return '❓ 未找到匹配的推送项目（可选：奇遇、抓马、开服等）'
      
      await ctx.database.upsert('jx3_group_bind', [{
        groupId,
        server: bind?.server ?? config.defaultServer,
        ticket: bind?.ticket ?? config.ticket,
        token: bind?.token ?? config.token,
        wsToken: bind?.wsToken ?? config.wsToken,
        pushes: currentPushes,
      }])
      return `✅ 已${on ? '开启' : '关闭'}推送：${changed.join('、')}`
    })

  // 3. 重置子命令
  cmd.subcommand('.reset', '清除本群所有独立配置')
    .alias('重置绑定')
    .action(async ({ session }) => {
      const groupId = session!.guildId || session!.channelId!
      await ctx.database.remove('jx3_group_bind', { groupId })
      return '🔄 本群配置已重置为全局默认值。'
    })
}