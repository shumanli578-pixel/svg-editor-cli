import { createInterface } from "node:readline";

const prompt = "svg> ";

console.log("svg-editor 0.1 — type 'help' for commands");

const terminal = createInterface({
  input: process.stdin,
  output: process.stdout,
  prompt,
});

terminal.prompt();

terminal.on("line", (input: string) => {
  const line = input.trim();

  if (line.length === 0 || line.startsWith("#")) {
    terminal.prompt();
    return;
  }

  const [command] = line.split(/\s+/, 1);

  switch (command.toLowerCase()) {
    case "help":
      console.log("Available now: help, exit");
      console.log("SVG editing commands will be added in the next development steps.");
      break;
    case "exit":
    case "quit":
        terminal.close();
        return;
    default:
      console.log(`error: command not implemented yet: ${command}`);
  }

  terminal.prompt();
});

terminal.on("close", () => {
  console.log("bye");
});
