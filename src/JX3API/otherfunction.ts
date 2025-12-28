import { Context, Session, h } from 'koishi'
import JX3API from 'jx3api-ts'
import { EffectiveConfig } from '../bind/types'

declare module 'koishi' {
  interface Context {
    runtime: {
      getEffectiveConfig: (session: Session) => Promise<EffectiveConfig>
    }
  }
}

export function applyOtherFunction(ctx: Context) {
  /** 通用获取配置 */
  const getCfg = async (session: Session): Promise<EffectiveConfig> => {
    return await (ctx.runtime.getEffectiveConfig as any)(session)
  }

  /** 创建客户端 */
  const createClient = async (session: Session): Promise<InstanceType<typeof JX3API.JX3api>> => {
    const cfg = await getCfg(session)
    return new JX3API.JX3api({
      token: cfg.token || undefined,
      ticket: cfg.ticket || undefined,
    })
  }

  // --- 贴吧随机帖子 (吃瓜) ---
  ctx.command('吃瓜 [type:string]')
    .alias('818', '随机贴吧')
    .action(async ({ session }, type) => {
      if (!session) return

      try {
        const client = await createClient(session)
        const validClasses = ['818', '616', '鬼网三', '鬼网3', '树洞', '记录', '教程', '街拍', '故事', '避雷', '吐槽', '提问'] as const
        const targetClass = (validClasses.includes(type as any) ? type : '818') as typeof validClasses[number]

        const res = await client.getTiebaRandom({ 
          class: targetClass,
          server: '-' 
        }) as any

        const post = Array.isArray(res) ? res[0] : (res?.data?.[0] || res?.[0])
        if (!post || !post.url) return `❌ 查询失败：未能在 [${targetClass}] 分类下获取到贴子。`

        const postUrl = `https://tieba.baidu.com/p/${post.url}`

        return [
          h('quote', { id: session.messageId }),
          `📌 ${h('b', post.class || targetClass)} · 江湖百态`,
          `⏰ 投稿日期：${post.date}`,
          '━━━━━━━━━━━━━━',
          `📝 ${h('b', '标题')}`,
          ` ${post.title}`,
          '',
          `🔗 ${h('b', '贴吧链接')}`,
          ` ${postUrl}`,
          '━━━━━━━━━━━━━━',
          `💡 提示：输入“吃瓜 616”查询树洞。`
        ].join('\n')
      } catch (e: any) {
        return `⚠️ 错误：${e.response?.data?.msg || e.message}`
      }
    })

  // --- 骚话 ---
  ctx.command('骚话')
    .alias('说个骚话', '复制党')
    .action(async ({ session }) => {
      if (!session) return

      try {
        const client = await createClient(session)
        const res = await client.getSaohuaRandom() as any
        const data = res?.data || res

        if (!data || !data.text) return `❌ 查询失败：未能获取到骚话内容。`

        return [
          h('quote', { id: session.messageId }),
          `💬 ${h('b', '随机骚话')}`,
          '━━━━━━━━━━━━━━',
          `${data.text}`,
          '━━━━━━━━━━━━━━',
          `💡 提示：纯属娱乐，请勿当真。`
        ].join('\n')
      } catch (e: any) {
        return `⚠️ 错误：${e.response?.data?.msg || e.message}`
      }
    })

  // --- 舔狗日记 ---
  ctx.command('舔狗日记')
    .alias('舔狗')
    .action(async ({ session }) => {
      if (!session) return

      try {
        const client = await createClient(session)
        const res = await (client as any).getSaohuaContent() as any
        const data = res?.data || res

        if (!data || !data.text) return `❌ 查询失败：日记本被撕碎了，没能找到内容。`

        return [
          h('quote', { id: session.messageId }),
          `📔 ${h('b', '舔狗日记')}`,
          '━━━━━━━━━━━━━━',
          `${data.text}`,
          '━━━━━━━━━━━━━━',
          `💡 提示：卑微不是爱，爱是平等的。`
        ].join('\n')
      } catch (e: any) {
        return `⚠️ 错误：${e.response?.data?.msg || e.message}`
      }
    })
}