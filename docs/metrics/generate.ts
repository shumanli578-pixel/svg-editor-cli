import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

type Category = "kernel" | "composition" | "plugins";
interface FileMetric {
  path: string;
  responsibility: string;
  category: Category;
  lines: number;
  estimatedComplexity: number;
}

const root = resolve(import.meta.dirname, "../..");
const excluded = /(^|\/)(node_modules|dist|coverage|build)\//;
const sourceFile = (path: string) => path.endsWith(".ts") && !excluded.test(path);

function git(args: string[]): string {
  return execFileSync("git", args, { cwd: root, encoding: "utf8" }).trimEnd();
}

function category(path: string): Category {
  if (path.startsWith("src/plugins/")) return "plugins";
  if (path.startsWith("src/composition/") || path === "src/index.ts") return "composition";
  return "kernel";
}

function responsibility(path: string): string {
  const name = path.split("/").at(-1) ?? path;
  const stem = name.replace(/\.ts$/, "");
  return stem
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/Command$/, " command")
    .replace(/Provider$/, " shape provider")
    .replace(/Handler$/, " handler")
    .trim();
}

function complexity(source: string): number {
  // Lightweight estimate: one base path plus each if/switch/case/ternary/logical branch.
  const withoutComments = source
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:])\/\/.*$/gm, "");
  const branches = withoutComments.match(/\bif\b|\bswitch\b|\bcase\b|\bcatch\b|\?\s*(?!\.)|&&|\|\|/g) ?? [];
  return 1 + branches.length;
}

function finalSnapshot(): FileMetric[] {
  const paths = git(["ls-tree", "-r", "--name-only", "final"])
    .split("\n").filter(sourceFile);
  return paths.map((path) => {
    const text = execFileSync("git", ["show", `final:${path}`], { cwd: root, encoding: "utf8" });
    return metric(path, text);
  });
}

function currentSnapshot(): FileMetric[] {
  const paths = git(["ls-files", "--cached", "--others", "--exclude-standard"])
    .split("\n").filter(sourceFile);
  return paths.map((path) => metric(path, readFileSync(resolve(root, path), "utf8")));
}

function metric(path: string, source: string): FileMetric {
  return {
    path,
    responsibility: responsibility(path),
    category: category(path),
    lines: source.length === 0 ? 0 : source.replace(/\r\n/g, "\n").split("\n").length - (source.endsWith("\n") ? 1 : 0),
    estimatedComplexity: complexity(source),
  };
}

const before = finalSnapshot();
const after = currentSnapshot();
const totals = (files: FileMetric[]) => {
  const result = { kernel: { lines: 0, complexity: 0 }, composition: { lines: 0, complexity: 0 }, plugins: { lines: 0, complexity: 0 } };
  for (const file of files) {
    result[file.category].lines += file.lines;
    result[file.category].complexity += file.estimatedComplexity;
  }
  return result;
};
const oldTotals = totals(before);
const newTotals = totals(after);
const report = {
  baseline: "final",
  current: "working tree based on HEAD",
  complexityMethod: "estimated count of if/switch/case/catch/ternary/&&/|| plus one base path",
  excludedDirectories: ["node_modules", "dist", "coverage", "build"],
  files: after,
  totals: newTotals,
  deltaFromFinal: Object.fromEntries((Object.keys(newTotals) as Category[]).map((key) => [key, {
    lines: newTotals[key].lines - oldTotals[key].lines,
    estimatedComplexity: newTotals[key].complexity - oldTotals[key].complexity,
  }])),
  finalTotals: oldTotals,
};
const output = resolve(root, "docs/metrics/metrics.json");
writeFileSync(output, `${JSON.stringify(report, null, 2)}\n`, "utf8");
console.log(`Generated ${output}`);
console.log("Category | files | lines | estimated complexity | complexity delta");
for (const key of ["kernel", "composition", "plugins"] as const) {
  const count = after.filter((file) => file.category === key).length;
  console.log(`${key} | ${count} | ${newTotals[key].lines} | ${newTotals[key].complexity} | ${newTotals[key].complexity - oldTotals[key].complexity}`);
}
