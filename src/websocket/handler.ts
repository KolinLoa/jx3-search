import { Context, h } from 'koishi'
import type { Config } from '../config'

export const name = 'jx3-websocket-handler'

declare module 'koishi' {
  interface Events {
    'jx3/ws-message'(raw: any): void
  }
}

const eventMap: Record<string, keyof Config['推送']> = {
  '1001': '奇遇报时', '1002': '抓马', '1003': '抓马',
  '1004': '扶摇', '1005': '扶摇', '1006': '扶摇',
  '1007': '烟花', '1008': '玄晶报时', '1009': '追魂点名',
  '1010': '诛恶事件', '1012': '的卢', '1013': '的卢', '1014': '的卢',
  '1108': '帮会宣战', '1109': '帮会宣战', '1110': '领地宣战', '1111': '领地宣战',
  '2001': '开服报时', '2002': '新闻资讯', '2003': '游戏更新', '2004': '八卦速报',
}

export function applyHandler(ctx: Context) {
  ctx.on('jx3/ws-message', async (raw: any) => {
    const code = raw.code?.toString()
    if (!code || !eventMap[code]) return

    const pushKey = eventMap[code]
    const data = raw.data || {}

    // 获取所有绑定配置
    const channels = await ctx.database.get('jx3_group_bind', {})

    for (const bind of channels) {
      try {
        // 校验开关：全局开关 或 数据库记录开关
        if (!bind.pushes || !bind.pushes[pushKey]) continue
        
        // 校验服务器：如果事件带了 server 字段，则只推送到绑定了该服务器的群
        // 只有全局事件（如新闻、更新）才忽略此校验
        if (data.server && data.server !== bind.server) continue

        let message: string | h = ''

        switch (code) {
          // --- 奇遇 ---
          case '1001':
            message = `✨ 奇遇报时\n【${data.name}】触发了《${data.event}》`
            break

          // --- 刷马/抓马 ---
          case '1002':
            message = `🐎 刷马预告\n约5~10分钟后有宝马良驹在【${data.map_name}】出没`
            break
          case '1003':
            message = `🐎 抓马快讯\n【${data.map_name}】的【${data.horse}】被【${data.name}】抓走了`
            break

          // --- 扶摇 ---
          case '1004':
            message = `☁️ 扶摇预告\n梅花桩试炼将在 ${data.time ? new Date(data.time * 1000).toLocaleTimeString() : '近期'} 开始`
            break
          case '1005':
            message = `☁️ 扶摇开始\n梅花桩试炼已经开始啦，侠士速去！`
            break
          case '1006':
            message = `☁️ 扶摇结束\n梅花桩试炼已结束。请【${Array.isArray(data.name) ? data.data.name.join('、') : '各位侠士'}】快去找唐文羽！`
            break

          // --- 烟花/玄晶 ---
          case '1007':
            message = `🎆 烟花报时\n${data.sender} 在 ${data.map_name} 为 ${data.receive} 燃放了【${data.name}】！`
            break
          case '1008':
            message = `💎 玄晶报时\n恭喜【${data.role_name}】在 ${data.map_name} 获得了【${data.name}】！`
            break

          // --- 追魂/诛恶 ---
          case '1009':
            message = `🎯 追魂点名\n请 [${data.name}·${data.subserver}] 侠士速来 ${data.realm}，有要事相商！`
            break
          case '1010':
            message = `⚔️ 诛恶事件\n诛恶事件触发！侠士可前往【${data.map_name}】一探究竟。`
            break

          // --- 的卢 ---
          case '1012':
            message = `🏇 的卢刷新\n的卢在 ${data.map_name} 现身，众侠士可前往捕获。`
            break
          case '1013':
            message = `🏇 的卢捕获\n侠士【${data.role_name}】在 ${data.map_name} 捕获了马驹【${data.name}】`
            break
          case '1014':
            message = `🏇 的卢拍卖\n侠士【${data.role_name}】以 ${data.amount} 获得了马驹【${data.name}】`
            break

          // --- 宣战 ---
          case '1108':
            message = `🚩 帮会宣战\n【${data.tong_a_name}】向【${data.tong_b_name}】发起了${data.hour}小时的野外宣战！`
            break
          case '1110':
            message = `🚩 领地宣战\n【${data.tong_a_name}】向【${data.tong_b_name}】发起了领地宣战，战场：${data.tong_map_name}`
            break

          // --- 系统/新闻 ---
          case '2001':
            message = `⚙️ 服务器状态\n【${data.server}】当前已 ${data.status === 1 ? '开服' : '维护'}。`
            break
          case '2002':
            message = `📰 官方新闻\n标题：${data.title}\n链接：${data.url}`
            break
          case '2003':
            message = `🔧 游戏更新\n检测到新版本：${data.new_version}\n更新包大小：${data.package_size}`
            break
          case '2004':
            message = `💬 八卦速报\n${data.title}\n来自：${data.name}吧\n链接：${data.url}`
            break

          default:
            message = data.message || `收到事件消息(Code: ${code})`
        }

        const content = `[ 剑网3推送 · ${bind.server} ]\n----------------------\n${message}`
        await ctx.broadcast([bind.groupId], content)

      } catch (err) {
        ctx.logger('jx3-ws').warn(`向群组 ${bind.groupId} 推送失败:`, err)
      }
    }
  })
}