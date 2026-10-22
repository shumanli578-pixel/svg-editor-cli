import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { DOMParser } from "@xmldom/xmldom";
import { Group } from "../model/Group.ts";
import { ShapeFactory } from "../model/ShapeFactory.ts";
import { SvgDocument } from "../model/SvgDocument.ts";
import type { Shape } from "../model/Shape.ts";

type XmlElement = NonNullable<ReturnType<DOMParser["parseFromString"]>["documentElement"]>;

export interface SvgReadResult {
  readonly document: SvgDocument;
  readonly warnings: readonly string[];
  readonly path: string;
}

/** Reads and writes SVG documents, keeping XML handling outside the model and CLI. */
export class SvgIO {
  private readonly factory = new ShapeFactory();

  read(filePath: string): SvgReadResult {
    const absolutePath = resolve(filePath);
    let source: string;
    try {
      source = readFileSync(absolutePath, "utf8");
    } catch {
      throw new Error(`cannot read file: ${filePath}`);
    }

    const parseErrors: string[] = [];
    let xml: ReturnType<DOMParser["parseFromString"]>;
    try {
      xml = new DOMParser({
        onError: (level, message) => {
          if (level === "error" || level === "fatalError") parseErrors.push(message);
        },
      }).parseFromString(source, "image/svg+xml");
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      throw new Error(`invalid SVG document: ${detail}`);
    }
    if (parseErrors.length > 0) throw new Error(`invalid SVG document: ${parseErrors[0]}`);

    const root = xml.documentElement;
    if (!root || this.tagName(root) !== "svg") throw new Error("document root must be <svg>");

    const reservedIds = this.collectExplicitIds(root);
    const usedIds = new Set<string>();
    const nextNumbers = new Map<string, number>();
    const warnings: string[] = [];
    const canvas = this.canvasDimensions(root);
    const svgDocument = new SvgDocument(canvas.width, canvas.height);

    for (const element of this.elementChildren(root)) {
      const shape = this.parseShape(element, reservedIds, usedIds, nextNumbers, warnings);
      svgDocument.add(shape);
    }

    return { document: svgDocument, warnings, path: absolutePath };
  }

  save(document: SvgDocument, filePath: string): string {
    const absolutePath = resolve(filePath);
    try {
      writeFileSync(absolutePath, document.toSvg(), "utf8");
    } catch {
      throw new Error(`cannot write file: ${filePath}`);
    }
    return absolutePath;
  }

  private parseShape(
    element: XmlElement,
    reservedIds: Set<string>,
    usedIds: Set<string>,
    nextNumbers: Map<string, number>,
    warnings: string[],
  ): Shape {
    const tag = this.tagName(element);
    const id = this.shapeId(element, tag, reservedIds, usedIds, nextNumbers, warnings);
    const attributes = (name: string, fallback?: string): string => {
      const value = element.getAttribute(name);
      return value === null ? fallback ?? "" : value;
    };
    let shape: Shape;

    switch (tag) {
      case "rect":
        shape = this.factory.create("rect", id, [
          this.numberAttribute(element, "x", "0"),
          this.numberAttribute(element, "y", "0"),
          this.requiredNumberAttribute(element, "width"),
          this.requiredNumberAttribute(element, "height"),
        ]);
        break;
      case "circle":
        shape = this.factory.create("circle", id, [
          this.numberAttribute(element, "cx", "0"),
          this.numberAttribute(element, "cy", "0"),
          this.requiredNumberAttribute(element, "r"),
        ]);
        break;
      case "ellipse":
        shape = this.factory.create("ellipse", id, [
          this.numberAttribute(element, "cx", "0"),
          this.numberAttribute(element, "cy", "0"),
          this.requiredNumberAttribute(element, "rx"),
          this.requiredNumberAttribute(element, "ry"),
        ]);
        break;
      case "line":
        shape = this.factory.create("line", id, [
          this.numberAttribute(element, "x1", "0"),
          this.numberAttribute(element, "y1", "0"),
          this.numberAttribute(element, "x2", "0"),
          this.numberAttribute(element, "y2", "0"),
        ]);
        break;
      case "text":
        shape = this.factory.create("text", id, [
          this.numberAttribute(element, "x", "0"),
          this.numberAttribute(element, "y", "0"),
          element.textContent ?? "",
        ]);
        break;
      case "g":
        shape = this.factory.create("g", id, []);
        break;
      default:
        throw new Error(`unsupported SVG element: <${tag}>`);
    }

    for (const styleName of ["fill", "stroke", "stroke-width"]) {
      const value = attributes(styleName);
      if (value !== "") shape.setAttribute(styleName, value);
    }

    if (shape instanceof Group) {
      for (const childElement of this.elementChildren(element)) {
        shape.appendChild(this.parseShape(childElement, reservedIds, usedIds, nextNumbers, warnings));
      }
    }
    return shape;
  }

