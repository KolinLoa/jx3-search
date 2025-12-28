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

      
}