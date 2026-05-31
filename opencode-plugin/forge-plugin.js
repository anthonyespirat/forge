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

// Resolve skills from npm package, source checkout, or .opencode/plugins layout.
const resolveSkillsDir = () => {
  const pluginDir = path.resolve(__dirname)
  const candidates = [
    path.join(pluginDir, '..', 'skills'),
    path.join(pluginDir, '..', '..', 'skills'),
    path.join(pluginDir, 'skills'),
  ]

  for (const skillsDir of candidates) {
    if (fs.existsSync(path.join(skillsDir, 'using-forge', 'SKILL.md'))) {
      return skillsDir
    }
  }

  return null
}

// Resolve agents directory from npm package, source checkout, or .opencode/plugins layout.
const resolveAgentsDir = () => {
  const pluginDir = path.resolve(__dirname)
  const candidates = [
    path.join(pluginDir, '..', 'agents'),
    path.join(pluginDir, '..', '..', 'agents'),
    path.join(pluginDir, 'agents'),
  ]

  for (const agentsDir of candidates) {
    if (fs.existsSync(agentsDir)) {
      const files = fs.readdirSync(agentsDir).filter(f => f.endsWith('.md'))
      if (files.length > 0) return agentsDir
    }
  }

  return null
}

// Map agent frontmatter tool names to OpenCode tool IDs.
// Agent .md files use platform-agnostic tool names; translate to OpenCode equivalents.
const mapToolToOpenCode = (tool) => {
  const map = {
    'Read': 'read',
    'Write': 'write',
    'Edit': 'edit',
    'Bash': 'bash',
    'Glob': 'glob',
    'Grep': 'grep',
    'Task': 'task',
    'WebFetch': 'webfetch',
    'chrome-devtools': 'chrome-devtools',
  }
  return map[tool] || tool
}

// Load agent definitions from the agents/ directory and register them
// as OpenCode subagent configs so the Task tool can dispatch them by name.
const loadAgents = (agentsDir) => {
  if (!agentsDir) return {}

  const agents = {}
  const files = fs.readdirSync(agentsDir).filter(f => f.endsWith('.md'))

  for (const file of files) {
    const content = fs.readFileSync(path.join(agentsDir, file), 'utf8')
    const { frontmatter, content: body } = extractAndStripFrontmatter(content)
    const name = frontmatter.name || file.replace('.md', '')
    if (!name) continue

    const toolsEnabled = {}
    if (frontmatter.tools) {
      for (const tool of frontmatter.tools.split(',').map(t => t.trim())) {
        if (tool) {
          const opencodeTool = mapToolToOpenCode(tool)
          toolsEnabled[opencodeTool] = true
        }
      }
    }

    agents[name] = {
      mode: 'subagent',
      description: frontmatter.description || '',
      prompt: body.trim(),
      ...(Object.keys(toolsEnabled).length > 0 ? { tools: toolsEnabled } : {}),
    }
  }

  return agents
}

const getBootstrapContent = (skillsDir) => {
  if (!skillsDir) return null

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
  const skillsDir = resolveSkillsDir()
  const agentsDir = resolveAgentsDir()
  const agents = loadAgents(agentsDir)

  return {
    // Auto-register skills directory and agents so OpenCode discovers
    // forge skills and subagents without manual config file edits.
    config: async (config) => {
      if (!skillsDir) {
        console.warn('[forge] Skills directory not found; forge skills will not be auto-loaded.')
      } else {
        config.skills = config.skills || {}
        config.skills.paths = config.skills.paths || []
        if (!config.skills.paths.includes(skillsDir)) {
          config.skills.paths.push(skillsDir)
        }
      }

      if (Object.keys(agents).length > 0) {
        config.agent = config.agent || {}
        for (const [name, agentConfig] of Object.entries(agents)) {
          if (!config.agent[name]) {
            config.agent[name] = agentConfig
          }
        }
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
