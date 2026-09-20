import path from 'node:path'
import { Plugin } from '@opencode/plugin'

const PATCH_PATH_HEADER = /^\*\*\* (?:Add File|Update File|Delete File|Move to): (.+)$/gm

function targetsBackend(filePath: string, projectRoot: string) {
  const backendRoot = path.resolve(projectRoot, 'backend')
  const targetPath = path.resolve(projectRoot, filePath.trim())
  const relativePath = path.relative(backendRoot, targetPath)

  return relativePath === '' || (!relativePath.startsWith('..') && !path.isAbsolute(relativePath))
}

export default Plugin.define({
  id: 'flowsync.backend-protection',
  async setup(ctx) {
    await ctx.tool.hook('execute.before', (event) => {
      if (event.tool !== 'patch') return

      const patchText = (event.input as { patchText?: unknown }).patchText
      if (typeof patchText !== 'string') return

      for (const match of patchText.matchAll(PATCH_PATH_HEADER)) {
        const filePath = match[1]
        if (!filePath) continue

        if (targetsBackend(filePath, ctx.location.project.canonical)) {
          throw new Error(`Patch blocked: backend is read-only (${filePath.trim()})`)
        }
      }
    })
  },
})
