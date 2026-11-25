import type { PluginRegistry } from "../core/PluginRegistry.ts";
import type { Shape } from "./Shape.ts";

export class ShapeFactory {
  constructor(private readonly registry: PluginRegistry) {}

  create(type: string, id: string, params: string[]): Shape {
    const provider = this.registry.getShape(type.toLowerCase());
    if (!provider) throw new Error(`unknown shape type: ${type} (is the plugin loaded?)`);
    return provider.create(id, params);
  }
}
