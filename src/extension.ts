import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext) {

  const conf: any = vscode.workspace.getConfiguration('remove-tabs-on-save');

  // Show message activating the plugin, only first time though
  if (conf.get("ignoreFileExtensions")[0] === "first-time") {
    vscode.window.showInformationMessage('Successfully enabled the exension remove-tabs-on-save.');
    conf.update("ignoreFileExtensions", [], vscode.ConfigurationTarget.Global);
  }

  vscode.workspace.onWillSaveTextDocument((e) => {

    const editor = vscode.window.activeTextEditor;
    const config: any = vscode.workspace.getConfiguration('remove-tabs-on-save');

    if (!editor) {
      return;
    }

    const doc = editor.document
    const ignores = config.get("ignoreFileExtensions")

    // Just ignore makefiles as per user request (default setting)
    if (config.get("ignoreMakefiles") && doc.languageId === "makefile") {
      return;
    }

    // Check if we should ignore file based on extension,
    for (let i = 0; i < ignores.length; i++) {

      let sel: vscode.DocumentSelector = {
        scheme: 'file',
        pattern: '**/' + ignores[i]
      };

      // Greater than one means that we have a match. Not really sure if this
      // is going to work in the long run or if it has bugs, seems to work for
      // me when testing though.
      if (vscode.languages.match(sel, doc) > 1) {
        return
      }
    }

    // Get configured tabSize
    const tabSize = vscode.workspace.getConfiguration("", { languageId: doc.languageId }).get("editor.tabSize");

    // If we dont have anything configured we cant really do anything
    if (!tabSize) {
      return
    }

    let spaces = '';
    for (let i = 0; i < Number(tabSize); i++) {
      spaces += ' ';
    }

    const firstLine = editor.document.lineAt(0);
    const lastLine = editor.document.lineAt(editor.document.lineCount - 1);
    const range = new vscode.Range(firstLine.range.start, lastLine.range.end);
    const text = doc.getText(range);

    editor.edit(function (editBuilder) {
      editBuilder.replace(range, text.replace(/\t/ig, spaces));
    });
  });
}

// This method is called when your extension is deactivated
export function deactivate() {
  vscode.window.showInformationMessage('Successfully disabled the exension remove-tabs-on-save.');
}