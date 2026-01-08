import { Context, Session, h } from 'koishi'
import JX3API from 'jx3api-ts'
import { EffectiveConfig } from '../bind/types'
import { readFileSync, existsSync } from 'fs'
import { join, resolve } from 'path'
import {} from 'koishi-plugin-puppeteer'


export const name = 'jx3-vipfunction'


declare module 'koishi' {
  interface Context {
    runtime: {
      getEffectiveConfig: (session: Session) => Promise<EffectiveConfig>
    }
  }
}

export function applyVipFunction(ctx: Context) {
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

      //百战首领

    ctx.command('百战')
    .alias('百战首领')
    .action(async ({ session }) => {
      if (!session) return

      try {
        const client = await createClient(session)
        const res = await client.getActiveMonster()
        if (!res || !res.data) return '❌ 无法获取百战数据'

        const root = process.cwd()
        const tplDir = join(root, 'assets/template/baizhan')
        const htmlPath = join(tplDir, 'baizhan.html')
        const cssPath = join(tplDir, 'baizhan.css')
        const bossLogoDir = join(root, 'assets/bosslogo')

        const fullHtml = readFileSync(htmlPath, 'utf8')
        const cssContent = existsSync(cssPath) ? readFileSync(cssPath, 'utf8') : ''
        
        // --- 1. 提取零件 (从 script 标签中提取内容) ---
        const extractTpl = (id: string) => {
          const reg = new RegExp(`<script type="text/template" id="${id}">([\\s\\S]*?)<\\/script>`)
          const match = fullHtml.match(reg)
          return match ? match[1].trim() : ''
        }

        const bossTpl = extractTpl('TPL_BOSS')
        const imgTpl = extractTpl('TPL_IMG')
        const textTpl = extractTpl('TPL_TEXT')

        const gridSize = 10; const gap = 15; const itemSize = 100;
        let sortedItemsHtml: string[] = []; let pathPoints: string[] = []

        // --- 2. 遍历计算 ---
        for (let i = 0; i < 100; i++) {
          const m = res.data[i] || { name: '待定' }
          const row = Math.floor(i / gridSize)
          const col = (row % 2 === 0) ? (i % gridSize) : (gridSize - 1 - (i % gridSize))
          const gridPos = `grid-column: ${col + 1}; grid-row: ${row + 1};`

          const iconPath = join(bossLogoDir, `${m.name}.png`)
          let iconContent = ''
          if (existsSync(iconPath)) {
            const base64 = readFileSync(iconPath).toString('base64')
            iconContent = imgTpl.replace('SRC_VAL', `data:image/png;base64,${base64}`)
          } else {
            iconContent = textTpl.replace('CHAR_VAL', m.name.charAt(0))
          }

          sortedItemsHtml.push(
            bossTpl.replace('POS_VAL', gridPos)
                   .replace('IDX_VAL', (i + 1).toString())
                   .replace('ICON_VAL', iconContent)
                   .replace('NAME_VAL', m.name)
          )

          const x = col * (itemSize + gap) + (itemSize / 2)
          const y = row * (itemSize + gap) + (itemSize / 2)
          pathPoints.push(`${i === 0 ? 'M' : 'L'} ${x} ${y}`)
        }

        // --- 3. 最终填充并彻底移除 script 模板标签 ---
        const finalHtml = fullHtml
          .replace('', `<style>${cssContent}</style>`)
          .replace('<span id="TIME_VAL"></span>', new Date(res.start * 1000).toLocaleDateString())
          .replace('d="M0 0"', `d="${pathPoints.join(' ')}"`)
          .replace('', sortedItemsHtml.join('\n'))
          // 移除所有模板 script 标签，确保它们不占用页面空间
          .replace(/<script type="text\/template"[\s\S]*?<\/script>/g, '')

        // --- 4. 渲染输出 ---
        // @ts-ignore
        const image = await ctx.puppeteer.render(finalHtml)
        return h.image(image as any, 'image/png')
      } catch (e) {
        return `❌ 错误: ${e.message}`
      }
    })

    //阵营拍卖
  
  ctx.command('拍卖 [server:string]')
    .alias('阵营拍卖')
    .action(async ({ session }, server) => {
      if (!session) return

      // 1. 获取服务器参数
      const cfg = await getCfg(session)
      const target = server || cfg.server

      try {
        // 2. 调用 API (请根据你实际的 client 注入方式修改)
        const client = await createClient(session)
        const res = await client.getAuctionRecords({ server: target, limit: 10 })
        if (!res || !Array.isArray(res) || res.length === 0) {
          return `⚠️ 未找到 [${target}] 近期的拍卖记录。`
        }

        // 3. 路径解析：基于 process.cwd() 定位 paimai 文件夹
        const tplPath = resolve(process.cwd(), 'assets/template/paimai/auction.html')
        
        if (!existsSync(tplPath)) {
          return `❌ 找不到模板文件，请检查路径: ${tplPath}`
        }

        const fullHtml = readFileSync(tplPath, 'utf8')

        // 4. 提取零件模板
        const itemTplMatch = fullHtml.match(/<script type="text\/template" id="TPL_RECORD">([\s\S]*?)<\/script>/)
        const itemTpl = itemTplMatch ? itemTplMatch[1].trim() : ''

        // 5. 渲染列表
        const listHtml = res.slice(0, 15).map(item => {
          // 时间处理：秒级时间戳转可读时间
          const date = new Date(item.time * 1000)
          const timeStr = `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`
          
          return itemTpl
            .replace(/{{CAMP_NAME}}/g, item.camp_name || '中立')
            .replace('{{NAME}}', item.name)
            .replace('{{ROLE}}', item.role_name.split('@')[0])
            .replace('{{TIME}}', timeStr)
            .replace('{{AMOUNT}}', item.amount)
        }).join('\n')

        // 6. 注入并清理
        const finalHtml = fullHtml
          .replace(/{{SERVER}}/g, target)
          .replace('', listHtml)
          .replace(/<script[\s\S]*?<\/script>/g, '')

        // 7. Puppeteer 渲染输出
        // @ts-ignore
        const image = await ctx.puppeteer.render(finalHtml)
        return h.image(image as any, 'image/png')

      } catch (e) {
        return `❌ 拍卖记录获取失败: ${e.message}`
      }
    })

    //的卢记录

  ctx.command('的卢 [server:string]')
    .alias('的卢记录')
    .action(async ({ session }, server) => {
      if (!session) return

      // 如果未指定 server，target 为空字符串，API 通常会返回全服记录
      const target = server || ''

      try {
        // 使用你现有的 createClient 方法
        const client = await createClient(session)
        const res = await client.getDiluRecords({ server: target })

        // 1. 数据转换：确保 res 始终是数组（API 单服查询有时返回对象）
        let data = []
        if (Array.isArray(res)) {
          data = res
        } else if (res && typeof res === 'object') {
          data = [res]
        }

        if (data.length === 0) {
          return `⚠️ 未找到 [${target || '全服'}] 的的卢马记录。`
        }

        // 2. 定位模板（文件夹：paimai，文件名：dilu.html）
        const tplPath = resolve(process.cwd(), 'assets/template/paimai/dilu.html')
        if (!existsSync(tplPath)) {
          return `❌ 找不到模板文件，请检查路径: ${tplPath}`
        }

        const fullHtml = readFileSync(tplPath, 'utf8')

        // 3. 提取零件模板
        const itemTplMatch = fullHtml.match(/<script type="text\/template" id="TPL_DILU">([\s\S]*?)<\/script>/)
        const itemTpl = itemTplMatch ? itemTplMatch[1].trim() : ''

        // 4. 渲染数据列表（限制显示最近 12 条，防止图片过长）
        const listHtml = data.slice(0, 12).map(item => {
          // 时间处理：Unix秒级时间戳 -> 月-日 时:分
          const formatTime = (ts: number) => {
            if (!ts) return '--:--'
            const d = new Date(ts * 1000)
            return `${d.getMonth() + 1}-${d.getDate()} ${d.getHours()}:${d.getMinutes().toString().padStart(2, '0')}`
          }

          return itemTpl
            .replace(/{{SERVER}}/g, item.server)
            .replace('{{MAP}}', item.map_name)
            .replace('{{CAP_ROLE}}', item.capture_role_name || '尚未捕获')
            .replace('{{CAP_CAMP}}', item.capture_camp_name || '中立')
            .replace('{{AUC_ROLE}}', item.auction_role_name || '待拍')
            .replace('{{AMOUNT}}', item.auction_amount || '暂无报价')
            .replace('{{TIME}}', formatTime(item.capture_time || item.refresh_time))
        }).join('\n')

        // 5. 生成最终 HTML 并清理脚本
        const finalHtml = fullHtml
          .replace('{{TITLE}}', target ? `${target} 的卢纪要` : '全服 的卢巡察录')
          .replace('', listHtml)
          .replace(/<script[\s\S]*?<\/script>/g, '')

        // 6. 调用 Puppeteer 渲染
        // @ts-ignore
        const image = await ctx.puppeteer.render(finalHtml)
        return h.image(image as any, 'image/png')

      } catch (e) {
        return `❌ 的卢记录查询失败: ${e.message}`
      }
    })

    //烟花记录

  ctx.command('烟花 <server:string> <name:string>')
    .alias('烟花记录')
    .action(async ({ session }, server, name) => {
      if (!session) return

      // 严格检查必填参数
      if (!server || !name) {
        return '❌ 格式错误。请输入：烟花 [服务器] [角色名]\n示例：烟花 唯我独尊 风月'
      }

      const target = server
      const player = name
      

      try {
        const client = await createClient(session)
        const res = await client.getFireworksRecords({ server: target, name: player })

        const data = Array.isArray(res) ? res : (res ? [res] : [])
        if (data.length === 0) {
          return `🏮 [${server}] 侠士 [${name}] 近期未有烟花燃放纪录。`
        }

        const tplPath = resolve(process.cwd(), 'template/firework/fireworkrecords.html')
        if (!existsSync(tplPath)) {
          return `❌ 找不到模板文件：${tplPath}`
        }

        const fullHtml = readFileSync(tplPath, 'utf8')

        // 提取子模板并循环渲染
        const itemTplMatch = fullHtml.match(/<script type="text\/template" id="TPL_FIRE">([\s\S]*?)<\/script>/)
        const itemTpl = itemTplMatch ? itemTplMatch[1].trim() : ''

        const listHtml = data.slice(0, 15).map(item => {
          const date = new Date(item.time * 1000)
          const timeStr = `${date.getMonth() + 1}-${date.getDate()} ${date.getHours()}:${date.getMinutes().toString().padStart(2, '0')}`
          
          return itemTpl
            .replace(/{{SERVER}}/g, item.server)
            .replace(/{{FW_NAME}}/g, item.name)
            .replace('{{MAP}}', item.map_name)
            .replace('{{SENDER}}', item.sender)
            .replace('{{RECEIVE}}', item.receive)
            .replace('{{TIME}}', timeStr)
        }).join('\n')

        const finalHtml = fullHtml
          .replace('{{TITLE}}', `烟花纪·${name}`)
          .replace('', listHtml)
          .replace(/<script[\s\S]*?<\/script>/g, '')

        // @ts-ignore
        const image = await ctx.puppeteer.render(finalHtml)
        return h.image(image as any, 'image/png')

      } catch (e) {
        return `❌ 查询失败，请检查网络或服务器名是否正确: ${e.message}`
      }
    })

    //烟花统计

  ctx.command('烟花统计 <server:string> <name:string>')
    .action(async ({ session }, server, name) => {
      if (!session) return

      // 严格参数检查：必须提供服务器和烟花名称
      if (!server || !name) {
        return '❌ 格式错误。请输入：烟花统计 [服务器] [烟花名]\n示例：烟花统计 唯我独尊 真橙之心'
      }

      const target = server
      const firework = name

      try {
        const client = await createClient(session)
        // 注意：此处的 name 传给 API 是作为烟花名称查询
        const res = await client.getFireworksStatistical({ server: target, name: firework })

        const data = Array.isArray(res) ? res : (res ? [res] : [])
        if (data.length === 0) {
          return `🏮 [${server}] 近期暂无关于 [${name}] 的燃放统计。`
        }

        // 定位模板文件
        const tplPath = resolve(process.cwd(), 'template/firework/fireworkstatistical.html')
        if (!existsSync(tplPath)) {
          return `❌ 找不到模板文件：${tplPath}`
        }

        const fullHtml = readFileSync(tplPath, 'utf8')

        // 提取子模板
        const itemTplMatch = fullHtml.match(/<script type="text\/template" id="TPL_STAT">([\s\S]*?)<\/script>/)
        const itemTpl = itemTplMatch ? itemTplMatch[1].trim() : ''

        // 统计总数并渲染列表
        const totalCount = data.length
        const listHtml = data.slice(0, 15).map(item => {
          const date = new Date(item.time * 1000)
          const timeStr = `${date.getMonth() + 1}-${date.getDate()} ${date.getHours()}:${date.getMinutes().toString().padStart(2, '0')}`
          
          return itemTpl
            .replace(/{{SERVER}}/g, item.server)
            .replace(/{{FW_NAME}}/g, item.name)
            .replace('{{MAP}}', item.map_name)
            .replace('{{SENDER}}', item.sender)
            .replace('{{RECEIVE}}', item.receive)
            .replace('{{TIME}}', timeStr)
        }).join('\n')

        const finalHtml = fullHtml
          .replace('{{TITLE}}', `大唐烟花志 · ${name}`)
          .replace('{{COUNT}}', totalCount.toString())
          .replace('', listHtml)
          .replace(/<script[\s\S]*?<\/script>/g, '')

        // @ts-ignore
        const image = await ctx.puppeteer.render(finalHtml)
        return h.image(image as any, 'image/png')

      } catch (e) {
        return `❌ 统计失败，请检查参数是否正确: ${e.message}`
      }
    })

    //烟花汇总

  ctx.command('烟花汇总 <server:string>')
    .action(async ({ session }, server) => {
      if (!session) return

      const cfg = await getCfg(session)
      const target = server || cfg.server

      try {
        const client = await createClient(session)
        const res = await client.getFireworksCollect({ server: target })

      
}
