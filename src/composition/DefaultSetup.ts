import { PluginRegistry } from "../core/PluginRegistry.ts";
import type { ShapeProvider } from "../core/ExtensionPoints.ts";
import type { Shape } from "../model/Shape.ts";
import { Circle } from "../plugins/builtin/Circle.ts";
import { Ellipse } from "../plugins/builtin/Ellipse.ts";
import { Group } from "../plugins/builtin/Group.ts";
import { Line } from "../plugins/builtin/Line.ts";
import { Rect } from "../plugins/builtin/Rect.ts";
import { Text } from "../plugins/builtin/Text.ts";
import { BoxShapeProvider } from "../plugins/box.ts";

export type CommandHandlers = Record<
  string,
  {
    readonly description: string;
    execute(args: string[]): void;
  }
>;

function number(value: string | undefined, name: string): number {
  if (value === undefined || value.trim() === "") {
    throw new Error(`missing parameter: ${name}`);
  }
  const result = Number(value);
  if (!Number.isFinite(result)) {
    throw new Error(`parameter ${name} must be a finite number`);
  }
  return result;
}

function expectCount(
  type: string,
  args: string[],
  min: number,
  max = min,
): void {
  if (args.length < min || args.length > max) {
    throw new Error(`wrong number of parameters for ${type}`);
  }
}

const shapeProviders: ShapeProvider[] = [
  {
    type: "rect",
    create: (id, args): Shape => {
      expectCount("rect", args, 4, 5);
      return new Rect(
        id,
        number(args[0], "x"),
        number(args[1], "y"),
        number(args[2], "width"),
        number(args[3], "height"),
        args[4],
      );
    },
  },
  {
    type: "circle",
    create: (id, args): Shape => {
      expectCount("circle", args, 3, 4);
      return new Circle(
        id,
        number(args[0], "cx"),
        number(args[1], "cy"),
        number(args[2], "r"),
        args[3],
      );
    },
  },
  {
    type: "ellipse",
    create: (id, args): Shape => {
      expectCount("ellipse", args, 4, 5);
      return new Ellipse(
        id,
        number(args[0], "cx"),
        number(args[1], "cy"),
        number(args[2], "rx"),
        number(args[3], "ry"),
        args[4],
      );
    },
  },
  {
    type: "line",
    create: (id, args): Shape => {
      expectCount("line", args, 4, 5);
      return new Line(
        id,
        number(args[0], "x1"),
        number(args[1], "y1"),
        number(args[2], "x2"),
        number(args[3], "y2"),
        args[4],
      );
    },
  },
  {
    type: "text",
    create: (id, args): Shape => {
      expectCount("text", args, 3);
      return new Text(
        id,
        number(args[0], "x"),
        number(args[1], "y"),
        args[2],
      );
    },
  },
  {
    type: "g",
    create: (id, args): Shape => {
      expectCount("g", args, 0);
      return new Group(id);
    },
  },
];

export function createDefaultSetup(
  handlers: CommandHandlers,
): { registry: PluginRegistry } {
  const registry = new PluginRegistry();

  for (const provider of shapeProviders) {
    registry.registerShape(provider);
  }
  registry.registerShape(BoxShapeProvider);

  for (const [name, command] of Object.entries(handlers)) {
    registry.registerCommand({
      name,
      description: command.description,
      execute: (args) => command.execute(args),
    });
  }

  return { registry };
}
