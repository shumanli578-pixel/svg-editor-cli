import { readdirSync } from "node:fs";
import { resolve } from "node:path";
import type { Command } from "../core/ExtensionPoints.ts";

export interface DirectoryEntry {
  readonly name: string;
  readonly isDirectory: boolean;
}

export interface FileSystem {
  readDirectory(path: string): DirectoryEntry[];
}

export class NodeFileSystem implements FileSystem {
  readDirectory(path: string): DirectoryEntry[] {
    return readdirSync(path, { withFileTypes: true }).map((entry) => ({
      name: entry.name,
      isDirectory: entry.isDirectory(),
    }));
  }
}

export class DirCommand implements Command {
  readonly name = "dir";
  readonly description = "list the current working directory";

  constructor(
    private readonly fileSystem: FileSystem = new NodeFileSystem(),
    private readonly cwd: () => string = process.cwd,
    private readonly write: (text: string) => void = console.log,
  ) {}

  execute(args: string[]): void {
    if (args.length !== 0) throw new Error("usage: dir");

    const path = resolve(this.cwd());

    try {
      const entries = this.fileSystem.readDirectory(path);
      const directories = entries
        .filter((entry) => entry.isDirectory)
        .sort((a, b) => a.name.localeCompare(b.name));
      const files = entries
        .filter((entry) => !entry.isDirectory)
        .sort((a, b) => a.name.localeCompare(b.name));

      if (entries.length === 0) {
        this.write("(empty directory)");
        return;
      }

      for (const entry of directories) this.write(`[DIR]  ${entry.name}`);
      for (const entry of files) this.write(`[FILE] ${entry.name}`);
    } catch {
      this.write(`error: cannot read directory: ${path}`);
    }
  }
}