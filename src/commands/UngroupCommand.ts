import { Group } from "../model/Group.ts";
import type { SvgDocument, ShapeLocation } from "../model/SvgDocument.ts";
import type { Command } from "./Command.ts";

export class UngroupCommand implements Command {
  private readonly document: SvgDocument;
  private readonly groupId: string;
  private location: ShapeLocation | undefined;
  private children: ShapeLocation[] | undefined;

  constructor(document: SvgDocument, groupId: string) {
    this.document = document;
    this.groupId = groupId;
  }

  execute(): void {
    const group = this.document.resolve(this.groupId);
    if (!(group instanceof Group)) throw new Error(`not a container: ${this.groupId}`);
    const location = this.document.location(this.groupId);
    if (!location.parent) throw new Error(`cannot ungroup top-level container: ${this.groupId}`);

    this.location ??= location;
    this.children ??= group.children.map((shape, index) => ({ shape, parent: group, index }));
    const parentId = location.parent.id;
    for (let index = 0; index < this.children.length; index += 1) {
      this.document.moveTo(this.children[index].shape.id, parentId, location.index + index);
    }
    this.document.remove(this.groupId);
  }

  undo(): void {
    if (!this.location || !this.children) throw new Error("cannot undo an ungroup command that has not executed");
    const group = this.location.shape;
    this.document.insertAt(group, this.location.parent?.id ?? null, this.location.index);
    for (const child of this.children) this.document.moveTo(child.shape.id, group.id);
  }
}
