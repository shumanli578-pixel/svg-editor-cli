import { Shape, type AttributeEntry } from "./Shape.ts";

export class Group extends Shape {
  private readonly members: Shape[] = [];

  constructor(id: string) { super(id, "g"); }

  get children(): readonly Shape[] { return [...this.members]; }

  appendChild(child: Shape): void {
    if (child === this || this.isDescendantOf(child)) {
      throw new Error("cannot create a group cycle");
    }
    child.parent?.removeChild(child);
    this.members.push(child);
    child.setParent(this);
  }

  insertChild(child: Shape, index: number): void {
    if (child === this || this.isDescendantOf(child)) throw new Error("cannot create a group cycle");
    child.parent?.removeChild(child);
    const position = Math.max(0, Math.min(index, this.members.length));
    this.members.splice(position, 0, child);
    child.setParent(this);
  }

  removeChild(child: Shape): number {
    const index = this.members.indexOf(child);
    if (index >= 0) {
      this.members.splice(index, 1);
      child.setParent(null);
    }
    return index;
  }

  containsId(id: string): boolean { return this.members.some((child) => child.id === id || (child instanceof Group && child.containsId(id))); }

  protected moveGeometry(dx: number, dy: number): void { for (const child of this.members) child.move(dx, dy); }
  protected scaleGeometry(factor: number): void { for (const child of this.members) child.scale(factor); }
  protected getGeometryAttribute(): string | undefined { return undefined; }
  protected setGeometryAttribute(): boolean { return false; }
  protected geometryEntries(): AttributeEntry[] { return []; }
  protected innerSvg(indent: string): string {
    const attrs = this.attributes.length ? ` ${this.attributeText(this.attributes)}` : "";
    const body = this.members.map((child) => child.toSvg(`${indent}  `)).join("\n");
    return body.length ? `<g id="${Shape.escapeXml(this.id)}"${attrs}>\n${body}\n${indent}</g>` : `<g id="${Shape.escapeXml(this.id)}"${attrs}/>`;
  }
  toSvg(indent = ""): string { return `${indent}${this.innerSvg(indent)}`; }

  private isDescendantOf(candidate: Shape): boolean {
    let current: Group | null = this.parent;
    while (current) {
      if (current === candidate) return true;
      current = current.parent;
    }
    return false;
  }
}
