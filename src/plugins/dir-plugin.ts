import type { PluginRegistry } from "../core/PluginRegistry.ts";
import { DirCommand } from "./dir.ts";

export default {
  async activate(registry: PluginRegistry): Promise<void> {
    registry.registerCommand(new DirCommand());
  }
};