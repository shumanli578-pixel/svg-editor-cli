import * as vscode from "vscode";

class SvgDecorationProvider implements vscode.FileDecorationProvider {
  provideFileDecoration(uri: vscode.Uri): vscode.ProviderResult<vscode.FileDecoration> {
    if (uri.scheme !== "file" || !uri.fsPath.toLowerCase().endsWith(".svg")) return undefined;
    return new vscode.FileDecoration("[]", "SVG file");
  }
}

class SvgOutlineProvider implements vscode.DocumentSymbolProvider {
  provideDocumentSymbols(document: vscode.TextDocument): vscode.ProviderResult<vscode.DocumentSymbol[]> {
    if (document.languageId !== "svg" && !document.fileName.toLowerCase().endsWith(".svg")) return [];
    try {
      return parseSvgSymbols(document);
    } catch {
      // Incomplete XML during editing temporarily yields an empty Outline.
      return [];
    }
  }
}

interface ElementFrame {
  tag: string;
  id?: string;
  start: number;
  startEnd: number;
  symbol: vscode.DocumentSymbol;
}

function parseSvgSymbols(document: vscode.TextDocument): vscode.DocumentSymbol[] {
  const text = document.getText();
  const roots: vscode.DocumentSymbol[] = [];
  const stack: ElementFrame[] = [];
  const tagPattern = /<!--[\s\S]*?-->|<\?[\s\S]*?\?>|<![^>]*>|<\s*(\/?)\s*([A-Za-z_][\w:.-]*)([^<>]*?)\s*(\/?)>/g;
  let match: RegExpExecArray | null;

  while ((match = tagPattern.exec(text)) !== null) {
    const token = match[0];
    if (token.startsWith("<!--") || token.startsWith("<?") || token.startsWith("<!")) continue;
    const closing = match[1] === "/";
    const tag = match[2];
    const attributes = match[3] ?? "";
    const selfClosing = match[4] === "/";
    const tokenStart = match.index;
    const tokenEnd = tagPattern.lastIndex;

    if (closing) {
      const frame = stack.pop();
      if (!frame || frame.tag !== tag) throw new Error("malformed XML nesting");
      const end = document.positionAt(tokenEnd);
      frame.symbol.range = new vscode.Range(document.positionAt(frame.start), end);
      continue;
    }

    const id = /(?:^|\s)id\s*=\s*(["'])(.*?)\1/s.exec(attributes)?.[2];
    const name = id ? `${tag}#${id}` : tag;
    const selectionStart = tokenStart + token.indexOf(tag);
    const selection = new vscode.Range(document.positionAt(selectionStart), document.positionAt(selectionStart + tag.length));
    const start = document.positionAt(tokenStart);
    const end = document.positionAt(tokenEnd);
    const symbol = new vscode.DocumentSymbol(name, "", vscode.SymbolKind.Module, new vscode.Range(start, end), selection);

    if (stack.length) stack[stack.length - 1].symbol.children.push(symbol);
    else roots.push(symbol);

    if (!selfClosing) stack.push({ tag, id, start: tokenStart, startEnd: tokenEnd, symbol });
  }

  if (stack.length > 0) throw new Error("unclosed XML element");
  return roots;
}

export function activate(context: vscode.ExtensionContext): void {
  const decoration = vscode.window.registerFileDecorationProvider(new SvgDecorationProvider());
  const outline = vscode.languages.registerDocumentSymbolProvider(
    { language: "svg", scheme: "file" },
    new SvgOutlineProvider(),
  );
  context.subscriptions.push(decoration, outline);
}

export function deactivate(): void {}
