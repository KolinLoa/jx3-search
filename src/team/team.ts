import { Context, h } from 'koishi'
import { readFileSync, existsSync } from 'fs'
import { join } from 'path'
import {} from 'koishi-plugin-puppeteer'

declare module 'koishi' {
  interface Tables {
    jx3_team: Raid
  }
}

interface Raid {
  id: number
  guildId: string
  localId: number
  leaderId: string
  name: string
  startTime: string
  members: { userId: string; nickname: string; role: string }[]
}

// 2. 完整的精准映射字典 (包含无相幽罗引)
const ROLE_DICT: Record<
  string,
  { official: string; type: 'tank' | 'healer' | 'dps'; icon: string }
> = {
  // ===== 七秀 =====
  '七秀': { official: '七秀', type: 'dps', icon: '七秀.png' },
  '冰心': { official: '冰心诀', type: 'dps', icon: '冰心诀.png' },
  '冰心诀': { official: '冰心诀', type: 'dps', icon: '冰心诀.png' },
  '奶秀': { official: '云裳心经', type: 'healer', icon: '云裳心经.png' },
  '云裳': { official: '云裳心经', type: 'healer', icon: '云裳心经.png' },
  '云裳心经': { official: '云裳心经', type: 'healer', icon: '云裳心经.png' },

  // ===== 万花 =====
  '万花': { official: '万花', type: 'dps', icon: '万花.png' },
  '花间': { official: '花间游', type: 'dps', icon: '花间游.png' },
  '花间游': { official: '花间游', type: 'dps', icon: '花间游.png' },
  '奶花': { official: '离经易道', type: 'healer', icon: '离经易道.png' },
  '离经': { official: '离经易道', type: 'healer', icon: '离经易道.png' },
  '离经易道': { official: '离经易道', type: 'healer', icon: '离经易道.png' },

  // ===== 天策 =====
  '天策': { official: '天策', type: 'tank', icon: '天策.png' },
  '傲血': { official: '傲血战意', type: 'dps', icon: '傲血战意.png' },
  '傲血战意': { official: '傲血战意', type: 'dps', icon: '傲血战意.png' },
  '铁牢': { official: '铁牢律', type: 'tank', icon: '铁牢律.png' },
  '铁牢律': { official: '铁牢律', type: 'tank', icon: '铁牢律.png' },

  // ===== 少林 =====
  '少林': { official: '少林', type: 'tank', icon: '少林.png' },
  '洗髓': { official: '洗髓经', type: 'tank', icon: '洗髓经.png' },
  '洗髓经': { official: '洗髓经', type: 'tank', icon: '洗髓经.png' },
  '易筋': { official: '易筋经', type: 'dps', icon: '易筋经.png' },
  '易筋经': { official: '易筋经', type: 'dps', icon: '易筋经.png' },

  // ===== 纯阳 =====
  '纯阳': { official: '纯阳', type: 'dps', icon: '纯阳.png' },
  '剑纯': { official: '太虚剑意', type: 'dps', icon: '太虚剑意.png' },
  '太虚': { official: '太虚剑意', type: 'dps', icon: '太虚剑意.png' },
  '太虚剑意': { official: '太虚剑意', type: 'dps', icon: '太虚剑意.png' },
  '气纯': { official: '紫霞功', type: 'dps', icon: '紫霞功.png' },
  '紫霞': { official: '紫霞功', type: 'dps', icon: '紫霞功.png' },
  '紫霞功': { official: '紫霞功', type: 'dps', icon: '紫霞功.png' },

  // ===== 五毒 =====
  '五毒': { official: '五毒', type: 'healer', icon: '五毒.png' },
  '毒经': { official: '毒经', type: 'dps', icon: '毒经.png' },
  '补天': { official: '补天诀', type: 'healer', icon: '补天诀.png' },
  '补天诀': { official: '补天诀', type: 'healer', icon: '补天诀.png' },
  '奶毒': { official: '补天诀', type: 'healer', icon: '补天诀.png' },

  // ===== 唐门 =====
  '唐门': { official: '唐门', type: 'dps', icon: '唐门.png' },
  '惊羽': { official: '惊羽诀', type: 'dps', icon: '惊羽诀.png' },
  '惊羽诀': { official: '惊羽诀', type: 'dps', icon: '惊羽诀.png' },
  '田螺': { official: '天罗诡道', type: 'dps', icon: '天罗诡道.png' },
  '天罗': { official: '天罗诡道', type: 'dps', icon: '天罗诡道.png' },
  '天罗诡道': { official: '天罗诡道', type: 'dps', icon: '天罗诡道.png' },

  // ===== 明教 =====
  '明教': { official: '明教', type: 'tank', icon: '明教.png' },
  '焚影': { official: '焚影圣诀', type: 'dps', icon: '焚影圣诀.png' },
  '焚影圣诀': { official: '焚影圣诀', type: 'dps', icon: '焚影圣诀.png' },
  '明尊': { official: '明尊琉璃体', type: 'tank', icon: '明尊琉璃体.png' },
  '明尊琉璃体': { official: '明尊琉璃体', type: 'tank', icon: '明尊琉璃体.png' },

  // ===== 丐帮 =====
  '丐帮': { official: '笑尘诀', type: 'dps', icon: '丐帮.png' },
  '笑尘诀': { official: '笑尘诀', type: 'dps', icon: '笑尘诀.png' },

  // ===== 苍云 =====
  '苍云': { official: '苍云', type: 'tank', icon: '苍云.png' },
  '分山': { official: '分山劲', type: 'dps', icon: '分山劲.png' },
  '分山劲': { official: '分山劲', type: 'dps', icon: '分山劲.png' },
  '铁骨': { official: '铁骨衣', type: 'tank', icon: '铁骨衣.png' },
  '铁骨衣': { official: '铁骨衣', type: 'tank', icon: '铁骨衣.png' },

  // ===== 长歌 =====
  '长歌': { official: '长歌', type: 'dps', icon: '长歌.png' },
  '莫问': { official: '莫问', type: 'dps', icon: '莫问.png' },
  '相知': { official: '相知', type: 'healer', icon: '相知.png' },
  '奶歌': { official: '相知', type: 'healer', icon: '相知.png' },

  // ===== 霸刀 =====
  '霸刀': { official: '北傲诀', type: 'dps', icon: '霸刀.png' },
  '北傲诀': { official: '北傲诀', type: 'dps', icon: '北傲诀.png' },

  // ===== 蓬莱 =====
  '蓬莱': { official: '凌海诀', type: 'dps', icon: '蓬莱.png' },
  '凌海诀': { official: '凌海诀', type: 'dps', icon: '凌海诀.png' },

  // ===== 凌雪阁 =====
  '凌雪': { official: '隐龙诀', type: 'dps', icon: '凌雪.png' },
  '隐龙诀': { official: '隐龙诀', type: 'dps', icon: '隐龙诀.png' },

  // ===== 衍天宗 =====
  '衍天': { official: '太玄经', type: 'dps', icon: '衍天.png' },
  '太玄经': { official: '太玄经', type: 'dps', icon: '太玄经.png' },

  // ===== 北天药宗 =====
  '药宗': { official: '药宗', type: 'healer', icon: '药宗.png' },
  '无方': { official: '无方', type: 'dps', icon: '无方.png' },
  '灵素': { official: '灵素', type: 'healer', icon: '灵素.png' },
  '药奶': { official: '灵素', type: 'healer', icon: '灵素.png' },

  // ===== 刀宗 =====
  '刀宗': { official: '孤锋诀', type: 'dps', icon: '刀宗.png' },
  '孤锋诀': { official: '孤锋诀', type: 'dps', icon: '孤锋诀.png' },

  // ===== 万灵山庄 =====
  '万灵': { official: '山海心诀', type: 'dps', icon: '万灵.png' },
  '山海心诀': { official: '山海心诀', type: 'dps', icon: '山海心诀.png' },

  // ===== 段氏 =====
  '段氏': { official: '周天功', type: 'dps', icon: '段氏.png' },
  '周天功': { official: '周天功', type: 'dps', icon: '周天功.png' },

  // ===== 无相楼 =====
  '无相楼': { official: '无相楼', type: 'dps', icon: '无相楼.png' },
  '无相': { official: '无相楼', type: 'dps', icon: '无相楼.png' },
  '幽罗引': { official: '幽罗引', type: 'dps', icon: '幽罗引.png' },
}


