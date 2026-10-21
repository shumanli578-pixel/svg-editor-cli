import type { SvgDocument, ShapeLocation } from "../model/SvgDocument.ts";
import type { Command } from "./Command.ts";

export class DeleteCommand implements Command {
  private readonly document: SvgDocument;
  private readonly shapeId: string;
  private location: ShapeLocation | undefined;

  constructor(document: SvgDocument, shapeId: string) {
    this.document = document;
    this.shapeId = shapeId;
  }

  execute(): void {
    const location = this.document.location(this.shapeId);
    this.location ??= location;
    this.document.remove(this.shapeId);
  }

  undo(): void {
    if (!this.location) throw new Error("cannot undo a delete command that has not executed");
    this.document.insertAt(this.location.shape, this.location.parent?.id ?? null, this.location.index);
  }
}
