import type { Command } from "../core/ExtensionPoints.ts";
import type { SvgDocument } from "../model/SvgDocument.ts";
import { Group } from "./builtin/Group.ts";

export class StatsCommand implements Command {
  readonly name = "stats";
  readonly description = "count leaf shapes and containers";

  constructor(
    private readonly getDocument: () => SvgDocument | null,
    private readonly write: (text: string) => void = console.log,
  ) {}

  execute(args: string[]): void {
    if (args.length !== 0) throw new Error("usage: stats");

    const document = this.getDocument();
    if (!document) throw new Error("no document. use 'init' or 'read' first");

    const counts = new Map<string, number>();
    let total = 0;
    let containers = 0;

    const visit = (shape: Group["children"][number]): void => {
      if (shape instanceof Group) {
        containers += 1;
        for (const child of shape.children) visit(child);
        return;
      }

      const type = shape.kind;
      counts.set(type, (counts.get(type) ?? 0) + 1);
      total += 1;
    };

    for (const child of document.children) visit(child);

    const summary = [...counts]
      .map(([type, count]) => `${type}: ${count}`)
      .join("  ");

    this.write(
      summary
        ? `${summary}  (total ${total}, containers ${containers})`
        : `(total 0, containers 0)`,
    );
  }
}