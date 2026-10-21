import { Circle } from "./Circle.ts";
import { Ellipse } from "./Ellipse.ts";
import { Group } from "./Group.ts";
import { Line } from "./Line.ts";
import { Rect } from "./Rect.ts";
import { Shape } from "./Shape.ts";
import { Text } from "./Text.ts";

export interface ShapeLocation {
  readonly shape: Shape;
  readonly parent: Group | null;
  readonly index: number;
}

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
    this.insertAt(shape, parentId ?? null, this.childCount(parentId ?? null));
  }

  insertAt(shape: Shape, parentId: string | null, index: number): void {
    const parent = parentId === null ? null : this.resolve(parentId);
    if (parentId !== null && !parent) throw new Error(`no such container: ${parentId}`);
    if (parent !== null && !(parent instanceof Group)) throw new Error(`not a container: ${parentId}`);
    if (shape.parent) throw new Error(`shape already belongs to a document: ${shape.id}`);
    const subtreeIds = this.collectIds(shape);
    const seen = new Set<string>();
    for (const id of subtreeIds) {
      if (seen.has(id) || this.resolve(id)) throw new Error(`id already exists: ${id}`);
      seen.add(id);
    }
    if (parent instanceof Group) parent.insertChild(shape, index);
    else this.rootChildren.splice(this.clampIndex(index, this.rootChildren.length), 0, shape);
  }

  resolve(id: string): Shape | undefined { return this.allShapes().find((shape) => shape.id === id); }

  location(id: string): ShapeLocation {
    const shape = this.resolve(id);
    if (!shape) throw new Error(`no such shape: ${id}`);
    const parent = shape.parent;
    const siblings = parent ? parent.children : this.rootChildren;
    const index = siblings.indexOf(shape);
    if (index < 0) throw new Error(`shape is detached from the document: ${id}`);
    return { shape, parent, index };
  }

  moveTo(id: string, parentId: string | null, index?: number): void {
    const location = this.location(id);
    const target = parentId === null ? null : this.resolve(parentId);
    if (parentId !== null && !target) throw new Error(`no such container: ${parentId}`);
    if (target !== null && !(target instanceof Group)) throw new Error(`not a container: ${parentId}`);
    if (target === location.shape || (location.shape instanceof Group && location.shape.containsId(parentId ?? ""))) {
      throw new Error("cannot move a container into itself or its descendant");
    }

    const targetIndex = index ?? this.childCount(parentId);
    this.detach(location.shape);
    try {
      this.insertAt(location.shape, parentId, targetIndex);
    } catch (error) {
      this.insertAt(location.shape, location.parent?.id ?? null, location.index);
      throw error;
    }
  }

  remove(id: string): ShapeLocation {
    const location = this.location(id);
    this.detach(location.shape);
    return location;
  }

  setZOrder(id: string, position: "front" | "back"): void {
    const location = this.location(id);
    const lastIndex = this.childCount(location.parent?.id ?? null) - 1;
    const targetIndex = position === "front" ? lastIndex : 0;
    if (location.index !== targetIndex) this.moveTo(id, location.parent?.id ?? null, targetIndex);
  }

  shapesInDocumentOrder(): readonly Shape[] { return this.allShapes(); }

  treeLines(rootId?: string): string[] {
    if (rootId !== undefined) {
      const root = this.resolve(rootId);
      if (!root) throw new Error(`no such shape: ${rootId}`);
      const lines = [this.describe(root)];
      if (root instanceof Group) {
        root.children.forEach((child, index) => this.appendTree(lines, child, "", index === root.children.length - 1));
      }
      return lines;
    }

    const lines = [`svg (${this.canvasWidth}x${this.canvasHeight})`];
    this.rootChildren.forEach((shape, index) => this.appendTree(lines, shape, "", index === this.rootChildren.length - 1));
    return lines;
  }

  showLines(id: string): string[] {
    const { shape, parent } = this.location(id);
    const parentDescription = parent ? `g#${parent.id}` : "svg";
    const lines = [`${shape.kind}#${shape.id}  parent=${parentDescription}`];
    for (const [name, value] of shape.attributes) lines.push(`  ${name}=${value}`);
    if (shape instanceof Text) lines.push(`  text=${JSON.stringify(shape.textContent)}`);
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

  private childCount(parentId: string | null): number {
    if (parentId === null) return this.rootChildren.length;
    const parent = this.resolve(parentId);
    if (!parent) throw new Error(`no such container: ${parentId}`);
    if (!(parent instanceof Group)) throw new Error(`not a container: ${parentId}`);
    return parent.children.length;
  }

  private detach(shape: Shape): void {
    if (shape.parent) {
      shape.parent.removeChild(shape);
      return;
    }
    const index = this.rootChildren.indexOf(shape);
    if (index < 0) throw new Error(`shape is detached from the document: ${shape.id}`);
    this.rootChildren.splice(index, 1);
  }

  private clampIndex(index: number, length: number): number {
    return Math.max(0, Math.min(index, length));
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
    if (shape instanceof Rect) {
      return `rect#${shape.id}  x=${shape.getAttribute("x")} y=${shape.getAttribute("y")} w=${shape.getAttribute("width")} h=${shape.getAttribute("height")}${this.styleSuffix(shape)}`;
    }
    if (shape instanceof Circle) {
      return `circle#${shape.id}  cx=${shape.getAttribute("cx")} cy=${shape.getAttribute("cy")} r=${shape.getAttribute("r")}${this.styleSuffix(shape)}`;
    }
    if (shape instanceof Ellipse) {
      return `ellipse#${shape.id}  cx=${shape.getAttribute("cx")} cy=${shape.getAttribute("cy")} rx=${shape.getAttribute("rx")} ry=${shape.getAttribute("ry")}${this.styleSuffix(shape)}`;
    }
    if (shape instanceof Line) {
      return `line#${shape.id}  (${shape.getAttribute("x1")},${shape.getAttribute("y1")}) -> (${shape.getAttribute("x2")},${shape.getAttribute("y2")})${this.styleSuffix(shape)}`;
    }
    if (shape instanceof Text) {
      return `text#${shape.id}  (${shape.getAttribute("x")},${shape.getAttribute("y")}) ${JSON.stringify(shape.textContent)}${this.styleSuffix(shape)}`;
    }
    return `${shape.kind}#${shape.id}`;
  }

  private styleSuffix(shape: Shape): string {
    const entries = shape.attributes.filter(([name]) => name === "fill" || name === "stroke" || name === "stroke-width");
    return entries.map(([name, value]) => ` ${name}=${value}`).join("");
  }

  private validateDimension(value: number, name: string): void {
    if (!Number.isFinite(value) || value <= 0) throw new Error(`canvas ${name} must be a positive number`);
  }
}
