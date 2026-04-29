import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// Simple frontmatter extractor — avoids extra dependencies for bootstrap
const extractAndStripFrontmatter = (content) => {
  const match = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/)
  if (!match) return { frontmatter: {}, content }

  const frontmatterStr = match[1]
  const body = match[2]
  const frontmatter = {}

  for (const line of frontmatterStr.split('\n')) {
    const colonIdx = line.indexOf(':')
    if (colonIdx > 0) {
      const key = line.slice(0, colonIdx).trim()
      const value = line.slice(colonIdx + 1).trim().replace(/^["']|["']$/g, '')
      frontmatter[key] = value
    }
  }

  return { frontmatter, content: body }
}

// Resolve repo root from plugin location (works for both git clone and npm install)
const resolveRepoRoot = () => {
  const pluginDir = path.resolve(__dirname)
  // When installed via git: plugin is at repo/.opencode/plugins/ or repo/opencode-plugin/
  // When installed via npm: plugin is at node_modules/forge-opencode/
  const gitRepoRoot = path.resolve(pluginDir, '../..')
  const npmRepoRoot = path.resolve(pluginDir)

  if (fs.existsSync(path.join(gitRepoRoot, 'skills', 'using-forge', 'SKILL.md'))) {
    return gitRepoRoot
  }
  return npmRepoRoot
}

const getBootstrapContent = (skillsDir) => {
  const skillPath = path.join(skillsDir, 'using-forge', 'SKILL.md')
  if (!fs.existsSync(skillPath)) return null

  const fullContent = fs.readFileSync(skillPath, 'utf8')
  const { content } = extractAndStripFrontmatter(fullContent)

  const toolMapping = `**Tool Mapping for OpenCode:**
When skills reference tools you don't have, substitute OpenCode equivalents:
- \`TodoWrite\` → \`todowrite\`
- \`Task\` tool with subagents → Use OpenCode's \`Task\` tool with \`subagent_type\`
- \`Skill\` tool → OpenCode's native \`skill\` tool
- \`Read\`, \`Write\`, \`Edit\`, \`Bash\` → Your native tools
- Plan directory: \`.forge/plan/\` (fallback: \`.opencode/plan/\`)

Use OpenCode's native \`skill\` tool to list and load skills.`

  return `<EXTREMELY_IMPORTANT>
You have forge installed.

**IMPORTANT: The using-forge skill content is included below. It is ALREADY LOADED — you are currently following it. Do NOT use the skill tool to load "using-forge" again — that would be redundant.**

${content}

${toolMapping}
</EXTREMELY_IMPORTANT>`
}

export const ForgePlugin = async ({ client }) => {
  const repoRoot = resolveRepoRoot()
  const skillsDir = path.join(repoRoot, 'skills')

  return {
    // Auto-register skills directory so OpenCode discovers forge skills
    // without manual symlinks or config file edits.
    config: async (config) => {
      config.skills = config.skills || {}
      config.skills.paths = config.skills.paths || []
      if (!config.skills.paths.includes(skillsDir)) {
        config.skills.paths.push(skillsDir)
      }
    },

    // Inject bootstrap into the first user message of each session.
    // Using a user message avoids token bloat from repeated system messages.
    'experimental.chat.messages.transform': async (_input, output) => {
      const bootstrap = getBootstrapContent(skillsDir)
      if (!bootstrap || !output.messages.length) return

      const firstUser = output.messages.find((m) => m.info.role === 'user')
      if (!firstUser || !firstUser.parts.length) return

      // Only inject once
      if (firstUser.parts.some((p) => p.type === 'text' && p.text.includes('EXTREMELY_IMPORTANT'))) {
        return
      }

      const ref = firstUser.parts[0]
      firstUser.parts.unshift({ ...ref, type: 'text', text: bootstrap })
    },

    // Preserve forge plan context across session compaction.
    'experimental.session.compacting': async (input, output) => {
      const planContext = `## Forge Context

If the user was in the middle of a forge workflow, preserve this state:

1. **Current plan** — Check ".forge/plan/" (or ".opencode/plan/").
   If a plan file exists, note its path and which steps are incomplete.

2. **Execution mode** — Was the user in in-session execution (executing-plans)
   or subagent-driven (subagent-execution)?

3. **Next action** — If a plan exists and isn't finished, the next skill to invoke
   is either "executing-plans" or "subagent-execution" depending on the mode chosen.

4. **Debugger state** — If the last step ended with an error, the debugger skill
   may need to be re-invoked on resume.`

      output.context.push(planContext)
    },
  }
}
