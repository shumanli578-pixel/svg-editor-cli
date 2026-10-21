import type { Command } from "./Command.ts";

/** Executes edit commands and keeps the history needed for undo and redo. */
export class CommandManager {
  private readonly undoHistory: Command[] = [];
  private readonly redoHistory: Command[] = [];

  get undoCount(): number { return this.undoHistory.length; }
  get redoCount(): number { return this.redoHistory.length; }

  execute(command: Command): void {
    // Add to history only after a successful edit; a failed command changes no history.
    command.execute();
    this.undoHistory.push(command);
    this.redoHistory.length = 0;
  }

  undo(): void {
    const command = this.undoHistory[this.undoHistory.length - 1];
    if (!command) throw new Error("nothing to undo");
    command.undo();
    this.undoHistory.pop();
    this.redoHistory.push(command);
  }

  redo(): void {
    const command = this.redoHistory[this.redoHistory.length - 1];
    if (!command) throw new Error("nothing to redo");
    command.execute();
    this.redoHistory.pop();
    this.undoHistory.push(command);
  }
}
