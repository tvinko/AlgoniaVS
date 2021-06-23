const electron = require("electron");
const app = process.type === "renderer" ? electron.remote.app : electron.app;
const Menu = process.type === "renderer" ? electron.remote.Menu : electron.Menu;
const nativeImage =
  process.type === "renderer"
    ? electron.remote.nativeImage
    : electron.nativeImage;
const BrowserWindow =
  process.type === "renderer"
    ? electron.remote.BrowserWindow
    : electron.BrowserWindow;
const ipcMain =
  process.type === "renderer" ? electron.remote.ipcMain : electron.ipcMain;
const fs = require("fs");

const path = require("path");

const { MenuItem } = require("electron");

let win;
let _loader;

function getRoot() {
  if (require("electron-is-packaged").isPackaged)
    return path.dirname(
      require("path").normalize(require("electron-root-path").rootPath)
    );
  else return require("path").normalize(require("electron-root-path").rootPath);
}

function getRecentlyOpenedProjects() {
  let menus = [];

  if (!fs.existsSync(path.join(getRoot(), "settings.json")))
    fs.writeFileSync(path.join(getRoot(), "settings.json"), "");

  recentsString = fs.readFileSync(
    path.resolve(getRoot(), "settings.json"),
    "utf8"
  );
  let recents = recentsString == "" ? [] : JSON.parse(recentsString);

  if (recents != "") {
    recents.forEach((recent) => {
      menus.push(
        new MenuItem({
          label: recent.projectPath,
          click() {
            win.webContents.send(
              "open-recent",
              recent.projectPath,
              recent.viewId
            );
          },
        })
      );
    });
  }
  return menus;
}

function createWindow() {
  win = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: true,
    },
  });

  _loader = new BrowserWindow({
    width: 200,
    height: 200,
    frame: false,
    transparent: true,
    parent: win,
    modal: true,
  });
  _loader.loadURL("file://" + __dirname + "/html_includes/modal.html");

  win.loadFile("index.html");

  // Emitted when the window is closed.
  win.on("closed", () => {
    // Dereference the window object, usually you would store windows
    // in an array if your app supports multi windows, this is the time
    // when you should delete the corresponding element.
    win = null;
  });
  createMenu();
}

function createMenu() {
  var menu = Menu.buildFromTemplate([
    {
      label: "Project",
      submenu: [
        {
          label: "New",
          id: "menuNewTemplate",
          accelerator: "Ctrl+N",
          click() {
            win.webContents.send("new-template");
          },
        },
        {
          label: "Open",
          id: "menuOpenTemplate",
          accelerator: "Ctrl+O",
          click() {
            win.webContents.send("open-template");
          },
        },
        {
          label: "Open recent",
          id: "menuOpenRecentTemplate",
          submenu: getRecentlyOpenedProjects(),
        },
        {
          label: "List",
          id: "menuListTemplates",
          accelerator: "Ctrl+L",
          click() {
            win.webContents.send("list-templates");
          },
        },
        {
          label: "Install",
          id: "menuInstallTemplate",
          click() {
            win.webContents.send("install-template");
          },
        },
        { type: "separator" },
        {
          label: "Views",
          id: "menuListViews",
          click() {
            win.webContents.send("list-views");
          },
        },
        { type: "separator" },
        {
          label: "Save",
          id: "menuSaveTemplate",
          accelerator: "Ctrl+S",
          click() {
            win.webContents.send("save-template");
          },
        },
        { type: "separator" },
        {
          label: "Delete",
          id: "menuDeleteTemplate",
          click() {
            win.webContents.send("delete-template");
          },
        },
        { type: "separator" },
        {
          label: "Create package",
          id: "menuExportTemplate",
          click() {
            win.webContents.send("export-template");
          },
        },

        { type: "separator" },
        {
          label: "Reveal in explorer",
          id: "menuRevealInExplorer",
          accelerator: "Ctrl+R",
          click() {
            win.webContents.send("reveal-in-explorer");
          },
        },
        { type: "separator" },
        {
          label: "Exit",
          accelerator: "Ctrl+Q",
          click() {
            app.quit();
          },
        },
      ],
    },
    {
      label: "Algo",
      submenu: [
        {
          label: "Add",
          id: "menuAddNode",
          accelerator: "Ctrl+A",
          enabled: false,
          click() {
            win.webContents.send("add-nodes");
          },
        },
        { type: "separator" },
        {
          label: "Copy",
          id: "menuCopyNode",
          accelerator: "Ctrl+K",
          click() {
            win.webContents.send("copy-node");
          },
        },
        {
          label: "Paste",
          id: "menuPasteNode",
          accelerator: "Ctrl+D",
          click() {
            win.webContents.send("paste-node");
          },
        },
        { type: "separator" },
        {
          label: "Install",
          id: "menuInstallNode",
          click() {
            win.webContents.send("install-node");
          },
        },
        { type: "separator" },
        {
          label: "Create package",
          id: "menuExportNode",
          click() {
            win.webContents.send("export-node");
          },
        },
      ],
    },
    {
      label: "Engine",
      submenu: [
        {
          label: "Run",
          id: "menuRunTemplate",
          accelerator: "F5",
          click() {
            win.webContents.send("run-template");
          },
        },
        {
          label: "Run Docker",
          id: "menuRunDocker",
          accelerator: "Ctrl+F5",
          click() {
            win.webContents.send("run-docker");
          },
        },
        {
          label: "Compile",
          id: "menuCompileTemplate",
          click() {
            win.webContents.send("compile-template");
          },
        },
        { type: "separator" },
        {
          label: "Clear cache",
          id: "menuClearCache",
          type: "checkbox",
          checked: true,
          click: function () {
            win.webContents.send(
              "clear-cache-checked-change",
              Menu.getApplicationMenu().getMenuItemById("menuClearCache")
                .checked
            );
          },
        },
        { type: "separator" },
        {
          label: "Reveal in explorer",
          id: "menuRevealInExplorerEngine",
          accelerator: "Ctrl+E",
          click() {
            win.webContents.send("reveal-in-explorer-engine");
          },
        },
        { type: "separator" },
        {
          label: "Create package",
          id: "menuCreatePackage",
          click() {
            win.webContents.send("create-package");
          },
        },
      ],
    },
    {
      label: "Settings",
      submenu: [
        {
          label: "Open",
          id: "menuSettings",
          click() {
            win.webContents.send("open-settings");
          },
        },
      ],
    },
    {
      label: "Debug",
      submenu: [
        {
          label: "Open Dev Tools",
          id: "menuSettings",
          click() {
            win.webContents.openDevTools();
          },
        },
      ],
    },
    {
      label: "Help",
      submenu: [
        {
          label: "Documentation",
          id: "menuDocumentation",
          click() {
            win.webContents.send("open-documentation");
          },
        },
        { type: "separator" },
        {
          label: "About",
          id: "menuAbount",
          click() {
            win.webContents.send("open-about");
          },
        },
      ],
    },
  ]);
  Menu.setApplicationMenu(menu);
  win.webContents.send(
    "clear-cache-checked-change",
    Menu.getApplicationMenu().getMenuItemById("menuClearCache").checked
  );
}
app.on("ready", createWindow);

app.on("window-all-closed", () => {
  // On macOS it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {
  // On macOS it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (win === null) {
    createWindow();
  }
});

ipcMain.on("enable-menu-item", (event, menuItemId, enable) => {
  Menu.getApplicationMenu().getMenuItemById(menuItemId).enabled = enable;
});

ipcMain.on("close-loader", (event) => {
  try {
    _loader.destroy();
  } catch {}
});
