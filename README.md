# Soap 🧼 - An app cleaner cli for macOS

> I was so lazy to use any GUI to clean my macOS. - @kud

A simple command in your shell to remove the application you want to delete and the related files as well (like preferences, logs, `.dmg`, cask formula).

## Motivation

I used to use AppCleaner and AppEraser but the first one is not open source (and could have trackers) and the second one is not a CLI but a GUI. Here comes soap.

## Install

```shell
npm install -g @kud/soap
```

## Usage

You've got two ways to uninstall an application, via its path or via its cask name.

#### Application path

```shell
soap <app-path> 
# ex: soap '/Applications/remove.bg.app'
```

_warning: it won't remove the cask formula even if you've installed the app via homebrew._

#### Cask name

```shell
soap <cask-name>
# ex: soap removebg
```

## Warning

Even if soap is quite simple, tries to be really user-friendly and displays everything it will remove and ask you first what to delete, I'm not responsible of the deletion. There's no rollback available. Use it as your own risks. 

## Credits

Inspired from [App Eraser](https://github.com/davunt/app-eraser)
