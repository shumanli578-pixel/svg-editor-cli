import { createInterface } from "node:readline";
import { CommandManager } from "./commands/CommandManager.ts";
import { AddToCommand } from "./plugins/builtin/AddToCommand.ts";
import { BackCommand } from "./plugins/builtin/BackCommand.ts";
import { CreateCommand } from "./plugins/builtin/CreateCommand.ts";
import { DeleteCommand } from "./plugins/builtin/DeleteCommand.ts";
import { FrontCommand } from "./plugins/builtin/FrontCommand.ts";
import { GroupCommand } from "./plugins/builtin/GroupCommand.ts";
import { MoveCommand } from "./plugins/builtin/MoveCommand.ts";
import { ScaleCommand } from "./plugins/builtin/ScaleCommand.ts";
import { SetCommand } from "./plugins/builtin/SetCommand.ts";
import { UngroupCommand } from "./plugins/builtin/UngroupCommand.ts";
import { ShapeFactory } from "./model/ShapeFactory.ts";
import { createDefaultSetup } from "./composition/DefaultSetup.ts";
import type { Command as UndoableCommand } from "./commands/Command.ts";
import { SvgDocument } from "./model/SvgDocument.ts";
import { SvgIO } from "./io/SvgIO.ts";
import { StatsCommand } from "./plugins/stats.ts"; 
import { DirCommand } from "./plugins/dir.ts";

const prompt = "svg> ";
let document: SvgDocument | null = null;
let commandManager = new CommandManager();
let lastReadPath: string | null = null;
let undoBlockedByIO = false;

const statsCommand = new StatsCommand(() => document);
const dirCommand = new DirCommand();

const setup = createDefaultSetup({
  init: { description: "create a canvas", execute: initialize },
  read: { description: "read an SVG file", execute: readDocument },
  save: { description: "save the current SVG document", execute: saveDocument },
  canvas: { description: "show or resize the canvas", execute: canvasCommand },
  create: { description: "create a shape", execute: createShape },
  move: { description: "move a shape", execute: moveShape },
  scale: { description: "scale a shape or group", execute: scaleShape },
  set: { description: "change a shape attribute", execute: setAttribute },
  group: { description: "group existing shapes", execute: groupShapes },
  delete: { description: "delete a shape or subtree", execute: deleteShape },
  ungroup: { description: "dissolve a group", execute: ungroupShape },
  addto: { description: "add a shape to a group", execute: addToGroup },
  front: { description: "move a shape to the front", execute: (args) => changeZOrder(args, "front") },
  back: { description: "move a shape to the back", execute: (args) => changeZOrder(args, "back") },
  show: { description: "show shape attributes", execute: showShape },
  tree: { description: "show the document structure", execute: treeCommand },
  undo: { description: "undo the last edit", execute: undoCommand },
  redo: { description: "redo the last edit", execute: redoCommand },
  help: { description: "show all commands", execute: helpCommand },
  stats: statsCommand,
  dir: dirCommand,
}, () => document);

const shapeFactory = new ShapeFactory(setup.registry);
const svgIO = new SvgIO(shapeFactory);

console.log("svg-editor 0.1 — type 'help' for commands");

const terminal = createInterface({
  input: process.stdin,
  output: process.stdout,
  prompt,
});

