import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { PluginRegistry } from "../core/PluginRegistry.ts";

export interface PluginConfigEntry {
  module: string;
  options?: unknown;
  enabled?: boolean;
}
export interface PluginConfig { plugins: PluginConfigEntry[] }
interface Manifest { name?: string; contributes?: Partial<Record<"shapes" | "commands" | "decorators" | "attributes", string[]>> }
interface PluginExport { default?: { activate(registry: PluginRegistry, options?: unknown): void } }

export class PluginLoader {
  async load(configPath: string, registry: PluginRegistry): Promise<void> {
    let config: PluginConfig;
    try {
      config = JSON.parse(readFileSync(resolve(configPath), "utf8")) as PluginConfig;
      if (!Array.isArray(config.plugins) || config.plugins.some((p) => !p || typeof p.module !== "string")) throw new Error();
    } catch {
      console.error("error: invalid plugin config");
      return;
    }
    for (const entry of config.plugins) {
      if (entry.enabled === false) continue;
      const require = createRequire(pathToFileURL(resolve(configPath)));
      let resolved: string;
      try { resolved = require.resolve(entry.module); }
      catch { console.error(`error: plugin not found: ${entry.module}`); continue; }
      let manifest: Manifest;
      try {
        let dir = dirname(resolved);
        while (true) {
          try { manifest = JSON.parse(readFileSync(resolve(dir, "package.json"), "utf8")) as Manifest; break; }
          catch { const parent = dirname(dir); if (parent === dir) throw new Error("package.json missing"); dir = parent; }
        }
      } catch { manifest = {}; }
      let module: PluginExport;
      try { module = await import(pathToFileURL(resolved).href) as PluginExport; }
      catch (error) { console.error(`error: plugin failed to activate: ${entry.module} (${String(error)})`); continue; }
      if (!module.default) { console.error(`error: plugin has no default export: ${entry.module}`); continue; }
      const staged = new PluginRegistry();
      try { module.default.activate(staged, entry.options); }
      catch (error) { console.error(`error: plugin failed to activate: ${manifest.name ?? entry.module} (${String(error)})`); continue; }
      const declared = manifest.contributes ?? {};
      const registered = {
        shapes: staged.allShapes().map((x) => x.type),
        commands: staged.allCommands().map((x) => x.name),
        decorators: staged.allDecorators().map((x) => x.name),
        attributes: staged.allAttributeHandlers().map((x) => x.name),
      };
      if (JSON.stringify(normalize(declared)) !== JSON.stringify(normalize(registered))) {
        console.error(`error: plugin manifest mismatch: ${manifest.name ?? entry.module} (declared: ${JSON.stringify(normalize(declared))}, registered: ${JSON.stringify(normalize(registered))})`);
        continue;
      }
      try { registry.mergeFrom(staged); }
      catch (error) { console.error(`error: ${error instanceof Error ? error.message : String(error)}`); }
    }
  }
}

function normalize(value: Partial<Record<string, string[]>>): Record<string, string[]> {
  return Object.fromEntries(["shapes", "commands", "decorators", "attributes"].map((key) => [key, [...(value[key] ?? [])].sort()]));
}
