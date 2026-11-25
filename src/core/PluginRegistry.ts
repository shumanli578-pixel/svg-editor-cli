import type { AttributeHandler, Command, ShapeProvider, TreeDecorator } from "./ExtensionPoints.ts";

/** Stores extension implementations and rejects duplicate names per extension point. */
export class PluginRegistry {
  private readonly shapes = new Map<string, ShapeProvider>();
  private readonly commands = new Map<string, Command>();
  private readonly decorators = new Map<string, TreeDecorator>();
  private readonly attributeHandlers = new Map<string, AttributeHandler>();

  registerShape(value: ShapeProvider): void {
    if (this.shapes.has(value.type)) throw new Error(`duplicate registration: ${value.type}`);
    this.shapes.set(value.type, value);
  }
  getShape(type: string): ShapeProvider | undefined { return this.shapes.get(type); }

  registerCommand(value: Command): void {
    this.register(this.commands, value);
  }

  getCommand(name: string): Command | undefined {
    return this.commands.get(name);
  }

  allCommands(): Command[] {
    return [...this.commands.values()];
  }

  registerDecorator(value: TreeDecorator): void {
    this.register(this.decorators, value);
  }

  registerAttributeHandler(value: AttributeHandler): void {
    this.register(this.attributeHandlers, value);
  }

  private register<T extends { readonly name: string }>(registry: Map<string, T>, value: T): void {
    if (registry.has(value.name)) {
      throw new Error(`duplicate registration: ${value.name}`);
    }
    registry.set(value.name, value);
  }
}
