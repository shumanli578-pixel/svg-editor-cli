import { createInterface } from "node:readline";
import { CommandManager } from "./commands/CommandManager.ts";
import { AddToCommand } from "./commands/AddToCommand.ts";
import { BackCommand } from "./commands/BackCommand.ts";
import { CreateCommand } from "./commands/CreateCommand.ts";
import { DeleteCommand } from "./commands/DeleteCommand.ts";
import { FrontCommand } from "./commands/FrontCommand.ts";
import { GroupCommand } from "./commands/GroupCommand.ts";
import { MoveCommand } from "./commands/MoveCommand.ts";
import { ScaleCommand } from "./commands/ScaleCommand.ts";
import { SetCommand } from "./commands/SetCommand.ts";
import { UngroupCommand } from "./commands/UngroupCommand.ts";
import { ShapeFactory } from "./model/ShapeFactory.ts";
import { SvgDocument } from "./model/SvgDocument.ts";

const prompt = "svg> ";
const shapeFactory = new ShapeFactory();
let document: SvgDocument | null = null;
let commandManager = new CommandManager();

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
  const command = args[0].toLowerCase();

  switch (command) {
    case "exit":
    case "quit":
      return true;
    case "help":
      printHelp();
      return false;
    case "init":
      initialize(args.slice(1));
      return false;
    case "create":
      createShape(args.slice(1));
      return false;
    case "move":
      moveShape(args.slice(1));
      return false;
    case "scale":
      scaleShape(args.slice(1));
      return false;
    case "set":
      setAttribute(args.slice(1));
      return false;
    case "group":
      groupShapes(args.slice(1));
      return false;
    case "delete":
      deleteShape(args.slice(1));
      return false;
    case "ungroup":
      ungroupShape(args.slice(1));
      return false;
    case "addto":
      addToGroup(args.slice(1));
      return false;
    case "front":
      changeZOrder(args.slice(1), "front");
      return false;
    case "back":
      changeZOrder(args.slice(1), "back");
      return false;
    case "show":
      showShape(args.slice(1));
      return false;
    case "undo":
      requireNoArguments(command, args);
      requireDocument().manager.undo();
      console.log("undid last command");
      return false;
    case "redo":
      requireNoArguments(command, args);
      requireDocument().manager.redo();
      console.log("redid last command");
      return false;
    case "tree":
      if (args.length > 2) throw new Error("usage: tree [id]");
      console.log(requireDocument().document.treeLines(args[1]).join("\n"));
      return false;
    default:
      throw new Error(`unknown command: ${args[0]}`);
  }
}

function initialize(args: string[]): void {
  if (args.length !== 0 && args.length !== 2) {
    throw new Error("usage: init [w] [h]");
  }

  const width = args.length === 0 ? 800 : parseNumber(args[0], "width");
  const height = args.length === 0 ? 600 : parseNumber(args[1], "height");
  // Construct first so invalid dimensions do not replace the current document.
  const nextDocument = new SvgDocument(width, height);
  document = nextDocument;
  commandManager = new CommandManager();
  console.log(`canvas ${width}x${height} created`);
}

