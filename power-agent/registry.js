/**
 * Skill Registry — unified interface for registering and dispatching skills
 * Each skill implements: { name, description, tools(), execute(toolName, args) }
 */

export class SkillRegistry {
  constructor() {
    this._skills = new Map();
  }

  register(name, skill) {
    this._skills.set(name, skill);
  }

  get(name) {
    return this._skills.get(name);
  }

  getAll() {
    return Array.from(this._skills.values());
  }

  getAllTools() {
    const tools = [];
    for (const skill of this._skills.values()) {
      const skillTools = skill.tools();
      for (const tool of skillTools) {
        tools.push({
          ...tool,
          name: `${skill.name}_${tool.name}`,
        });
      }
    }
    return tools;
  }

  async execute(toolName, args) {
    for (const skill of this._skills.values()) {
      const prefix = `${skill.name}_`;
      if (toolName.startsWith(prefix)) {
        const localName = toolName.slice(prefix.length);
        const toolDef = skill.tools().find(t => t.name === localName);
        if (!toolDef) {
          return { success: false, error: `Tool '${localName}' not found in skill '${skill.name}'` };
        }
        try {
          const result = await skill.execute(localName, args);
          return { success: true, data: result };
        } catch (err) {
          return { success: false, error: err.message || String(err) };
        }
      }
    }
    return { success: false, error: `Tool '${toolName}' not found in any skill` };
  }
}
