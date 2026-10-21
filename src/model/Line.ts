import { Shape, type AttributeEntry } from "./Shape.ts";

export class Line extends Shape {
  private x1: number;
  private y1: number;
  private x2: number;
  private y2: number;

  constructor(id: string, x1: number, y1: number, x2: number, y2: number, stroke?: string) {
    super(id, "line");
    this.x1 = x1; this.y1 = y1; this.x2 = x2; this.y2 = y2;
    if (stroke !== undefined) this.setAttribute("stroke", stroke);
  }
  protected moveGeometry(dx: number, dy: number): void { this.x1 += dx; this.y1 += dy; this.x2 += dx; this.y2 += dy; }
  protected scaleGeometry(factor: number): void { this.x1 *= factor; this.y1 *= factor; this.x2 *= factor; this.y2 *= factor; }
  protected getGeometryAttribute(name: string): string | undefined {
    const values: Record<string, number> = { x1: this.x1, y1: this.y1, x2: this.x2, y2: this.y2 };
    return name in values ? String(values[name]) : undefined;
  }
  protected setGeometryAttribute(name: string, value: string): boolean {
    if (!["x1", "y1", "x2", "y2"].includes(name)) return false;
    const parsed = Shape.numberValue(value, name);
    switch (name) {
      case "x1": this.x1 = parsed; return true;
      case "y1": this.y1 = parsed; return true;
      case "x2": this.x2 = parsed; return true;
      case "y2": this.y2 = parsed; return true;
      default: return false;
    }
  }
  protected geometryEntries(): AttributeEntry[] { return [["x1", String(this.x1)], ["y1", String(this.y1)], ["x2", String(this.x2)], ["y2", String(this.y2)]]; }
  protected innerSvg(): string { return `<line id="${Shape.escapeXml(this.id)}" ${this.attributeText(this.attributes)}/>`; }
  toSvg(indent = ""): string { return `${indent}${this.innerSvg()}`; }
}
