/** One undoable edit in the SVG document. */
export interface Command {
  execute(): void;
  undo(): void;
}
