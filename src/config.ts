import { Schema } from 'koishi'

/** 插件配置接口 - 所有必填项均已改为可选 */
export interface Config {
  ticket?: string
  token?: string
  wsToken?: string
  defaultServer: string
  推送: {
    奇遇报时: boolean
    抓马: boolean
    扶摇: boolean
    烟花: boolean
    玄晶报时: boolean
    追魂点名: boolean
    诛恶事件: boolean
    的卢: boolean
    前线战况: boolean
    帮会宣战: boolean
    领地宣战: boolean
    开服报时: boolean
    新闻资讯: boolean
    游戏更新: boolean
    八卦速报: boolean
    关隘首领: boolean
    云丛预告: boolean
  }
}

/** 插件配置模式 - 去掉了 .required() */
export const Config: Schema<Config> = Schema.object({
  // 去掉 .required()，改为 .default('') 以防止 undefined 导致的报错
  ticket: Schema.string().description('Ticket').default(''),
  token: Schema.string().description('Token').default(''),
  wsToken: Schema.string().description('WebSocket Token').default(''),
  
  defaultServer: Schema.string().description('默认服务器').default('飞龙在天'),

  推送: Schema.object({
    奇遇报时: Schema.boolean().default(false).description('奇遇报时'),
    抓马: Schema.boolean().default(false).description('马驹事件'),
    扶摇: Schema.boolean().default(false).description('扶摇事件'),
    烟花: Schema.boolean().default(false).description('烟花报时'),
    玄晶报时: Schema.boolean().default(false).description('玄晶报时'),
    追魂点名: Schema.boolean().default(false).description('追魂点名'),
    诛恶事件: Schema.boolean().default(false).description('诛恶事件'),
    的卢: Schema.boolean().default(false).description('的卢事件'),
    前线战况: Schema.boolean().default(false).description('攻防战况'),
    帮会宣战: Schema.boolean().default(false).description('帮会宣战'),
    领地宣战: Schema.boolean().default(false).description('领地宣战'),
    开服报时: Schema.boolean().default(false).description('开服报时'),
    新闻资讯: Schema.boolean().default(false).description('新闻资讯'),
    游戏更新: Schema.boolean().default(false).description('游戏更新'),
    八卦速报: Schema.boolean().default(false).description('八卦速报'),
    关隘首领: Schema.boolean().default(false).description('关隘首领'),
    云丛预告: Schema.boolean().default(false).description('云丛预告'),
  }).description('全局默认 WebSocket 推送管理').role('table'),
})