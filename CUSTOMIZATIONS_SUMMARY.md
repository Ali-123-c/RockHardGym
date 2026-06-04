# GymFlow Agent Customizations

Generated customizations for the GymFlow gym management system. These files help Copilot understand project conventions and provide context-aware suggestions.

## 📁 Workspace Customizations (.github/)

### Agent Instructions
- **`copilot-instructions.md`** – Project-wide guidelines for all GymFlow development

### File-Specific Instructions
- **`instructions/api-routes.instructions.md`** – Auto-loaded for `src/app/api/**`
- **`instructions/react-components.instructions.md`** – Auto-loaded for `src/components/**`
- **`instructions/database.instructions.md`** – Auto-loaded for `database/**`

### Skills (On-Demand Workflows)
- **`skills/component-generation/SKILL.md`** – Generate React components with `/component-generation`
- **`skills/supabase-setup/SKILL.md`** – Database setup help with `/supabase-setup`

### Prompts (Quick Tasks)
- **`prompts/generate-tests.prompt.md`** – Generate test cases with `/generate-tests`
- **`prompts/api-documentation.prompt.md`** – Create API docs with `/api-documentation`
- **`prompts/code-review.prompt.md`** – Review code with `/code-review`

## 👤 User-Level Customizations (~/.copilot/prompts/)

These are personal, roam with your VS Code settings:

- **`gymflow-quickstart.prompt.md`** – Quick reference for starting work
- **`gymflow-preferences.instructions.md`** – Personal dev preferences
- **`refactor-code.prompt.md`** – Refactoring assistance
- **`explain-code.prompt.md`** – Code explanation and learning

## 🚀 Quick Start

### In GymFlow Workspace
1. Type `/` in chat to see available skills and prompts
2. Select `/component-generation` to create components
3. Select `/supabase-setup` for database help
4. File instructions auto-load when editing API routes, components, or database files

### In Any Project
1. Type `/refactor-code` to refactor code
2. Type `/explain-code` to understand code
3. Type `/gymflow-quickstart` when starting a session

## 📋 How They Work

| File Type | Trigger | Scope | Use Case |
|-----------|---------|-------|----------|
| **Agent Instructions** | Always active | Workspace | General project guidelines |
| **File Instructions** | Auto on file match | Workspace | Language/framework rules |
| **Skills** | `/skill-name` | Workspace | Multi-step workflows |
| **Prompts** | `/prompt-name` | Workspace or User | Single focused tasks |

## ✅ What's Customized

### Code Standards
- ✅ TypeScript conventions
- ✅ React component patterns
- ✅ Tailwind CSS usage
- ✅ Supabase query patterns
- ✅ API route structure
- ✅ Error handling
- ✅ Database schema

### Workflows
- ✅ Component generation
- ✅ API route scaffolding
- ✅ Test case creation
- ✅ Code review process
- ✅ Database setup
- ✅ Documentation

### Learning Resources
- ✅ Code explanations
- ✅ Pattern references
- ✅ Best practices
- ✅ Troubleshooting guides

## 🔧 Customization Locations

**Workspace** (committed to git, team-shared):
```
D:\GYM\.github/
├── copilot-instructions.md
├── instructions/*.instructions.md
├── skills/*/SKILL.md
└── prompts/*.prompt.md
```

**User** (personal, synced in VS Code):
```
~/.copilot/prompts/
├── gymflow-quickstart.prompt.md
├── gymflow-preferences.instructions.md
├── refactor-code.prompt.md
└── explain-code.prompt.md
```

## 📚 References

- **[Agent Instructions Docs](https://code.visualstudio.com/docs/copilot/customization/custom-instructions)**
- **[Skills Documentation](https://code.visualstudio.com/docs/copilot/customization/agent-skills)**
- **[Prompts Documentation](https://code.visualstudio.com/docs/copilot/customization/prompt-files)**
- **Project README**: `README.md`
- **Setup Guide**: `SETUP_GUIDE.md`

## 🎯 Next Steps

1. ✅ Customizations created
2. → Reload VS Code to recognize new files
3. → Type `/` in chat to see available commands
4. → Try `/component-generation` to test a skill
5. → Edit `src/app/api/members/route.ts` to see file instructions load

---

**Created**: June 2, 2026  
**Status**: Complete and ready to use  
**Coverage**: Full GymFlow project customization
