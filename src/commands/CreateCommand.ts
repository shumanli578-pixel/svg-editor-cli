import type { SvgDocument } from "../model/SvgDocument.ts";
import type { Shape } from "../model/Shape.ts";
import type { Command } from "./Command.ts";

export class CreateCommand implements Command {
  private created = false;
  private readonly document: SvgDocument;
  private readonly shape: Shape;
  private readonly parentId?: string;

  constructor(
    document: SvgDocument,
    shape: Shape,
    parentId?: string,
  ) {
    this.document = document;
    this.shape = shape;
    this.parentId = parentId;
  }

  execute(): void {
    this.document.add(this.shape, this.parentId);
    this.created = true;
  }

  undo(): void {
    if (!this.created) throw new Error("cannot undo a create command that has not executed");
    this.document.remove(this.shape.id);
    this.created = false;
  }
}
