import type { SvgDocument } from "../model/SvgDocument.ts";
import type { Command } from "./Command.ts";

export class MoveCommand implements Command {
  private readonly document: SvgDocument;
  private readonly shapeId: string;
  private readonly dx: number;
  private readonly dy: number;

  constructor(
    document: SvgDocument,
    shapeId: string,
    dx: number,
    dy: number,
  ) {
    this.document = document;
    this.shapeId = shapeId;
    this.dx = dx;
    this.dy = dy;
    if (!Number.isFinite(dx) || !Number.isFinite(dy)) {
      throw new Error("move distance must be finite");
    }
  }

  execute(): void {
    const shape = this.document.resolve(this.shapeId);
    if (!shape) throw new Error(`no such shape: ${this.shapeId}`);
    shape.move(this.dx, this.dy);
  }

  undo(): void {
    const shape = this.document.resolve(this.shapeId);
    if (!shape) throw new Error(`no such shape: ${this.shapeId}`);
    shape.move(-this.dx, -this.dy);
  }
}
