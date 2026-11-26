import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { PluginLoader } from "../src/loader/PluginLoader.ts";
import { PluginRegistry } from "../src/core/PluginRegistry.ts";

async function fixture(t: test.TestContext, pluginSource: string, declared: string[] = ["demo"]): Promise<{ config: string; registry: PluginRegistry; logs: string[] }> {
  const root = mkdtempSync(join(tmpdir(), "svg-loader-test-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  mkdirSync(join(root, "plugin"));
  writeFileSync(join(root, "plugin", "index.mjs"), pluginSource);
  writeFileSync(join(root, "plugin", "manifest.json"), JSON.stringify({ name: "test-plugin", contributes: { commands: declared } }));
  const config = join(root, "plugins.config.json");
  writeFileSync(config, JSON.stringify({ plugins: [{ module: "./plugin/index.mjs", manifest: "./plugin/manifest.json" }] }));
  const logs: string[] = [];
  const oldError = console.error;
  console.error = (...args: unknown[]) => logs.push(args.join(" "));
  t.after(() => { console.error = oldError; });
  return { config, registry: new PluginRegistry(), logs };
}

test("loader reports missing module", async (t) => {
  const f = await fixture(t, "export default {};", []);
  writeFileSync(f.config, JSON.stringify({ plugins: [{ module: "./missing.mjs" }] }));
  await new PluginLoader().load(f.config, f.registry);
  assert.match(f.logs.join("\n"), /error: plugin not found:/);
});

test("loader reports missing default export", async (t) => {
  const f = await fixture(t, "export const named = true;", []);
  await new PluginLoader().load(f.config, f.registry);
  assert.match(f.logs.join("\n"), /error: plugin has no default export:/);
});

test("loader reports manifest mismatch", async (t) => {
  const f = await fixture(t, 'export default { activate(r) { r.registerCommand({name:"other",description:"",execute() {}}); } };');
  await new PluginLoader().load(f.config, f.registry);
  assert.match(f.logs.join("\n"), /error: plugin manifest mismatch:/);
  assert.equal(f.registry.getCommand("other"), undefined);
});

test("loader rolls back registrations when activate throws", async (t) => {
  const f = await fixture(t, 'export default { activate(r) { r.registerCommand({name:"demo",description:"",execute() {}}); throw new Error("boom"); } };');
  await new PluginLoader().load(f.config, f.registry);
  assert.match(f.logs.join("\n"), /error: plugin failed to activate:/);
  assert.equal(f.registry.getCommand("demo"), undefined);
});

test("loader reports duplicate registration and leaves registry unchanged", async (t) => {
  const f = await fixture(t, 'export default { activate(r) { const c={name:"demo",description:"",execute() {}}; r.registerCommand(c); r.registerCommand(c); } };', []);
  await new PluginLoader().load(f.config, f.registry);
  assert.match(f.logs.join("\n"), /duplicate registration/);
  assert.equal(f.registry.getCommand("demo"), undefined);
});
