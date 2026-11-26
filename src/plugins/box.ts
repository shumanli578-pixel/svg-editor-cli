import { Shape } from "../model/Shape.ts";
import type { ShapeProvider } from "../core/ExtensionPoints.ts";
import { Group } from "./builtin/Group.ts";
import { Rect } from "./builtin/Rect.ts";
import { Text } from "./builtin/Text.ts";
import type { AttributeHandler } from "../core/ExtensionPoints.ts";
import type { SvgDocument } from "../model/SvgDocument.ts";
import { SetCommand } from "./builtin/SetCommand.ts";

export class Box extends Group {
  constructor(id: string, x: number, y: number, width: number, height: number, label: string) {
    super(id);
    this.appendChild(new Rect(`${id}-rect`, x, y, width, height, "#4a90d9"));
    this.appendChild(new Text(`${id}-label`, x + 20, y + height / 2, label));
  }

  override toSvg(indent = ""): string {
    const children = this.children.map((child) => child.toSvg(`${indent}  `)).join("\n");
    return `${indent}<g id="${Shape.escapeXml(this.id)}" data-kind="box">\n${children}\n${indent}</g>`;
  }
}

export class BoxAttributeHandler implements AttributeHandler {
  readonly name = "box-attributes";

  constructor(private readonly getDocument: () => SvgDocument | null) {}

  handles(shapeId: string, attribute: string): boolean {
    const box = this.getDocument()?.resolve(shapeId);
    return box instanceof Box && (attribute === "fill" || attribute === "label");
  }

  apply(shapeId: string, attribute: string, value: string) {
    const document = this.getDocument();
    const box = document?.resolve(shapeId);
    if (!(box instanceof Box)) throw new Error(`not a box: ${shapeId}`);
    if (attribute === "fill") return new SetCommand(document!, `${shapeId}-rect`, "fill", value);
    if (attribute === "label") return new SetCommand(document!, `${shapeId}-label`, "text", value);
    throw new Error(`unsupported box attribute: ${attribute}`);
  }
}

function number(value: string | undefined, name: string): number {
  if (value === undefined || value.trim() === "") throw new Error(`missing parameter: ${name}`);
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) throw new Error(`parameter ${name} must be a finite number`);
  return parsed;
}

export const BoxShapeProvider: ShapeProvider = {
  type: "box",
  create(id, args): Shape {
    if (args.length !== 5) throw new Error('usage: create box <id> <x> <y> <w> <h> "<text>"');
    return new Box(id, number(args[0], "x"), number(args[1], "y"), number(args[2], "width"), number(args[3], "height"), args[4]);
  },
};
