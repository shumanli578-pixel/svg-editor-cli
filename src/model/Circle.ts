import { Shape, type AttributeEntry } from "./Shape.ts";

export class Circle extends Shape {
  private cx: number;
  private cy: number;
  private r: number;

  constructor(id: string, cx: number, cy: number, r: number, fill?: string) {
    super(id, "circle");
    this.cx = cx; this.cy = cy; this.r = r;
    if (fill !== undefined) this.setAttribute("fill", fill);
  }
  protected moveGeometry(dx: number, dy: number): void { this.cx += dx; this.cy += dy; }
  protected scaleGeometry(factor: number): void { this.cx *= factor; this.cy *= factor; this.r *= factor; }
  protected getGeometryAttribute(name: string): string | undefined {
    const values: Record<string, number> = { cx: this.cx, cy: this.cy, r: this.r };
    return name in values ? String(values[name]) : undefined;
  }
  protected setGeometryAttribute(name: string, value: string): boolean {
    if (!["cx", "cy", "r"].includes(name)) return false;
    const parsed = Shape.numberValue(value, name);
    switch (name) {
      case "cx": this.cx = parsed; return true;
      case "cy": this.cy = parsed; return true;
      case "r": this.r = parsed; return true;
      default: return false;
    }
  }
  protected geometryEntries(): AttributeEntry[] { return [["cx", String(this.cx)], ["cy", String(this.cy)], ["r", String(this.r)]]; }
  protected innerSvg(): string { return `<circle id="${Shape.escapeXml(this.id)}" ${this.attributeText(this.attributes)}/>`; }
  toSvg(indent = ""): string { return `${indent}${this.innerSvg()}`; }
}
