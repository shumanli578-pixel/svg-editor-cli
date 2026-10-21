import { Circle } from "./Circle.ts";
import { Ellipse } from "./Ellipse.ts";
import { Group } from "./Group.ts";
import { Line } from "./Line.ts";
import { Rect } from "./Rect.ts";
import { Text } from "./Text.ts";
import type { Shape } from "./Shape.ts";

export class ShapeFactory {
  create(type: string, id: string, params: string[]): Shape {
    switch (type.toLowerCase()) {
      case "rect": this.expectCount(type, params, 4, 5); return new Rect(id, this.number(params[0], "x"), this.number(params[1], "y"), this.number(params[2], "width"), this.number(params[3], "height"), params[4]);
      case "circle": this.expectCount(type, params, 3, 4); return new Circle(id, this.number(params[0], "cx"), this.number(params[1], "cy"), this.number(params[2], "r"), params[3]);
      case "ellipse": this.expectCount(type, params, 4, 5); return new Ellipse(id, this.number(params[0], "cx"), this.number(params[1], "cy"), this.number(params[2], "rx"), this.number(params[3], "ry"), params[4]);
      case "line": this.expectCount(type, params, 4, 5); return new Line(id, this.number(params[0], "x1"), this.number(params[1], "y1"), this.number(params[2], "x2"), this.number(params[3], "y2"), params[4]);
      case "text": this.expectCount(type, params, 3, 3); return new Text(id, this.number(params[0], "x"), this.number(params[1], "y"), params[2]);
      case "g": this.expectCount(type, params, 0, 0); return new Group(id);
      default: throw new Error(`unknown shape type: ${type} (is the plugin loaded?)`);
    }
  }

  private number(value: string | undefined, name: string): number {
    if (value === undefined || value.trim() === "") throw new Error(`missing parameter: ${name}`);
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) throw new Error(`parameter ${name} must be a finite number`);
    return parsed;
  }

  private expectCount(type: string, params: string[], min: number, max: number): void {
    if (params.length < min || params.length > max) {
      throw new Error(`wrong number of parameters for ${type}`);
    }
  }
}
