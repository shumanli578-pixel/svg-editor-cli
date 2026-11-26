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
  allShapes(): ShapeProvider[] { return [...this.shapes.values()]; }

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
  getDecorators(): TreeDecorator[] { return [...this.decorators.values()]; }
  allDecorators(): TreeDecorator[] { return [...this.decorators.values()]; }
  getDecorator(name: string): TreeDecorator | undefined { return this.decorators.get(name); }

  registerAttributeHandler(value: AttributeHandler): void {
    this.register(this.attributeHandlers, value);
  }

  getAttributeHandlers(): AttributeHandler[] {
    return [...this.attributeHandlers.values()];
  }
  allAttributeHandlers(): AttributeHandler[] { return [...this.attributeHandlers.values()]; }

  mergeFrom(other: PluginRegistry): void {
    const categories = [
      [this.shapes, other.allShapes(), (x: ShapeProvider) => x.type],
      [this.commands, other.allCommands(), (x: Command) => x.name],
      [this.decorators, other.allDecorators(), (x: TreeDecorator) => x.name],
      [this.attributeHandlers, other.allAttributeHandlers(), (x: AttributeHandler) => x.name],
    ] as const;
    for (const [target, values, key] of categories) {
      for (const value of values) {
        if (target.has(key(value as never))) throw new Error(`duplicate registration`);
      }
    }
    for (const value of other.allShapes()) this.registerShape(value);
    for (const value of other.allCommands()) this.registerCommand(value);
    for (const value of other.allDecorators()) this.registerDecorator(value);
    for (const value of other.allAttributeHandlers()) this.registerAttributeHandler(value);
  }

  private register<T extends { readonly name: string }>(registry: Map<string, T>, value: T): void {
    if (registry.has(value.name)) {
      throw new Error(`duplicate registration: ${value.name}`);
    }
    registry.set(value.name, value);
  }
}
