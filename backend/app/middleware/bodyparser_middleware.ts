import BodyParserMiddleware from '@adonisjs/core/bodyparser_middleware'
import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'
import bodyParserConfig from '#config/bodyparser'

export default class AppBodyParserMiddleware {
  private defaultParser = new BodyParserMiddleware(bodyParserConfig)
  private taskParser = new BodyParserMiddleware({
    ...bodyParserConfig,
    json: { ...bodyParserConfig.json, trimWhitespaces: false },
    form: { ...bodyParserConfig.form, trimWhitespaces: false },
    multipart: { ...bodyParserConfig.multipart, trimWhitespaces: false },
  })
  private dateParser = new BodyParserMiddleware({
    ...bodyParserConfig,
    json: { ...bodyParserConfig.json, trimWhitespaces: false, convertEmptyStringsToNull: false },
    form: { ...bodyParserConfig.form, trimWhitespaces: false, convertEmptyStringsToNull: false },
    multipart: {
      ...bodyParserConfig.multipart,
      trimWhitespaces: false,
      convertEmptyStringsToNull: false,
    },
  })

  handle(ctx: HttpContext, next: NextFn) {
    if (ctx.request.method() === 'PATCH' && ctx.route?.pattern === '/api/v1/tasks/:id/due-date') {
      return this.dateParser.handle(ctx, next)
    }
    const preserveTaskText =
      ctx.request.method() === 'POST' && ctx.route?.pattern === '/api/v1/tasks'
    return (preserveTaskText ? this.taskParser : this.defaultParser).handle(ctx, next)
  }
}