function createShape(args: string[]): void {
  if (args.length < 2) throw new Error("usage: create <type> <id> [params...]");
  const [rawType, id, ...rawParams] = args;
  const type = rawType.toLowerCase();
  let parentId: string | undefined;
  let params = rawParams;
  if (rawParams.length >= 2 && rawParams[rawParams.length - 2].toLowerCase() === "in") {
    parentId = rawParams.at(-1);
    params = rawParams.slice(0, -2);
  }

  const current = requireDocument();
  const shape = shapeFactory.create(type, id, params);
  current.manager.execute(new CreateCommand(current.document, shape, parentId));
  console.log(`${shape.kind}#${shape.id} created${parentId ? ` in g#${parentId}` : ""}`);
}

function moveShape(args: string[]): void {
  if (args.length !== 3) throw new Error("usage: move <id> <dx> <dy>");
  const [id, rawDx, rawDy] = args;
  const dx = parseNumber(rawDx, "dx");
  const dy = parseNumber(rawDy, "dy");
  const current = requireDocument();
  const shape = current.document.resolve(id);
  if (!shape) throw new Error(`no such shape: ${id}`);

  current.manager.execute(new MoveCommand(current.document, id, dx, dy));
  console.log(`${shape.kind}#${shape.id} moved by (${dx},${dy})`);
}

function scaleShape(args: string[]): void {
  if (args.length !== 2) throw new Error("usage: scale <id> <factor>");
  const [id, rawFactor] = args;
  const factor = parseNumber(rawFactor, "factor");
  const current = requireDocument();
  const shape = current.document.resolve(id);
  if (!shape) throw new Error(`no such shape: ${id}`);
  current.manager.execute(new ScaleCommand(current.document, id, factor));
  console.log(`${shape.kind}#${id} scaled by ${factor}`);
}

function setAttribute(args: string[]): void {
  if (args.length !== 3) throw new Error("usage: set <id> <attr> <value>");
  const [id, attribute, value] = args;
  const current = requireDocument();
  const shape = current.document.resolve(id);
  if (!shape) throw new Error(`no such shape: ${id}`);
  current.manager.execute(new SetCommand(current.document, id, attribute, value));
  console.log(`${shape.kind}#${id} updated: ${attribute}=${JSON.stringify(value)}`);
}

function groupShapes(args: string[]): void {
  if (args.length < 3) throw new Error("usage: group <newGid> <id1> <id2>...");
  const [groupId, ...shapeIds] = args;
  const current = requireDocument();
  current.manager.execute(new GroupCommand(current.document, groupId, shapeIds));
  console.log(`g#${groupId} created with ${shapeIds.length} children`);
}

function deleteShape(args: string[]): void {
  if (args.length !== 1) throw new Error("usage: delete <id>");
  const current = requireDocument();
  const shape = current.document.resolve(args[0]);
  if (!shape) throw new Error(`no such shape: ${args[0]}`);
  current.manager.execute(new DeleteCommand(current.document, args[0]));
  console.log(`${shape.kind}#${shape.id} deleted`);
}

function ungroupShape(args: string[]): void {
  if (args.length !== 1) throw new Error("usage: ungroup <gid>");
  const current = requireDocument();
  current.manager.execute(new UngroupCommand(current.document, args[0]));
  console.log(`g#${args[0]} ungrouped`);
}

function addToGroup(args: string[]): void {
  if (args.length !== 2) throw new Error("usage: addto <gid> <id>");
  const [groupId, shapeId] = args;
  const current = requireDocument();
  current.manager.execute(new AddToCommand(current.document, groupId, shapeId));
  console.log(`${shapeId} moved into g#${groupId}`);
}

function changeZOrder(args: string[], position: "front" | "back"): void {
  if (args.length !== 1) throw new Error(`usage: ${position} <id>`);
  const current = requireDocument();
  const shape = current.document.resolve(args[0]);
  if (!shape) throw new Error(`no such shape: ${args[0]}`);
  const command = position === "front"
    ? new FrontCommand(current.document, args[0])
    : new BackCommand(current.document, args[0]);
  current.manager.execute(command);
  console.log(`${shape.kind}#${shape.id} moved to ${position}`);
}

function showShape(args: string[]): void {
  if (args.length !== 1) throw new Error("usage: show <id>");
  console.log(requireDocument().document.showLines(args[0]).join("\n"));
}

function requireDocument(): { document: SvgDocument; manager: CommandManager } {
  if (!document) throw new Error("no document. use 'init' first");
  return { document, manager: commandManager };
}

function requireNoArguments(command: string, args: string[]): void {
  if (args.length !== 1) throw new Error(`usage: ${command}`);
}

function parseNumber(value: string | undefined, name: string): number {
  if (value === undefined || value.trim() === "") throw new Error(`missing parameter: ${name}`);
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) throw new Error(`parameter ${name} must be a finite number`);
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
      if (character === "\\" && (line[index + 1] === "\\" || line[index + 1] === '"')) {
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

function printHelp(): void {
  console.log("Commands:");
  console.log("  init [w] [h]                         create a canvas (default 800x600)");
  console.log("  create rect <id> <x> <y> <w> <h> [fill]");
  console.log("  create circle <id> <cx> <cy> <r> [fill]");
  console.log("  create ellipse <id> <cx> <cy> <rx> <ry> [fill]");
  console.log("  create line <id> <x1> <y1> <x2> <y2> [stroke]");
  console.log('  create text <id> <x> <y> "content"');
  console.log("  create g <id>");
  console.log("  create ... in <containerId>       create inside a group");
  console.log("  move <id> <dx> <dy>                  move a shape by an offset");
  console.log("  scale <id> <factor>                  scale a shape or group");
  console.log("  set <id> <attr> <value>              change an attribute");
  console.log("  group <newGid> <id1> <id2>...        group existing shapes");
  console.log("  ungroup <gid>                        dissolve a nested group");
  console.log("  addto <gid> <id>                     move a shape into a group");
  console.log("  delete <id>                          delete a shape or subtree");
  console.log("  front <id> | back <id>               change sibling draw order");
  console.log("  show <id>                            show one shape's attributes");
  console.log("  tree [id]                            show the document structure");
  console.log("  undo | redo                          undo or redo an edit");
  console.log("  help                                 show this help");
  console.log("  exit                                 quit the editor");
}
