import type { Shape } from "../model/Shape.ts";

/** Creates one shape type. */
export interface ShapeProvider {
  readonly type: string;
  create(id: string, params: string[]): Shape;
}

/** A named CLI command adapter. */
export interface Command {
  readonly name: string;
  readonly description: string;
  execute(args: string[]): void;
}

/** Adds a suffix to a rendered tree line. */
export interface TreeDecorator {
  readonly name: string;
  decorate(line: string): string;
}

/** Handles one attribute for a shape type. */
export interface AttributeHandler {
  readonly name: string;
  handles(shapeId: string, attribute: string): boolean;
  apply(shapeId: string, attribute: string, value: string): import("../commands/Command.ts").Command;
}
