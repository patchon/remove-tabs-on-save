import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext) {
  vscode.window.showInformationMessage('Successfully enabled the exension remove-tabs-on-save.');

  vscode.workspace.onWillSaveTextDocument((e) => {

    const textEditor = vscode.window.activeTextEditor;
    if (!textEditor) {
      return;
    }

    const doc = textEditor.document;
    const tabSize = vscode.workspace.getConfiguration("", { languageId: doc.languageId }).get("editor.tabSize");

    if (!tabSize) {
      console.debug("No indent setting found, not doing anything.")
      return
    }

    // console.debug("Configured tabSize setting is " + tabSize);

    let spaces = '';
    for (let i = 0; i < Number(tabSize); i++) {
      spaces += ' ';
    }

    const firstLine = textEditor.document.lineAt(0);
    const lastLine = textEditor.document.lineAt(textEditor.document.lineCount - 1);
    const range = new vscode.Range(firstLine.range.start, lastLine.range.end);
    const text = doc.getText(range);

    textEditor.edit(function (editBuilder) {
      editBuilder.replace(range, text.replace(/\t/ig, spaces));
    });
  });
}

// this method is called when your extension is deactivated
export function deactivate() { }