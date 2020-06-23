# README

## Features
This extension will do one thing, and **one thing only**.
It will make sure to replace all tabs with defined number of spaces
(***editor.tabSize***) on save (if tabs are present).

## Known Issues
None that *I know of*.

## Why ?
Since I'm a firm beleiver of using spaces instead of tabs, I wan't to make sure
that none of my files contains any tabs. Funnily enough I can't seem to find a
way for VS Code to do this automatically (not without me manually calling
**editor.action.indentationToSpaces** with some sort of keyboard shortcut, and not
even then all tabs are removed (ie. blocks that are commented are ignored)).

### Is it really that important ?
Probably not, but since I really dislike tabs, I have them colored in an annoying
color, which is, yes annoying. So to get rid of that annoyance I wrote this extension.

### How about the inbuilt support ?
Well that's the thing, even if you set

* ```editor.tabSize : 2 ```,
* ```editor.insertSpaces: true```
* ```editor.detectIndentation : false```

and then open a file that is tab-indented (god forbid), edit it and press
save (or autosave which I hope you have enabled), the file will be saved with
current tabs (if you don't explicitly call **editor.action.indentationToSpaces**
by a keyboard shortcut, or manually delete the tabs and add new ones). And even
then, as mentioned above, tabs within commented lines are ignored. New tabs
will be replaced by spaces if you have the settings above.

#### Caveats
Even if you have the settings mentioned above, vs code will ***ignore those***
on certain file types, ie.
- makefiles
- *.go

Which kind if makes sense in a way I guess (and if you absolutely want to, you
can override that by defining the above settings specifically for that language).
Which however doesn't make sense since *makefiles* wont work without tabs,
and for *go* you probably use ***gofmt*** which will convert the spaces to tabs.

¯\_(ツ)_/¯

## Release Notes
### 1.2.0
- Make sure to not replace text if no tabs are detected
- Make sure to exlude *.go by default

### 1.1.0
- Option to ignore makefiles (on by default).
- Option to ignore specified file-extensions.

## 1.0.0
- Initial release.