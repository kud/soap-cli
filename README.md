# Soap 🧼 - An app cleaner cli for macOS

A simple command in your shell to remove the application you want to delete and the related files as well (like preferences).

> I was so lazy to use any GUI to clean my macOS. - @kud

## Install

```shell
npm install -g @kud/soap
```

## Usage

You've got two ways to uninstall an application, via its path or via its cask name.

```shell
soap :app-path: # '/Applications/remove.bg.app'
```

```shell
soap :cask-name: # removebg
```

## Credits

Inspired from [App Eraser](https://github.com/davunt/app-eraser)
