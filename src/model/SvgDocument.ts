import { Group } from "./Group.ts";
import { Shape } from "./Shape.ts";

export class SvgDocument {
  private readonly rootChildren: Shape[] = [];
  private canvasWidth: number;
  private canvasHeight: number;

  constructor(canvasWidth = 800, canvasHeight = 600) {
    this.canvasWidth = canvasWidth;
    this.canvasHeight = canvasHeight;
    this.validateDimension(canvasWidth, "width");
    this.validateDimension(canvasHeight, "height");
  }

  get width(): number { return this.canvasWidth; }
  get height(): number { return this.canvasHeight; }
  get children(): readonly Shape[] { return [...this.rootChildren]; }
  get elementCount(): number { return this.allShapes().length; }

  resize(width: number, height: number): void {
    this.validateDimension(width, "width");
    this.validateDimension(height, "height");
    this.canvasWidth = width;
    this.canvasHeight = height;
  }

  add(shape: Shape, parentId?: string): void {
    const parent = parentId === undefined ? null : this.resolve(parentId);
    if (parentId !== undefined && !parent) throw new Error(`no such container: ${parentId}`);
    if (parent !== null && !(parent instanceof Group)) throw new Error(`not a container: ${parentId}`);
    if (shape.parent) throw new Error(`shape already belongs to a document: ${shape.id}`);
    const subtreeIds = this.collectIds(shape);
    const seen = new Set<string>();
    for (const id of subtreeIds) {
      if (seen.has(id) || this.resolve(id)) throw new Error(`id already exists: ${id}`);
      seen.add(id);
    }
    if (parent instanceof Group) parent.appendChild(shape);
    else this.rootChildren.push(shape);
  }

  resolve(id: string): Shape | undefined { return this.allShapes().find((shape) => shape.id === id); }

  remove(id: string): Shape {
    const shape = this.resolve(id);
    if (!shape) throw new Error(`no such shape: ${id}`);
    if (shape.parent) shape.parent.removeChild(shape);
    else {
      const index = this.rootChildren.indexOf(shape);
      if (index >= 0) this.rootChildren.splice(index, 1);
    }
    return shape;
  }

  treeLines(): string[] {
    const lines = [`svg (${this.canvasWidth}x${this.canvasHeight})`];
    this.rootChildren.forEach((shape, index) => this.appendTree(lines, shape, "", index === this.rootChildren.length - 1));
    return lines;
  }

  toSvg(): string {
    const children = this.rootChildren.map((shape) => shape.toSvg("  ")).join("\n");
    const body = children.length ? `\n${children}\n` : "\n";
    return `<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" width="${this.canvasWidth}" height="${this.canvasHeight}" viewBox="0 0 ${this.canvasWidth} ${this.canvasHeight}">${body}</svg>\n`;
  }

  private allShapes(): Shape[] {
    const result: Shape[] = [];
    const visit = (shape: Shape): void => {
      result.push(shape);
      if (shape instanceof Group) shape.children.forEach(visit);
    };
    this.rootChildren.forEach(visit);
    return result;
  }

  private collectIds(shape: Shape): string[] {
    const ids = [shape.id];
    if (shape instanceof Group) {
      for (const child of shape.children) ids.push(...this.collectIds(child));
    }
    return ids;
  }

  private appendTree(lines: string[], shape: Shape, prefix: string, isLast: boolean): void {
    const branch = isLast ? "└── " : "├── ";
    lines.push(`${prefix}${branch}${this.describe(shape)}`);
    if (shape instanceof Group) {
      const nextPrefix = prefix + (isLast ? "    " : "│   ");
      shape.children.forEach((child, index) => this.appendTree(lines, child, nextPrefix, index === shape.children.length - 1));
    }
  }

  private describe(shape: Shape): string {
    if (shape instanceof Group) return `g#${shape.id}`;
    const attrs = shape.attributes.map(([key, value]) => `${key}=${value}`).join(" ");
    return `${shape.kind}#${shape.id}${attrs ? `  ${attrs}` : ""}`;
  }

  private validateDimension(value: number, name: string): void {
    if (!Number.isFinite(value) || value <= 0) throw new Error(`canvas ${name} must be a positive number`);
  }
}
