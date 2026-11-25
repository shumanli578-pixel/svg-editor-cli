/** Creates one shape type. */
export interface ShapeProvider {
  readonly type: string;
  create(id: string, params: string[]): import("../model/Shape.ts").Shape;
}

/** Handles one CLI command. */
export interface Command {
  readonly name: string;
  execute(args: string[]): void;
}

/** Adds a label or other suffix to a rendered tree line. */
export interface TreeDecorator {
  readonly name: string;
  decorate(line: string): string;
}

/** Handles one shape attribute. */
export interface AttributeHandler {
  readonly name: string;
  handles(shapeType: string, attribute: string): boolean;
  apply(...args: unknown[]): unknown;
}
