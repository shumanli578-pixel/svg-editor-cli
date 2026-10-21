import type { SvgDocument, ShapeLocation } from "../model/SvgDocument.ts";
import type { Command } from "./Command.ts";

export class BackCommand implements Command {
  private readonly document: SvgDocument;
  private readonly shapeId: string;
  private originalLocation: ShapeLocation | undefined;

  constructor(document: SvgDocument, shapeId: string) {
    this.document = document;
    this.shapeId = shapeId;
  }

  execute(): void {
    this.originalLocation ??= this.document.location(this.shapeId);
    this.document.setZOrder(this.shapeId, "back");
  }

  undo(): void {
    if (!this.originalLocation) throw new Error("cannot undo a back command that has not executed");
    this.document.moveTo(this.shapeId, this.originalLocation.parent?.id ?? null, this.originalLocation.index);
  }
}
