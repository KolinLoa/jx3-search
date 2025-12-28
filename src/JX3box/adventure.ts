import { Context, h } from 'koishi'

export const name = 'jx3box-adventure'

interface AdventureItem {
  id: number
  name: string
}

export function applyJx3boxAdventure(ctx: Context) {
  let adventureCache: AdventureItem[] = []
  let isUpdating = false

  // 1. 递归爬取所有分页数据
  async function fetchAllAdventures(page = 1, accumulated: AdventureItem[] = []): Promise<AdventureItem[]> {
    try {
      const response = await ctx.http.get('https://node.jx3box.com/serendipities', {
        params: { per: 50, page: page, client: 'std' }
      })

      const list = response?.list || []
      if (list.length === 0) return accumulated

      // 这里的 szName 对应你测试成功的“名字”
      const formatted = list.map(item => ({
        id: item.dwID || item.id,
        name: item.szName || item.name
      }))

      const newAccumulated = [...accumulated, ...formatted]
      // 如果当前页满 50 条，继续爬下一页
      return list.length === 50 ? fetchAllAdventures(page + 1, newAccumulated) : newAccumulated
    } catch (e) {
      ctx.logger('jx3box').error(`[Adventure] 第 ${page} 页抓取失败:`, e.message)
      return accumulated
    }
  }

  // 更新缓存的主函数
  async function updateCache() {
    if (isUpdating) return
    isUpdating = true
    const data = await fetchAllAdventures()
    if (data.length > 0) {
      adventureCache = data
      ctx.logger('jx3box').info(`[Adventure] 奇遇库同步成功，共加载 ${data.length} 条数据`)
    }
    isUpdating = false
  }

  // 2. 核心指令
  ctx.command('攻略 <name:string>', '获取剑三魔盒奇遇攻略链接')
    .alias('奇遇攻略')
    .action(async ({ session }, name) => {
      if (!name) return '请输入奇遇名称，例如：攻略 阴阳录'

      // 确保缓存有数据
      if (adventureCache.length === 0) await updateCache()

      // 特殊别名处理（针对那些名字和简称完全不沾边的奇遇）
      const specialAliases: Record<string, string> = {
        '摸头': '少年行',
        '青锋': '三尺青锋',
        '厨神': '炼狱厨神',
        '茶馆': '茶馆次轮',
        '老头': '雪山恩仇'
      }
      const searchName = specialAliases[name] || name

      // 搜索逻辑：优先全等匹配，其次包含匹配
      const target = adventureCache.find(a => a.name === searchName) || 
                     adventureCache.find(a => a.name.includes(searchName))

      if (target) {
        const url = `https://www.jx3box.com/adventure/${target.id}`
        return [
          h('quote', { id: session?.messageId }),
          `📜 ${h('b', target.name)} · 奇遇攻略`,
          '━━━━━━━━━━━━━━',
          `🔗 ${url}`,
          '━━━━━━━━━━━━━━',
          `💡 提示：点击链接查看触发条件与任务流程。`
        ].join('\n')
      }

      return `🔍 未能找到关于“${name}”的奇遇。如果是新奇遇，请尝试输入全称或稍后再试。`
    })

  // 3. 自动化任务
  ctx.on('ready', () => updateCache())
  // 每天凌晨 4 点自动刷新（剑三日常维护时间）
  ctx.setInterval(() => updateCache(), 24 * 60 * 60 * 1000)
}