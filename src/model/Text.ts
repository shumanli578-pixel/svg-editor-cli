import { Shape, type AttributeEntry } from "./Shape.ts";

export class Text extends Shape {
  private x: number;
  private y: number;
  private content: string;

  constructor(id: string, x: number, y: number, content: string) {
    super(id, "text");
    this.x = x; this.y = y; this.content = content;
  }
  get textContent(): string { return this.content; }
  protected moveGeometry(dx: number, dy: number): void { this.x += dx; this.y += dy; }
  protected scaleGeometry(factor: number): void { this.x *= factor; this.y *= factor; }
  protected getGeometryAttribute(name: string): string | undefined {
    if (name === "x") return String(this.x);
    if (name === "y") return String(this.y);
    if (name === "text") return this.content;
    return undefined;
  }
  protected setGeometryAttribute(name: string, value: string): boolean {
    if (name === "text") { this.content = value; return true; }
    if (name !== "x" && name !== "y") return false;
    const parsed = Shape.numberValue(value, name);
    if (name === "x") { this.x = parsed; return true; }
    if (name === "y") { this.y = parsed; return true; }
    return false;
  }
  protected geometryEntries(): AttributeEntry[] { return [["x", String(this.x)], ["y", String(this.y)]]; }
  protected innerSvg(): string {
    const attrs = this.attributes.length ? ` ${this.attributeText(this.attributes)}` : "";
    return `<text id="${Shape.escapeXml(this.id)}"${attrs}>${Shape.escapeXml(this.content)}</text>`;
  }
  toSvg(indent = ""): string { return `${indent}${this.innerSvg()}`; }
}
