// src/JX3API/freeapi.ts

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

export function applyFreeApi(ctx: Context) {
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

  // ==================== 1. 日常查询 ====================
  ctx.command('日常 [server: string]')
    .alias('daily')
    .action(async ({ session }, server) => {
      if (!session) return
      const cfg = await getCfg(session)
      const target = server || cfg.server
      try {
        const client = await createClient(session)
        const d = await client.getActiveCalendar({ server: target }) as any
        if (!d || !d.date) return `❌ 查询失败：未能在服务器 [${target}] 获取数据。`

        return [
          h('quote', { id: session.messageId }),
          `📅 ${h('b', target)} · 今日日常`,
          `⏰ ${d.date} (${d.week})`,
          '━━━━━━━━━━━━━━',
          `⚔️ ${h('b', '核心日常')}`,
          ` ├ 大战：${d.war || '无'}`,
          ` ├ 战场：${d.battle || '无'}`,
          ` └ 矿车：${d.orecar || '无'}`,
          '',
          `👹 ${h('b', '世界首领')}`,
          ` └ ${d.leader || '当日无首领'}`,
          '',
          `🐾 ${h('b', '奇遇福缘')}`,
          ` ├ 宠物：${d.luck?.join('、') || '无'}`,
          ` └ 声望：${d.card?.join('、') || '无'}`,
          '',
          `📌 ${h('b', '周常预告')}`,
          `[公共] ${(d.team?.[0] || '无').split(';').filter(v => v && v !== '已删除').join(' | ')}`,
          `[秘境] ${(d.team?.[1] || '无').split(';').filter(v => v && v !== '已删除').join(' | ')}`,
        ].join('\n')
      } catch (e: any) { return `⚠️ 错误：${e.message}` }
    })

  // ==================== 2. 活动月历 ====================
  ctx.command('月历')
    .alias('monthly')
    .action(async ({ session }) => {
      if (!session) return
      try {
        const client = await createClient(session)
        const res = await client.getActiveListCalendar({ num: 7 }) as any
        const list = res.data
        if (!list) return '❌ 未能获取月历预告。'

        const lines = list.map(d => ` ├ ${d.date} (${d.week.replace('星期', '周')}) ❯ ${h('b', d.war)}`)
        return [
          h('quote', { id: session.messageId }),
          `📅 ${h('b', '未来七日大战预告')}`,
          '━━━━━━━━━━━━━━',
          ...lines,
          '━━━━━━━━━━━━━━',
          `💡 当前日期：${res.today?.year}-${res.today?.month}-${res.today?.day}`
        ].join('\n')
      } catch (e: any) { return `⚠️ 错误：${e.message}` }
    })

  // ==================== 3. 行侠事件 ====================
  ctx.command('行侠 [name: string]')
    .alias('celebs')
    .action(async ({ session }, name) => {
      if (!session) return
      try {
        const client = await createClient(session)
        const target = (name || '楚天社') as any
        const res = await client.getActiveCelebs({ name: target }) as any[]
        if (!res?.length) return `📍 [${target}] 当前无活动。`

        const lines = res.map(item => [
          `📍 ${h('b', item.map_name)} · ${item.event}`,
          ` ├ ⏰ 时间：${item.time}`,
          ` └ 🏛️ 地点：${item.site}`
        ].join('\n'))

        return [
          h('quote', { id: session.messageId }),
          `⚔️ ${h('b', target + ' · 行侠事件')}`,
          '━━━━━━━━━━━━━━',
          lines.join('\n\n'),
          '━━━━━━━━━━━━━━'
        ].join('\n')
      } catch (e: any) { return `⚠️ 错误：${e.message}` }
    })

  // ==================== 4. 科举答题 ====================
  ctx.command('科举 [subject: string]')
    .alias('exam', '答题')
    .action(async ({ session }, subject) => {
      if (!session || !subject) return '🔍 请输入关键词，例如：/科举 古琴'
      try {
        const client = await createClient(session)
        const res = await client.getExamAnswer({ subject: subject as any }) as any[]
        if (!res?.length) return `🧐 未找到“${subject}”相关的题目。`

        const lines = res.slice(0, 5).map((item, i) => `${i + 1}. ❓ ${h('b', item.question)}\n   💡 答案：${h('b', item.answer)}`)
        return [
          h('quote', { id: session.messageId }),
          `📖 ${h('b', '科举题库搜索')}`,
          '━━━━━━━━━━━━━━',
          lines.join('\n\n'),
          '━━━━━━━━━━━━━━',
          res.length > 5 ? `💡 仅展示前 5 条，共有 ${res.length} 条匹配结果。` : `✨ 查询完毕`
        ].join('\n')
      } catch (e: any) { return `⚠️ 错误：${e.message}` }
    })

  // ==================== 5. 家园鲜花 ====================
  ctx.command('鲜花 [server: string]')
    .alias('flowers')
    .action(async ({ session }, server) => {
      if (!session) return
      const cfg = await getCfg(session)
      const target = server || cfg.server
      try {
        const client = await createClient(session)
        const res = await client.getHomeFlower({ server: target }) as Record<string, any[]>
        if (!res || Object.keys(res).length === 0) return `🌸 未找到 [${target}] 鲜花数据。`

        const message = Object.entries(res).map(([map, flowers]) => {
          const flowerLines = flowers.map(f => {
            const icon = f.price >= 1.5 ? '🔥' : '🌸'
            return ` ${icon} ${h('b', f.name)} (${f.color}) ❯ ${h('b', f.price + '倍')} [${f.line?.join('/')}线]`
          })
          return `📍 ${h('b', map)}\n${flowerLines.join('\n')}`
        })

        return [
          h('quote', { id: session.messageId }),
          `🛒 ${h('b', target)} 鲜花特价报时`,
          '━━━━━━━━━━━━━━',
          message.join('\n\n'),
          '━━━━━━━━━━━━━━',
          '💡 收益倍数越高，出售越划算。'
        ].join('\n')
      } catch (e: any) { return `⚠️ 错误：${e.message}` }
    })

  // ==================== 6. 家园家具 ====================
  ctx.command('家具 [name: string]')
    .alias('furniture')
    .action(async ({ session }, name) => {
      if (!session || !name) return '🪑 请输入家具名称。'
      try {
        const client = await createClient(session)
        const res = await client.getHomeFurniture({ name: name as any }) as any
        const item = Array.isArray(res) ? res[0] : res
        if (!item?.name) return `❌ 未找到家具“${name}”。`

        return [
          h('quote', { id: session.messageId }),
          h.image(item.image),
          `🪑 ${h('b', item.name)}`,
          ` ├ 品质：${item.quality} | 限购：${item.limit}`,
          ` └ 来源：${item.source}`,
          '━━━━━━━━━━━━━━',
          `📊 属性：观${item.view} | 实${item.practical} | 坚${item.hard} | 风${item.geomantic} | 趣${item.interesting}`,
          '━━━━━━━━━━━━━━',
          `📖 ${h('i', item.tip || '暂无说明')}`
        ].join('\n')
      } catch (e: any) { return `⚠️ 错误：${e.message}` }
    })

  // ==================== 7. 器物图谱 ====================
  ctx.command('器物 [name: string]')
    .alias('travel')
    .action(async ({ session }, name) => {
      if (!session || !name) return '🐾 请输入地图名，如：/器物 万花'
      try {
        const client = await createClient(session)
        const res = await client.getHomeTravel({ name: name as any }) as any[]
        if (!res?.length) return `❌ 未找到“${name}”的器物产出。`

        const lines = res.map(item => `📦 ${h('b', item.name)}\n   └ 来源：${item.source}`)
        return [
          h('quote', { id: session.messageId }),
          `🐾 ${h('b', name + ' · 宠物游历产出')}`,
          '━━━━━━━━━━━━━━',
          lines.join('\n\n'),
          '━━━━━━━━━━━━━━'
        ].join('\n')
      } catch (e: any) { return `⚠️ 错误：${e.message}` }
    })

  // ==================== 8. 官方新闻 ====================
  ctx.command('新闻')
    .alias('news')
    .action(async ({ session }) => {
      if (!session) return
      try {
        const client = await createClient(session)
        const res = await client.getAllNews() as any[]
        const lines = res.slice(0, 5).map(item => `📅 ${item.date} [${item.class}]\n   ❯ ${h('b', item.title)}\n   🔗 ${item.url}`)
        return [
          h('quote', { id: session.messageId }),
          `📰 ${h('b', '剑网3 最新资讯')}`,
          '━━━━━━━━━━━━━━',
          lines.join('\n\n'),
          '━━━━━━━━━━━━━━'
        ].join('\n')
      } catch (e: any) { return `⚠️ 错误：${e.message}` }
    })

  // ==================== 9. 维护公告 ====================
  ctx.command('公告')
    .alias('announce')
    .action(async ({ session }) => {
      if (!session) return
      try {
        const client = await createClient(session)
        const res = await client.getNewsAnnounce() as any[]
        const lines = res.slice(0, 3).map(item => `📢 ${item.date} ${h('b', item.title)}\n🔗 ${item.url}`)
        return [
          h('quote', { id: session.messageId }),
          `📋 ${h('b', '版本更新公告')}`,
          '━━━━━━━━━━━━━━',
          lines.join('\n\n'),
          '━━━━━━━━━━━━━━'
        ].join('\n')
      } catch (e: any) { return `⚠️ 错误：${e.message}` }
    })

  // ==================== 10. 区服查询 ====================
  ctx.command('区服 [name: string]')
    .alias('serverinfo')
    .action(async ({ session }, name) => {
      if (!session) return
      const cfg = await getCfg(session)
      const target = name || cfg.server
      try {
        const client = await createClient(session)
        const res = await client.getServerMaster({ name: target }) as any
        if (!res?.name) return `❌ 未找到区服 [${target}]。`

        return [
          h('quote', { id: session.messageId }),
          `🌐 ${h('b', res.zone + ' · ' + res.name)}`,
          '━━━━━━━━━━━━━━',
          `⚖️ 阵营权重 (多玩)：`,
          ` ├ 🔵 浩气盟：${res.duowan?.["浩气盟"]?.[0] || 0}`,
          ` └ 🔴 恶人谷：${res.duowan?.["恶人谷"]?.[0] || 0}`,
          '',
          `📂 包含原小服：`,
          ` └ ${res.subordinate?.join('、') || '无'}`,
          '━━━━━━━━━━━━━━'
        ].join('\n')
      } catch (e: any) { return `⚠️ 错误：${e.message}` }
    })

  // ==================== 11. 开服检查 ====================
  ctx.command('开服 [server: string]')
    .alias('check')
    .action(async ({ session }, server) => {
      if (!session) return
      const cfg = await getCfg(session)
      const target = server || cfg.server
      try {
        const client = await createClient(session)
        const res = await client.getServerCheck({ server: target }) as any
        if (!res?.server) return `🖥️ 未找到服务器 [${target}]。`
        const isOpen = res.status === 1

        return [
          h('quote', { id: session.messageId }),
          `${isOpen ? '🟢' : '🔴'} ${h('b', res.zone + ' · ' + res.server)}`,
          '━━━━━━━━━━━━━━',
          `当前状态：${h('b', isOpen ? '服务器已开启' : '服务器维护中')}`,
          `更新时间：${res.time ? new Date(res.time * 1000).toLocaleString() : '未知'}`,
          '━━━━━━━━━━━━━━'
        ].join('\n')
      } catch (e: any) { return `⚠️ 错误：${e.message}` }
    })

  // ==================== 12. 查看状态 ====================
  ctx.command('状态 [server: string]')
    .alias('serverstatus')
    .action(async ({ session }, server) => {
      if (!session) return
      const cfg = await getCfg(session)
      const target = server || cfg.server
      try {
        const client = await createClient(session)
        const res = await client.getServerStatus({ server: target }) as any
        return [
          h('quote', { id: session.messageId }),
          `🖥️ ${h('b', res.zone + ' · ' + res.server)}`,
          '━━━━━━━━━━━━━━',
          `当前状态：${h('b', res.status || '未知')}`,
          '━━━━━━━━━━━━━━',
          `⏰ 查询时间：${new Date().toLocaleTimeString()}`
        ].join('\n')
      } catch (e: any) { return `⚠️ 错误：${e.message}` }
    })

  // ==================== 13. 技改记录 ====================
  ctx.command('技改')
    .alias('skillchange')
    .action(async ({ session }) => {
      if (!session) return
      try {
        const client = await createClient(session)
        const res = await client.getSkillRecords() as any[]
        const lines = res.slice(0, 3).map(item => `⚔️ ${h('b', item.title)}\n⏰ ${item.time}\n🔗 ${item.url}`)
        return [
          h('quote', { id: session.messageId }),
          `📑 ${h('b', '武学调整（技改）记录')}`,
          '━━━━━━━━━━━━━━',
          lines.join('\n\n'),
          '━━━━━━━━━━━━━━',
          `💡 点击链接查看详细数值调整。`
        ].join('\n')
      } catch (e: any) { return `⚠️ 错误：${e.message}` }
    })
}