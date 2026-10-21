export type AttributeEntry = readonly [name: string, value: string];

export abstract class Shape {
  private owner: Group | null = null;
  private readonly style = new Map<string, string>();
  public readonly id: string;
  public readonly kind: string;

  protected constructor(id: string, kind: string) {
    this.id = id;
    this.kind = kind;
    if (id.trim().length === 0) {
      throw new Error("id must not be empty");
    }
  }

  get parent(): Group | null {
    return this.owner;
  }

  /** The document and group model use this to keep the tree links consistent. */
  setParent(parent: Group | null): void {
    this.owner = parent;
  }

  move(dx: number, dy: number): void {
    this.moveGeometry(dx, dy);
  }

  scale(factor: number): void {
    if (!Number.isFinite(factor) || factor <= 0) {
      throw new Error("scale factor must be positive");
    }
    this.scaleGeometry(factor);
  }

  getAttribute(name: string): string | undefined {
    return this.style.get(name) ?? this.getGeometryAttribute(name);
  }

  setAttribute(name: string, value: string): void {
    if (name === "fill" || name === "stroke" || name === "stroke-width") {
      this.style.set(name, value);
      return;
    }
    if (!this.setGeometryAttribute(name, value)) {
      throw new Error(`unknown attribute: ${name}`);
    }
  }

  protected abstract moveGeometry(dx: number, dy: number): void;
  protected abstract scaleGeometry(factor: number): void;
  protected abstract getGeometryAttribute(name: string): string | undefined;
  protected abstract setGeometryAttribute(name: string, value: string): boolean;
  protected abstract geometryEntries(): AttributeEntry[];
  protected abstract innerSvg(indent: string): string;

  protected commonEntries(): AttributeEntry[] {
    return [...this.style.entries()];
  }

  get attributes(): AttributeEntry[] {
    return [...this.geometryEntries(), ...this.commonEntries()];
  }

  abstract toSvg(indent?: string): string;

  protected static numberValue(value: string, attribute: string): number {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) {
      throw new Error(`attribute ${attribute} must be a finite number`);
    }
    return parsed;
  }

  protected static escapeXml(value: string): string {
    return value
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&apos;");
  }

  protected attributeText(entries: AttributeEntry[]): string {
    return entries
      .map(([name, value]) => `${name}="${Shape.escapeXml(value)}"`)
      .join(" ");
  }
}

import type { Group } from "./Group.ts";
