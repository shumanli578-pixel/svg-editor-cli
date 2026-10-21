import { Group } from "../model/Group.ts";
import type { SvgDocument, ShapeLocation } from "../model/SvgDocument.ts";
import type { Command } from "./Command.ts";

export class GroupCommand implements Command {
  private readonly document: SvgDocument;
  private readonly groupId: string;
  private readonly shapeIds: string[];
  private group: Group | undefined;
  private locations: ShapeLocation[] | undefined;

  constructor(document: SvgDocument, groupId: string, shapeIds: string[]) {
    this.document = document;
    this.groupId = groupId;
    this.shapeIds = [...shapeIds];
  }

  execute(): void {
    if (!this.locations) this.captureInitialState();
    const locations = this.locations!;
    const group = this.group!;
    const firstLocation = locations[0];
    this.document.insertAt(group, firstLocation.parent?.id ?? null, firstLocation.index);

    try {
      for (const location of locations) this.document.moveTo(location.shape.id, group.id);
    } catch (error) {
      for (const location of locations) {
        if (this.document.resolve(location.shape.id)?.parent === group) {
          this.document.moveTo(location.shape.id, location.parent?.id ?? null, location.index);
        }
      }
      this.document.remove(group.id);
      throw error;
    }
  }

  undo(): void {
    if (!this.group || !this.locations) throw new Error("cannot undo a group command that has not executed");
    this.document.remove(this.group.id);
    const byParentAndIndex = [...this.locations].sort((left, right) => {
      const parentOrder = (left.parent?.id ?? "").localeCompare(right.parent?.id ?? "");
      return parentOrder || left.index - right.index;
    });

    for (const location of byParentAndIndex) {
      this.group.removeChild(location.shape);
      this.document.insertAt(location.shape, location.parent?.id ?? null, location.index);
    }
  }

  private captureInitialState(): void {
    if (this.shapeIds.length < 2) throw new Error("group requires at least two shapes");
    if (new Set(this.shapeIds).size !== this.shapeIds.length) throw new Error("group contains duplicate shape ids");
    if (this.document.resolve(this.groupId)) throw new Error(`id already exists: ${this.groupId}`);

    const locations = this.shapeIds.map((id) => this.document.location(id));
    for (const candidate of locations) {
      if (candidate.shape instanceof Group) {
        for (const other of locations) {
          if (candidate.shape !== other.shape && candidate.shape.containsId(other.shape.id)) {
            throw new Error(`cannot group a container into its own descendant: ${candidate.shape.id}`);
          }
        }
      }
    }

    const order = new Map(this.document.shapesInDocumentOrder().map((shape, index) => [shape.id, index]));
    locations.sort((left, right) => (order.get(left.shape.id) ?? 0) - (order.get(right.shape.id) ?? 0));
    this.locations = locations;
    this.group = new Group(this.groupId);
  }
}
