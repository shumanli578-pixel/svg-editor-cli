import { Shape, type AttributeEntry } from "./Shape.ts";

export class Ellipse extends Shape {
  private cx: number;
  private cy: number;
  private rx: number;
  private ry: number;

  constructor(id: string, cx: number, cy: number, rx: number, ry: number, fill?: string) {
    super(id, "ellipse");
    this.cx = cx; this.cy = cy; this.rx = rx; this.ry = ry;
    if (fill !== undefined) this.setAttribute("fill", fill);
  }
  protected moveGeometry(dx: number, dy: number): void { this.cx += dx; this.cy += dy; }
  protected scaleGeometry(factor: number): void { this.cx *= factor; this.cy *= factor; this.rx *= factor; this.ry *= factor; }
  protected getGeometryAttribute(name: string): string | undefined {
    const values: Record<string, number> = { cx: this.cx, cy: this.cy, rx: this.rx, ry: this.ry };
    return name in values ? String(values[name]) : undefined;
  }
  protected setGeometryAttribute(name: string, value: string): boolean {
    if (!["cx", "cy", "rx", "ry"].includes(name)) return false;
    const parsed = Shape.numberValue(value, name);
    switch (name) {
      case "cx": this.cx = parsed; return true;
      case "cy": this.cy = parsed; return true;
      case "rx": this.rx = parsed; return true;
      case "ry": this.ry = parsed; return true;
      default: return false;
    }
  }
  protected geometryEntries(): AttributeEntry[] { return [["cx", String(this.cx)], ["cy", String(this.cy)], ["rx", String(this.rx)], ["ry", String(this.ry)]]; }
  protected innerSvg(): string { return `<ellipse id="${Shape.escapeXml(this.id)}" ${this.attributeText(this.attributes)}/>`; }
  toSvg(indent = ""): string { return `${indent}${this.innerSvg()}`; }
}
