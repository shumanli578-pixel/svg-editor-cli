import { PluginRegistry } from "../core/PluginRegistry.ts";
import type { ShapeProvider } from "../core/ExtensionPoints.ts";
import type { Shape } from "../model/Shape.ts";
import { Circle } from "../plugins/builtin/Circle.ts";
import { Ellipse } from "../plugins/builtin/Ellipse.ts";
import { Group } from "../plugins/builtin/Group.ts";
import { Line } from "../plugins/builtin/Line.ts";
import { Rect } from "../plugins/builtin/Rect.ts";
import { Text } from "../plugins/builtin/Text.ts";

function number(value: string | undefined, name: string): number {
  if (value === undefined || value.trim() === "") throw new Error(`missing parameter: ${name}`);
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) throw new Error(`parameter ${name} must be a finite number`);
  return parsed;
}
function count(type: string, args: string[], min: number, max = min): void {
  if (args.length < min || args.length > max) throw new Error(`wrong number of parameters for ${type}`);
}

export function createDefaultSetup(): { registry: PluginRegistry } {
  const registry = new PluginRegistry();
  const providers: ShapeProvider[] = [
    { type: "rect", create: (id, a): Shape => { count("rect", a, 4, 5); return new Rect(id, number(a[0], "x"), number(a[1], "y"), number(a[2], "width"), number(a[3], "height"), a[4]); } },
    { type: "circle", create: (id, a): Shape => { count("circle", a, 3, 4); return new Circle(id, number(a[0], "cx"), number(a[1], "cy"), number(a[2], "r"), a[3]); } },
    { type: "ellipse", create: (id, a): Shape => { count("ellipse", a, 4, 5); return new Ellipse(id, number(a[0], "cx"), number(a[1], "cy"), number(a[2], "rx"), number(a[3], "ry"), a[4]); } },
    { type: "line", create: (id, a): Shape => { count("line", a, 4, 5); return new Line(id, number(a[0], "x1"), number(a[1], "y1"), number(a[2], "x2"), number(a[3], "y2"), a[4]); } },
    { type: "text", create: (id, a): Shape => { count("text", a, 3); return new Text(id, number(a[0], "x"), number(a[1], "y"), a[2]); } },
    { type: "g", create: (id, a): Shape => { count("g", a, 0); return new Group(id); } },
  ];
  providers.forEach((provider) => registry.registerShape(provider));
  return { registry };
}