export const name = 'jx3-team'

export function applyJx3Team(ctx: Context) {
  ctx.model.extend('jx3_team', {
    id: 'unsigned',
    guildId: 'string',
    localId: 'unsigned',
    leaderId: 'string',
    name: 'string',
    startTime: 'string',
    members: 'json'
  }, { primary: 'id', ...({ autoIncrement: true } as any) })

  // 1. 发起开团
  ctx.command('发起开团 <name:string> <time:string>')
    .action(async ({ session }, name, time) => {
      if (!session?.guildId) return '❌ 请在群内使用'
      if (!name || !time) return '❌ 格式：发起开团 [团名] [时间]'

      const [latest] = await ctx.database.get('jx3_team', 
        { guildId: session.guildId }, 
        { sort: { localId: 'desc' }, limit: 1 }
      )
      const nextId = (latest?.localId || 0) + 1

      await ctx.database.create('jx3_team', {
        guildId: session.guildId, localId: nextId,
        leaderId: session.userId, name, startTime: time, members: []
      })
      return `✅ 开团成功！团号：${nextId}\n报名格式：报名 ${nextId} 游戏昵称 心法`
    })

  // 2. 报名 (游戏昵称在前，心法在后)
  ctx.command('报名 <localId:number> <nickname:string> <role:string>')
    .action(async ({ session }, localId, nickname, role) => {
      if (!session?.guildId) return '❌ 请在群内使用'
      if (!localId || !nickname || !role) return '❌ 格式：报名 [团号] [游戏昵称] [心法]'

      const [raid] = await ctx.database.get('jx3_team', { guildId: session.guildId, localId })
      if (!raid) return `❌ 未找到团号 ${localId}`

      const mapping = ROLE_DICT[role]
      const finalRole = mapping ? mapping.official : role

      const members = [...raid.members]
      const existingIndex = members.findIndex(m => m.userId === session.userId)

      if (existingIndex > -1) {
        members[existingIndex] = { userId: session.userId, nickname, role: finalRole }
      } else {
        if (members.length >= 25) return '❌ 团位已满'
        members.push({ userId: session.userId, nickname, role: finalRole })
      }

      await ctx.database.set('jx3_team', { guildId: session.guildId, localId }, { members })
      return `✅ 报名成功：[${nickname} - ${finalRole}]`
    })

  // 3. 查看名单 (已修改以对应游戏昵称)
  ctx.command('查看名单 <localId:number>')
    .alias('查看开团')
    .action(async ({ session }, localId) => {
      if (!session?.guildId || !session?.bot) return '❌ 请在群内使用'
      
      const [raid] = await ctx.database.get('jx3_team', { guildId: session.guildId, localId })
      if (!raid) return `❌ 未找到团号 ${localId}`

      const root = process.cwd()
      const tplDir = join(root, 'assets/template/team')
      const htmlPath = join(tplDir, 'jx3-team.html')
      const cssPath = join(tplDir, 'jx3-team.css')
      const logoDir = join(root, 'assets/rolelogo')

      const fullHtml = readFileSync(htmlPath, 'utf8')
      const cssContent = existsSync(cssPath) ? readFileSync(cssPath, 'utf8') : ''

      const itemTpl = fullHtml.match(/([\s\S]*?)/)?.[1]?.trim() || ''
      const emptyTpl = fullHtml.match(/([\s\S]*?)/)?.[1]?.trim() || ''

      const slotsHtml = Array.from({ length: 25 }, (_, i) => {
        const m = raid.members[i]
        const index = i + 1
        if (m) {
          const mapping = ROLE_DICT[m.role]
          const roleType = mapping ? mapping.type : 'dps'
          const iconName = mapping ? mapping.icon : `${m.role}.png`
          let iconPath = join(logoDir, iconName)
          if (!existsSync(iconPath)) iconPath = join(logoDir, 'default.png')

          const iconBase64 = existsSync(iconPath) 
            ? `data:image/png;base64,${readFileSync(iconPath).toString('base64')}` : ''

          return itemTpl
            .replace('{{TYPE}}', roleType).replace('{{INDEX}}', index.toString())
            .replace('{{ICON_BASE64}}', iconBase64).replace('{{LABEL}}', {tank:'T',healer:'奶',dps:'D'}[roleType])
            .replace('{{NICKNAME}}', m.nickname).replace('{{USER_ID}}', m.userId)
            .replace('{{OFFICIAL_NAME}}', m.role)
        }
        return emptyTpl.replace('{{INDEX}}', index.toString())
      }).join('\n')

      const finalHtml = fullHtml
        .replace(/[\s\S]*?/, '')
        .replace(/[\s\S]*?/, '')
        .replace('/* CSS_PLACEHOLDER */', cssContent)
        .replace('{{TITLE}}', raid.name).replace('{{TIME}}', raid.startTime)
        .replace('{{COUNT}}', raid.members.length.toString()).replace('{{LOCAL_ID}}', raid.localId.toString())
        .replace('{{GRID_CONTENT}}', slotsHtml).replace('{{LEADER}}', raid.leaderId)

      try {
        // @ts-ignore
        const image = await ctx.puppeteer.render(finalHtml)
        return h.image(image as any, 'image/png')
      } catch (e) { return `❌ 渲染失败: ${e.message}` }
    })
}