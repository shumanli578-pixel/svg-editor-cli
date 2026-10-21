import type { SvgDocument } from "../model/SvgDocument.ts";
import type { Command } from "./Command.ts";

export class SetCommand implements Command {
  private readonly document: SvgDocument;
  private readonly shapeId: string;
  private readonly attribute: string;
  private readonly value: string;
  private previousValue: string | undefined;
  private capturedPreviousValue = false;

  constructor(document: SvgDocument, shapeId: string, attribute: string, value: string) {
    this.document = document;
    this.shapeId = shapeId;
    this.attribute = attribute;
    this.value = value;
  }

  execute(): void {
    const shape = this.document.resolve(this.shapeId);
    if (!shape) throw new Error(`no such shape: ${this.shapeId}`);
    const oldValue = shape.getAttribute(this.attribute);
    // Validate the attribute and value before adding anything to command history.
    shape.setAttribute(this.attribute, this.value);
    if (!this.capturedPreviousValue) {
      this.previousValue = oldValue;
      this.capturedPreviousValue = true;
    }
  }

  undo(): void {
    if (!this.capturedPreviousValue) throw new Error("cannot undo a set command that has not executed");
    const shape = this.document.resolve(this.shapeId);
    if (!shape) throw new Error(`no such shape: ${this.shapeId}`);
    if (this.previousValue === undefined) shape.removeAttribute(this.attribute);
    else shape.setAttribute(this.attribute, this.previousValue);
  }
}
