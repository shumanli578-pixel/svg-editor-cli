import type { SvgDocument } from "../model/SvgDocument.ts";
import type { Command } from "./Command.ts";

export class ScaleCommand implements Command {
  private readonly document: SvgDocument;
  private readonly shapeId: string;
  private readonly factor: number;

  constructor(document: SvgDocument, shapeId: string, factor: number) {
    if (!Number.isFinite(factor) || factor <= 0) throw new Error("scale factor must be positive");
    this.document = document;
    this.shapeId = shapeId;
    this.factor = factor;
  }

  execute(): void {
    const shape = this.document.resolve(this.shapeId);
    if (!shape) throw new Error(`no such shape: ${this.shapeId}`);
    shape.scale(this.factor);
  }

  undo(): void {
    const shape = this.document.resolve(this.shapeId);
    if (!shape) throw new Error(`no such shape: ${this.shapeId}`);
    shape.scale(1 / this.factor);
  }
}