  private shapeId(
    element: XmlElement,
    tag: string,
    reservedIds: Set<string>,
    usedIds: Set<string>,
    nextNumbers: Map<string, number>,
    warnings: string[],
  ): string {
    const explicitId = element.getAttribute("id")?.trim();
    if (explicitId) {
      if (usedIds.has(explicitId)) throw new Error(`duplicate id in SVG: ${explicitId}`);
      usedIds.add(explicitId);
      return explicitId;
    }

    let sequence = nextNumbers.get(tag) ?? 1;
    let generatedId = `${tag}${sequence}`;
    while (reservedIds.has(generatedId) || usedIds.has(generatedId)) {
      sequence += 1;
      generatedId = `${tag}${sequence}`;
    }
    nextNumbers.set(tag, sequence + 1);
    usedIds.add(generatedId);
    warnings.push(`warning: assigned id ${generatedId} to unnamed <${tag}>`);
    return generatedId;
  }

  private collectExplicitIds(root: XmlElement): Set<string> {
    const ids = new Set<string>();
    const visit = (element: XmlElement): void => {
      const id = element.getAttribute("id")?.trim();
      if (id) ids.add(id);
      for (const child of this.elementChildren(element)) visit(child);
    };
    visit(root);
    return ids;
  }

  private canvasDimensions(root: XmlElement): { width: number; height: number } {
    const viewBox = root.getAttribute("viewBox")?.trim().split(/[\s,]+/).map(Number);
    const fallbackWidth = viewBox?.length === 4 && Number.isFinite(viewBox[2]) ? String(viewBox[2]) : "800";
    const fallbackHeight = viewBox?.length === 4 && Number.isFinite(viewBox[3]) ? String(viewBox[3]) : "600";
    return {
      width: this.parseLength(root.getAttribute("width") ?? fallbackWidth, "width"),
      height: this.parseLength(root.getAttribute("height") ?? fallbackHeight, "height"),
    };
  }

  private requiredNumberAttribute(element: XmlElement, name: string): string {
    const value = element.getAttribute(name);
    if (value === null || value.trim() === "") throw new Error(`missing required <${this.tagName(element)}> attribute: ${name}`);
    this.parseLength(value, name);
    return value.replace(/px$/i, "");
  }

  private numberAttribute(element: XmlElement, name: string, fallback: string): string {
    const value = element.getAttribute(name) ?? fallback;
    this.parseLength(value, name);
    return value.replace(/px$/i, "");
  }

  private parseLength(value: string, name: string): number {
    const normalized = value.trim().replace(/px$/i, "");
    const number = Number(normalized);
    if (!Number.isFinite(number)) throw new Error(`invalid SVG ${name}: ${value}`);
    return number;
  }

  private elementChildren(element: XmlElement): XmlElement[] {
    const children: XmlElement[] = [];
    for (let index = 0; index < element.childNodes.length; index += 1) {
      const child = element.childNodes.item(index);
      if (child?.nodeType === 1) children.push(child as XmlElement);
    }
    return children;
  }

  private tagName(element: XmlElement): string {
    return (element.localName || element.nodeName.split(":").at(-1) || element.nodeName).toLowerCase();
  }
}
