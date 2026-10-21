import type { SvgDocument, ShapeLocation } from "../model/SvgDocument.ts";
import type { Command } from "./Command.ts";

export class AddToCommand implements Command {
  private readonly document: SvgDocument;
  private readonly groupId: string;
  private readonly shapeId: string;
  private originalLocation: ShapeLocation | undefined;

  constructor(document: SvgDocument, groupId: string, shapeId: string) {
    this.document = document;
    this.groupId = groupId;
    this.shapeId = shapeId;
  }

  execute(): void {
    const source = this.document.location(this.shapeId);
    this.originalLocation ??= source;
    this.document.moveTo(this.shapeId, this.groupId);
  }

  undo(): void {
    if (!this.originalLocation) throw new Error("cannot undo an addto command that has not executed");
    this.document.moveTo(
      this.shapeId,
      this.originalLocation.parent?.id ?? null,
      this.originalLocation.index,
    );
  }
}
