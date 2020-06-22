# remove-tabs-on-save README

## Features
This extension will do one thing, and **one thing only**.
It will make sure to replace all tabs with defined number of spaces (editor.tabSize)
on every save.

## Known Issues
None that *I know of*.

## Why ?
Since I'm a firm beleiver of using spaces instead of tabs, I wan't to make sure
that none of my files contains any tabs. Funnily enough I can't seem to find a
way for VS Code to do this automatically (not without me manually calling
**editor.action.indentationToSpaces** with some sort of keyboard shortcut, and not
even then all tabs are removed (ie. blocks that are commented are ignored)).

> Note: Yes, I do know that some files require tabs (ie. makefiles), I simply disable the extension when handling those kind of files. Maybe one day I'll have a more sofisticated approuch (ie. a setting for this).

### Is it really that important ?
Probably not, but since I really dislike tabs, I have them colored in an annoying
color, which is, yes annoying. So to get rid of that annoyance I wrote this extension.


## Release Notes
### 1.0.1
Hiding extension initialization message.

### 1.0.0
Initial release
