import { join } from 'path';
import { nextTick } from 'process';
import * as vscode from 'vscode';

function logMsg(channel: vscode.OutputChannel, conf: any, msg: string) {
  if (conf.get('debug')) {
    channel.appendLine(msg);
  }
}

export function activate(context: vscode.ExtensionContext) {

  // get config and create output channel
  const conf: any = vscode.workspace.getConfiguration('remove-tabs-on-save');
  const channel = vscode.window.createOutputChannel('remove-tabs-on-save');

  // we use this hack to detect if plugin is started for the first time or not
  // couldn't find a decent way to do this, so we'll just look at an initial
  // garbage setting, that we then overwrite with the "correct one" to determine
  // this
  logMsg(channel, conf, 'plugin started');
  if (conf.get('ignoreFileExtensions')[0] === 'first-time') {
    logMsg(channel, conf, 'first time detected');
    vscode.window.showInformationMessage(`Successfully enabled the exension
     remove-tabs-on-save.`);
    conf.update('ignoreFileExtensions', ['*.go'],
      vscode.ConfigurationTarget.Global);
  }

  // our plugin will only activate on save
  vscode.workspace.onWillSaveTextDocument((e) => {

    // verify editor
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      throw new Error('got no editor, not much we can do');
    }

    // verfiy tabsize
    const doc = editor.document;
    const tabSize = Number(vscode.workspace.getConfiguration('',
      { languageId: doc.languageId }).get('editor.tabSize'));
    if (!tabSize) {
      vscode.window.showErrorMessage(`No tabSize could be determined. Make sure
       to set editor.tabSize in your configuration`);
      throw new Error('could not get current tabSize ');
    }
    logMsg(channel, conf, 'configured tabsize is set to : ' + tabSize);

    // just ignore makefiles as per user request (default setting)
    if (conf.get('ignoreMakefiles') && doc.languageId === 'makefile') {
      logMsg(channel, conf, 'makefile detected, ignoring according to setting');
      return;
    }

    // check if we should ignore file based on extension,
    const ignores = conf.get('ignoreFileExtensions')
    for (let i = 0; i < ignores.length; i++) {

      let sel: vscode.DocumentSelector = {
        scheme: 'file',
        pattern: '**/' + ignores[i]
      };

      // greater than one means that we have a match, not really sure if this
      // is going to work in the long run or if it has bugs, seems to work for
      // me when testing though.
      if (vscode.languages.match(sel, doc) > 1) {
        logMsg(channel, conf, "extension '" + ignores[i] + "' detected, ignoring" +
          'according to setting');
        return
      }
    }

    // we get here, we should be safe to use our plugin
    const firstLine = editor.document.lineAt(0);
    const lastLine = editor.document.lineAt(editor.document.lineCount - 1);
    const rangeFull = new vscode.Range(firstLine.range.start, lastLine.range.end);
    const rows = [];

    // first simply do a search to detect if we even should do anything
    if (doc.getText(rangeFull).indexOf('\t') === -1) {
      logMsg(channel, conf, 'no tabs were found, not doing anything');
      return;
    }

    // the code that handles the selection and cursor movement after the tab
    // replacement is done, is totally crazy and way more complex that it should
    // be. unfortunately i went down the rabbit hole and stumbled on a lot of 
    // weird things in this area, and while i don't have any explaination for
    // why this code is so terrible, it works. i spent way to many hours on this
    // meaningless thing, that nobody ever will notice nor care about - except
    // me. for some reason i couldn't let this go, i'm sure there are much 
    // better ways of handling this, and i invite you to fix it, i just can't
    // be bothered anymore - im just happy the shit works as i want it to.
    // you have been warned.
    const posCurr = editor.selection;
    const posCurrActive = posCurr.active.character;
    const posCurrActiveLine = posCurr.active.line;
    let tabsReplacedBeforeCursorCnt = 0;
    let tabsReplacedBeforeSpaces = '';
    let tabsReplacedAfterCursorCnt = 0;
    let tabsReplacedAfterSpaces = '';

    // if we do have tabs, we have to iterate each row
    for (let i = 0; i < editor.document.lineCount; i++) {

      // set current row as range
      let range = new vscode.Range(editor.document.lineAt(i).range.start,
        editor.document.lineAt(i).range.end);

      // get the text in current row, as well as the index of the tab
      let row = doc.getText(range);
      let idx = row.indexOf('\t');

      if (idx === -1) {
        // no tab, save row and go to next row
        logMsg(channel, conf, 'no tabs found on row ' + (i + 1));
        rows.push(row);
        continue;
      } else {

        // we get number of tabs per row to store them in this array to
        // determine if the tabindex has been shifted (as may happen when we 
        // replace a tab with spaces), this information is needed to adjust our
        // possible selection (or cursor position)
        let tabsPerRow = 0;
        let tabsPerRowIdx = [];
        let tabPos = row.indexOf('\t')
        while (tabPos !== -1) {
          tabsPerRow++;
          tabsPerRowIdx.push(tabPos);
          tabPos = row.indexOf('\t', tabPos + 1);
        }
        logMsg(channel, conf, "tab(s) found on row : " + (i + 1));
        logMsg(channel, conf, "tab indexes : " + tabsPerRowIdx.join(","));

        while (true) {

          // calculate the amount of spaces and construct str
          let cnt = 0;
          let str = '';
          cnt = tabSize - (idx % tabSize);
          for (let i = 0; i < cnt; i++) {
            str += ' ';
          }

          if (cnt === 0 || str === '') {
            vscode.window.showErrorMessage(`Internal error occured when trying
            to calculate the number spaces to replace tab with. Please open a
            a issue at https://github.com/patchon/remove-tabs-on-save/issues`);
            throw new Error('could not calculate spaces for unknow reason');
          }

          // this is a total mess, and has nothing to do with the actual
          // tab replacement, that part is actually very easy. this part only
          // handles the cursor position and possible selections that a user
          // has while saving his document. first we detect if our tab index has 
          // shifted when we have replaced earlier tabs with spaces
          logMsg(channel, conf, 'tab found at index ' + idx);
          let shiftPos = 0;
          if (tabsPerRowIdx[0] != idx) {
            shiftPos = idx - tabsPerRowIdx[0];
            logMsg(channel, conf, 'tab index has been adjusted, shifting by ' +
              +shiftPos);
          }
          tabsPerRowIdx.shift();

          // if we dont have a selection, it's fairly straight forward, just
          // check if our tab index is "before" our cursor, and if so update
          // the vars that handles the placement (this is done when we have
          // replaced the whole document)
          if (posCurr.isEmpty) {
            if (i == posCurr.start.line) {
              logMsg(channel, conf, 'no selection detected');
              if (idx < posCurr.active.character + shiftPos) {
                logMsg(channel, conf, 'tab detected, increasing count');
                tabsReplacedBeforeCursorCnt++;
                tabsReplacedBeforeSpaces += str;
              }
            }
          } else {
            // if we do have a selection though, things are way more messed up
            // and i suggest that you look away
            if (posCurr.isSingleLine) {
              if (i == posCurr.start.line) {
                if (idx < posCurr.start.character + shiftPos) {
                  logMsg(channel, conf, 'tab detected before selection ' +
                    '(single row)');
                  tabsReplacedBeforeCursorCnt++;
                  tabsReplacedBeforeSpaces += str;
                } else {
                  if (idx < posCurr.end.character + shiftPos) {
                    logMsg(channel, conf, 'tab detected in selection ' +
                      '(single row)');
                    tabsReplacedAfterCursorCnt++;
                    tabsReplacedAfterSpaces += str;
                  }
                }
              }
            } else {
              // same goes for the multiline selection 
              logMsg(channel, conf, 'multiline selection detected');
              if (i == posCurr.start.line) {
                if (idx < posCurr.start.character + shiftPos) {
                  logMsg(channel, conf, 'tab detected before selection ' +
                    +'(multiline)');
                  tabsReplacedBeforeCursorCnt++;
                  tabsReplacedBeforeSpaces += str;
                }
              }
              if (i == posCurr.end.line) {
                if (idx < posCurr.end.character + shiftPos) {
                  logMsg(channel, conf, 'tab detected in selection ' +
                    +'(multiline)');
                  tabsReplacedAfterCursorCnt++;
                  tabsReplacedAfterSpaces += str;
                }
              }
            }
          }

          // replace tab with spaces string
          row = row.replace(/\t/, str);

          // get next tab index, if no more tabs we are done, save row and break
          idx = row.indexOf('\t');

          // done replacing all tabs
          if (idx === -1) {
            logMsg(channel, conf, 'no more tabs found on current row');
            rows.push(row);
            break;
          }
        }
      }
    }

    // construct new document according to current line break
    const eol = editor.document.eol === 1 ? '\n' : '\r\n';
    const newDoc = rows.join(eol);
    logMsg(channel, conf, "linebreak '" + (eol === '\n' ? 'LF' : 'CRLF') +
      "' detected");

    // simply replace the whole doc with our newly constructed doc
    editor.edit(editBuilder => {
      editBuilder.replace(rangeFull, newDoc);
    }).then(success => {
      if (success) {
        logMsg(channel, conf, 'successfully modified document');

        // since we have modified the document our selection and cursor may have
        // moved, but fear not, since we added ~150 rows of craziness we can 
        // adjust for this. 
        let newPosStart;
        let newPosEnd;
        let newSel;
        const spaceReplacementBeforeCursor = tabsReplacedBeforeSpaces.length -
          tabsReplacedBeforeCursorCnt;
        const spaceReplacementAfterCursor = tabsReplacedAfterSpaces.length -
          tabsReplacedAfterCursorCnt;

        logMsg(channel, conf, 'tabs replaced becore cursor ' +
          tabsReplacedBeforeCursorCnt);
        logMsg(channel, conf, 'tabs replaced after cursor  ' +
          tabsReplacedAfterCursorCnt);

        logMsg(channel, conf, 'spaces to adjust before cursor ' +
          + spaceReplacementBeforeCursor);
        logMsg(channel, conf, 'spaces to adjust after cursor  ' +
          + spaceReplacementAfterCursor);

        if (posCurr.isSingleLine) {
          // no selection, only cursor
          if (posCurr.isEmpty) {
            newPosStart = new vscode.Position(posCurr.start.line,
              posCurr.start.character + spaceReplacementBeforeCursor)
            newSel = new vscode.Selection(newPosStart, newPosStart);
            editor.selection = newSel;
          } else {
            // single line selection
            newPosStart = new vscode.Position(posCurr.start.line,
              posCurr.start.character + spaceReplacementBeforeCursor)
            newPosEnd = new vscode.Position(posCurr.end.line,
              posCurr.end.character + spaceReplacementBeforeCursor +
              spaceReplacementAfterCursor)

            // crazyness never ends, we don't want our cursor to jump if we have
            // a selection from right to left, no worries, i got you covered  
            if (posCurrActive + spaceReplacementBeforeCursor ===
              newPosStart.character) {
              logMsg(channel, conf, "reversed selection detected");
              newSel = new vscode.Selection(newPosEnd, newPosStart);
            } else {
              newSel = new vscode.Selection(newPosStart, newPosEnd);
            }
          }
        } else {
          // multiline selection
          newPosStart = new vscode.Position(posCurr.start.line,
            posCurr.start.character + spaceReplacementBeforeCursor)
          newPosEnd = new vscode.Position(posCurr.end.line,
            posCurr.end.character + spaceReplacementAfterCursor)
          if (posCurrActive + spaceReplacementBeforeCursor ===
            newPosStart.character) {
            logMsg(channel, conf, "reversed selection detected");
            newSel = new vscode.Selection(newPosEnd, newPosStart);
            // hmm, some weird cornercase that i cant even be bothered about
            // if you have selected a row by double clicking it, cursor ends up
            // on the next row, which we haven't thought about. just deal with
            // it here
            if (posCurrActiveLine !== newSel.active.line) {
              logMsg(channel, conf, "");
              newPosEnd = new vscode.Position(posCurr.end.line, 0);
              newSel = new vscode.Selection(newPosStart, newPosEnd);
            }
          } else {
            newSel = new vscode.Selection(newPosStart, newPosEnd);
          }
        }

        // we get here, we should have calculated our selections reasonably 
        // correct - even if we have done with complete madness
        editor.selection = newSel;
      } else {
        vscode.window.showErrorMessage(`Internal error occured when trying
            to modify current document. Please open a issue at
            https://github.com/patchon/remove-tabs-on-save/issues`);
        throw new Error('could not modify document');
      }
    });
  });

  // just watch for changes and reload on changes, as simple as possible
  vscode.workspace.onDidChangeConfiguration(event => {
    console.log(event);
    if (event.affectsConfiguration('remove-tabs-on-save') ||
      event.affectsConfiguration('editor.tabSize')) {
      const action = 'Reload';
      vscode.window
        .showInformationMessage(
          `Reload window in order for the change to take effect.`,
          action
        )
        .then(selectedAction => {
          if (selectedAction === action) {
            vscode.commands.executeCommand('workbench.action.reloadWindow');
          }
        });
    }
  });
}

// This method is called when your extension is deactivated
export function deactivate() {
  vscode.window.showErrorMessage(`Successfully deactivated extension.`);
}
