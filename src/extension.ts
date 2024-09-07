import * as vscode from "vscode";
import { getProperties, createProgram } from "./utils";
import type { LocationType } from "./utils";
import path = require("path");

const works: any = vscode.workspace.workspaceFolders;
const file = path.resolve(works[0].uri.path + "/tsconfig.json");
const program = createProgram(file);

export function activate(context: vscode.ExtensionContext) {
  // 解析tsx
  vscode.window.onDidChangeTextEditorSelection((e) => {
    const location: LocationType = {
      fileName: e.textEditor.document.fileName,
      range: e.textEditor.selection,
    };
    const result = getProperties(program, location);
    console.log(result);
  });
}
