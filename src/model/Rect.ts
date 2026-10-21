import { Shape, type AttributeEntry } from "./Shape.ts";

export class Rect extends Shape {
  private x: number;
  private y: number;
  private width: number;
  private height: number;

  constructor(
    id: string,
    x: number,
    y: number,
    width: number,
    height: number,
    fill?: string,
  ) {
    super(id, "rect");
    this.x = x; this.y = y; this.width = width; this.height = height;
    if (fill !== undefined) this.setAttribute("fill", fill);
  }

  protected moveGeometry(dx: number, dy: number): void { this.x += dx; this.y += dy; }
  protected scaleGeometry(factor: number): void {
    this.x *= factor; this.y *= factor; this.width *= factor; this.height *= factor;
  }
  protected getGeometryAttribute(name: string): string | undefined {
    const values: Record<string, number> = { x: this.x, y: this.y, width: this.width, height: this.height };
    return name in values ? String(values[name]) : undefined;
  }
  protected setGeometryAttribute(name: string, value: string): boolean {
    if (!["x", "y", "width", "height"].includes(name)) return false;
    const parsed = Shape.numberValue(value, name);
    switch (name) {
      case "x": this.x = parsed; return true;
      case "y": this.y = parsed; return true;
      case "width": this.width = parsed; return true;
      case "height": this.height = parsed; return true;
      default: return false;
    }
  }
  protected geometryEntries(): AttributeEntry[] {
    return [["x", String(this.x)], ["y", String(this.y)], ["width", String(this.width)], ["height", String(this.height)]];
  }
  protected innerSvg(): string { return `<rect id="${Shape.escapeXml(this.id)}" ${this.attributeText(this.attributes)}/>`; }
  toSvg(indent = ""): string { return `${indent}${this.innerSvg()}`; }
}
