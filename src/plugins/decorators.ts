import type { TreeDecorator } from "../core/ExtensionPoints.ts";
import { Box } from "./box.ts";
import type { Shape } from "../model/Shape.ts";

export class BoxTypeDecorator implements TreeDecorator {
  readonly name = "box-type-label";
  decorate(shape: Shape): string { return shape instanceof Box ? " (box)" : ""; }
}

export class ModifiedStarDecorator implements TreeDecorator {
  readonly name = "modified-star";
  private dirty = false;
  setDirty(value: boolean): void { this.dirty = value; }
  decorate(_shape: Shape): string { return this.dirty ? " *" : ""; }
}