terminal.on("line", (input: string) => {
  const line = input.trim();

  if (line.length === 0 || line.startsWith("#")) {
    terminal.prompt();
    return;
  }

  try {
    const args = tokenize(line);
    if (args.length === 0) {
      terminal.prompt();
      return;
    }

    if (execute(args)) {
      terminal.close();
      return;
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.log(`error: ${message}`);
  }

  terminal.prompt();
});

terminal.on("SIGINT", () => {
  console.log("^C");
  terminal.close();
});

terminal.on("close", () => {
  console.log("bye");
});

terminal.prompt();

function execute(args: string[]): boolean {
  const name = args[0].toLowerCase();

  if (name === "exit" || name === "quit") {
    requireNoArguments(name, args);
    return true;
  }

  const command = setup.registry.getCommand(name);
  if (!command) {
    throw new Error(`unknown command: ${args[0]}`);
  }

  command.execute(args.slice(1));
  return false;
}

function initialize(args: string[]): void {
  if (args.length !== 0 && args.length !== 2) {
    throw new Error("usage: init [w] [h]");
  }

  const width = args.length === 0 ? 800 : parseNumber(args[0], "width");
  const height = args.length === 0 ? 600 : parseNumber(args[1], "height");
  const nextDocument = new SvgDocument(width, height);
  document = nextDocument;
  commandManager = new CommandManager();
  lastReadPath = null;
  undoBlockedByIO = true;
  console.log(`canvas ${width}x${height} created`);
}

function readDocument(args: string[]): void {
  if (args.length !== 1) throw new Error("usage: read <file.svg>");
  const result = svgIO.read(args[0]);
  for (const warning of result.warnings) console.log(warning);
  document = result.document;
  commandManager = new CommandManager();
  lastReadPath = result.path;
  undoBlockedByIO = true;
  console.log(`read ${args[0]} (${result.document.elementCount} elements)`);
}

function saveDocument(args: string[]): void {
  if (args.length > 1) throw new Error("usage: save [file.svg]");
  const current = requireDocument();
  const targetPath =
    args[0] ?? lastReadPath;
  if (!targetPath) {
    throw new Error("no read path. use 'save <file.svg>' or read a file first");
  }

  svgIO.save(current.document, targetPath);
  setup.registry.getDecorator("modified-star")?.setDirty?.(false);
  undoBlockedByIO = true;
  console.log(`saved to ${targetPath} (${current.document.elementCount} elements)`);
}

function canvasCommand(args: string[]): void {
  if (args.length !== 0 && args.length !== 2) {
    throw new Error("usage: canvas [w] [h]");
  }

  const current = requireDocument();
  if (args.length === 0) {
    console.log(`canvas ${current.document.width}x${current.document.height}`);
    return;
  }

  const width = parseNumber(args[0], "width");
  const height = parseNumber(args[1], "height");
  current.document.resize(width, height);
  undoBlockedByIO = true;
  console.log(`canvas resized to ${width}x${height}`);
}

function createShape(args: string[]): void {
  if (args.length < 2) {
    throw new Error("usage: create <type> <id> [params...]");
  }

  const [rawType, id, ...rawParams] = args;
  const type = rawType.toLowerCase();
  let parentId: string | undefined;
  let params = rawParams;

  if (
    rawParams.length >= 2 &&
    rawParams[rawParams.length - 2].toLowerCase() === "in"
  ) {
    parentId = rawParams.at(-1);
    params = rawParams.slice(0, -2);
  }

  const current = requireDocument();
  const shape = shapeFactory.create(type, id, params);
  runEdit(
    current.manager,
    new CreateCommand(current.document, shape, parentId),
  );
  console.log(
    `${shape.kind}#${shape.id} created${parentId ? ` in g#${parentId}` : ""}`,
  );
}

function moveShape(args: string[]): void {
  if (args.length !== 3) {
    throw new Error("usage: move <id> <dx> <dy>");
  }

  const [id, rawDx, rawDy] = args;
  const dx = parseNumber(rawDx, "dx");
  const dy = parseNumber(rawDy, "dy");
  const current = requireDocument();
  const shape = current.document.resolve(id);
  if (!shape) throw new Error(`no such shape: ${id}`);

  runEdit(current.manager, new MoveCommand(current.document, id, dx, dy));
  console.log(`${shape.kind}#${shape.id} moved by (${dx},${dy})`);
}

function scaleShape(args: string[]): void {
  if (args.length !== 2) {
    throw new Error("usage: scale <id> <factor>");
  }

  const [id, rawFactor] = args;
  const factor = parseNumber(rawFactor, "factor");
  const current = requireDocument();
  const shape = current.document.resolve(id);
  if (!shape) throw new Error(`no such shape: ${id}`);

  runEdit(current.manager, new ScaleCommand(current.document, id, factor));
  console.log(`${shape.kind}#${id} scaled by ${factor}`);
}

function setAttribute(args: string[]): void {
  if (args.length !== 3) {
    throw new Error("usage: set <id> <attr> <value>");
  }

  const [id, attribute, value] = args;
  const current = requireDocument();
  const shape = current.document.resolve(id);
  if (!shape) throw new Error(`no such shape: ${id}`);

  const handler = setup.registry.getAttributeHandlers().find((candidate) => candidate.handles(id, attribute));
  if (handler) {
    runEdit(current.manager, handler.apply(id, attribute, value));
    console.log(`${shape.kind}#${id} updated: ${attribute}=${JSON.stringify(value)}`);
    return;
  }

  runEdit(current.manager, new SetCommand(current.document, id, attribute, value));
  console.log(`${shape.kind}#${id} updated: ${attribute}=${JSON.stringify(value)}`);
}

function groupShapes(args: string[]): void {
  if (args.length < 3) {
    throw new Error("usage: group <newGid> <id1> <id2>...");
  }

  const [groupId, ...shapeIds] = args;
  const current = requireDocument();
  runEdit(current.manager, new GroupCommand(current.document, groupId, shapeIds));
  console.log(`g#${groupId} created with ${shapeIds.length} children`);
}

function deleteShape(args: string[]): void {
  if (args.length !== 1) throw new Error("usage: delete <id>");
  const current = requireDocument();
  const shape = current.document.resolve(args[0]);
  if (!shape) throw new Error(`no such shape: ${args[0]}`);

  runEdit(current.manager, new DeleteCommand(current.document, args[0]));
  console.log(`${shape.kind}#${shape.id} deleted`);
}

function ungroupShape(args: string[]): void {
  if (args.length !== 1) throw new Error("usage: ungroup <gid>");
  const current = requireDocument();
  runEdit(current.manager, new UngroupCommand(current.document, args[0]));
  console.log(`g#${args[0]} ungrouped`);
}

function addToGroup(args: string[]): void {
  if (args.length !== 2) throw new Error("usage: addto <gid> <id>");
  const [groupId, shapeId] = args;
  const current = requireDocument();
  runEdit(current.manager, new AddToCommand(current.document, groupId, shapeId));
  console.log(`${shapeId} moved into g#${groupId}`);
}

function changeZOrder(
  args: string[],
  position: "front" | "back",
): void {
  if (args.length !== 1) {
    throw new Error(`usage: ${position} <id>`);
  }

  const current = requireDocument();
  const shape = current.document.resolve(args[0]);
  if (!shape) throw new Error(`no such shape: ${args[0]}`);

  const command =
    position === "front"
      ? new FrontCommand(current.document, args[0])
      : new BackCommand(current.document, args[0]);
  runEdit(current.manager, command);
  console.log(`${shape.kind}#${shape.id} moved to ${position}`);
}

function showShape(args: string[]): void {
  if (args.length !== 1) throw new Error("usage: show <id>");
  console.log(requireDocument().document.showLines(args[0]).join("\n"));
}

function treeCommand(args: string[]): void {
  if (args.length > 1) throw new Error("usage: tree [id]");
  console.log(requireDocument().document.treeLines(args[0], setup.registry.getDecorators()).join("\n"));
}

function undoCommand(args: string[]): void {
  requireNoArguments("undo", ["undo", ...args]);
  ensureUndoAllowed();
  requireDocument().manager.undo();
  console.log("undid last command");
}

function redoCommand(args: string[]): void {
  requireNoArguments("redo", ["redo", ...args]);
  ensureUndoAllowed();
  requireDocument().manager.redo();
  console.log("redid last command");
}

function helpCommand(args: string[]): void {
  requireNoArguments("help", ["help", ...args]);
  console.log("Commands:");
  for (const command of setup.registry.allCommands()) {
    console.log(`  ${command.name.padEnd(12)} ${command.description}`);
  }
  console.log("  exit         quit the editor");
  console.log("  quit         quit the editor");
}

function requireDocument(): {
  document: SvgDocument;
  manager: CommandManager;
} {
  if (!document) throw new Error("no document. use 'init' first");
  return { document, manager: commandManager };
}

function runEdit(manager: CommandManager, command: UndoableCommand): void {
  manager.execute(command);
  setup.registry.getDecorator("modified-star")?.setDirty?.(true);
  undoBlockedByIO = false;
}

function ensureUndoAllowed(): void {
  if (undoBlockedByIO) {
    throw new Error("undo not allowed after io command");
  }
}

function requireNoArguments(command: string, args: string[]): void {
  if (args.length !== 1) throw new Error(`usage: ${command}`);
}

function parseNumber(value: string | undefined, name: string): number {
  if (value === undefined || value.trim() === "") {
    throw new Error(`missing parameter: ${name}`);
  }
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    throw new Error(`parameter ${name} must be a finite number`);
  }
  return parsed;
}

function tokenize(line: string): string[] {
  const result: string[] = [];
  let token = "";
  let inQuotes = false;
  let tokenStarted = false;

  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];

    if (inQuotes) {
      if (
        character === "\\" &&
        (line[index + 1] === "\\" || line[index + 1] === '"')
      ) {
        token += line[index + 1];
        index += 1;
      } else if (character === '"') {
        inQuotes = false;
      } else {
        token += character;
      }
      continue;
    }

    if (character === '"') {
      inQuotes = true;
      tokenStarted = true;
    } else if (/\s/.test(character)) {
      if (tokenStarted) {
        result.push(token);
        token = "";
        tokenStarted = false;
      }
    } else {
      token += character;
      tokenStarted = true;
    }
  }

  if (inQuotes) throw new Error("unterminated quoted string");
  if (tokenStarted) result.push(token);
  return result;
}
