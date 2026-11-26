import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { DirCommand, type FileSystem } from "../src/plugins/dir.ts";

function run(fs: FileSystem, path = "/mock"): string[] {
  const output: string[] = [];
  new DirCommand(fs, () => path, (line) => output.push(line)).execute([]);
  return output;
}

test("dir sorts directories then files and includes hidden entries", () => {
  const mock: FileSystem = { readDirectory: () => [
    { name: "z.txt", isDirectory: false }, { name: ".hidden", isDirectory: false },
    { name: "zdir", isDirectory: true }, { name: ".cache", isDirectory: true },
    { name: "adir", isDirectory: true }, { name: "a.txt", isDirectory: false },
  ] };
  assert.deepEqual(run(mock), ["[DIR]  .cache", "[DIR]  adir", "[DIR]  zdir", "[FILE] .hidden", "[FILE] a.txt", "[FILE] z.txt"]);
});

test("dir reports empty directory", () => {
  assert.deepEqual(run({ readDirectory: () => [] }), ["(empty directory)"]);
});

test("dir reports read failures and continues as a command", () => {
  assert.deepEqual(run({ readDirectory: () => { throw new Error("denied"); } }, "/no/access"), [`error: cannot read directory: ${resolve("/no/access")}`]);
});

test("NodeFileSystem adapter reads a real temporary directory", () => {
  const dir = mkdtempSync(join(tmpdir(), "svg-dir-test-"));
  try {
    mkdirSync(join(dir, "folder"));
    mkdirSync(join(dir, ".hidden-dir"));
    writeFileSync(join(dir, "file.txt"), "x");
    writeFileSync(join(dir, ".hidden-file"), "x");
    const output = run(new (requireDirAdapter())(), dir);
    assert.deepEqual(output, ["[DIR]  .hidden-dir", "[DIR]  folder", "[FILE] .hidden-file", "[FILE] file.txt"]);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

function requireDirAdapter(): typeof import("../src/plugins/dir.ts").NodeFileSystem {
  // Static import kept type-only at the top for the command and resolved here for test clarity.
  return NodeAdapter;
}
import { NodeFileSystem as NodeAdapter } from "../src/plugins/dir.ts";
