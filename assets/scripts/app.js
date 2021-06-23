if (window.module) module = window.module;

const { remote } = require("electron");

const ipcRenderer = require("electron").ipcRenderer;
const dialog =
  process.type === "renderer" ? electron.remote.dialog : electron.dialog;

const prompt = require("electron-prompt");

var _currentTemplatePath;
var _currentTemplate;
var _diagram;
var _isDockerRun;
var _is_menu_clear_cache_checked = true;
var _addedNodes = [];
var _currentViewId = "Main";

const { spawn } = require("child_process");
const { tmpdir } = require("os");
const { close } = require("inspector");
const {
  SSL_OP_NO_SESSION_RESUMPTION_ON_RENEGOTIATION,
  ESTALE,
} = require("constants");

let child;

let newTemplate =
  '[["#TemplateName#"],{"nodes": [],"wires": []},"#TemplateName#"]';

$(document).ready(function () {
  let current_commit = fs.readFileSync(
    path.resolve(getAlgoniaRoot(), "CurrentCommit.txt"),
    "utf8"
  );
  $("#txtTitle").text(
    "Algonia VS " +
      require("electron").remote.app.getVersion() +
      "." +
      current_commit
  );

  function disableEnableMenu(isEnabled) {
    ipcRenderer.send("enable-menu-item", "menuSaveTemplate", isEnabled);
    ipcRenderer.send("enable-menu-item", "menuRevealInExplorer", isEnabled);
    ipcRenderer.send("enable-menu-item", "menuCompileTemplate", isEnabled);
    ipcRenderer.send("enable-menu-item", "menuListViews", isEnabled);
    ipcRenderer.send(
      "enable-menu-item",
      "menuRunTemplate",
      isEnabled && fs.existsSync(path.join(getEngineRoot(), "version.txt"))
    );
    ipcRenderer.send("enable-menu-item", "menuRunDocker", isEnabled);
    ipcRenderer.send("enable-menu-item", "menuDeleteTemplate", isEnabled);
    ipcRenderer.send("enable-menu-item", "menuCreatePackage", isEnabled);
    ipcRenderer.send("enable-menu-item", "menuAddNode", isEnabled);
    ipcRenderer.send("enable-menu-item", "menuCopyNode", isEnabled);
    ipcRenderer.send("enable-menu-item", "menuPasteNode", isEnabled);
    ipcRenderer.send("enable-menu-item", "menuExportNode", isEnabled);
    ipcRenderer.send("enable-menu-item", "menuExportTemplate", isEnabled);
    ipcRenderer.send("enable-menu-item", "menuSettings", isEnabled);
    ipcRenderer.send("enable-menu-item", "menuClearCache", isEnabled);
  }

  function initializeElementsListGrid() {
    $("#divElementsList").jsGrid({
      width: "500px",
      height: "500px",
      editing: false,

      fields: [
        { name: "name", type: "text", width: 150 },
        { name: "version", type: "text", width: 50 },
        {
          name: "",
          title: "",
          align: "center",
          width: 20,
          itemTemplate: function (value, item) {
            item.checked = false;
            return $("<input>")
              .attr("type", "checkbox")
              .attr("checked", false)
              .on("change", function () {
                item.checked = $(this).is(":checked");
              });
          },
        },
      ],
      controller: {},
    });
  }

  function initializeViewsListGrid() {
    $("#divViewsList").jsGrid({
      width: "500px",
      height: "500px",
      editing: true,

      fields: [
        { name: "name", type: "text", width: 150 },
        {
          type: "control",
          //editButton: true,
          deleteButton: false,
          itemTemplate: function (value, item) {
            var $result = jsGrid.fields.control.prototype.itemTemplate.apply(
              this,
              arguments
            );

            /*var $customEditButton = $("<button>")
              .attr({
                class: "customGridEditbutton jsgrid-button jsgrid-edit-button",
              })
              .click(function (e) {
                alert("ID: " + item.name);
                e.stopPropagation();
              });*/

            var $customDeleteButton = $("<button>")
              .attr({
                class:
                  "customGridDeletebutton jsgrid-button jsgrid-delete-button",
              })
              .click(function (e) {
                var nodesWires = getNodesAndWiresExceptViewId(item.name);

                var data = $("#divViewsList")
                  .jsGrid("option", "data")
                  .filter(function (value, index, arr) {
                    return value.name != item.name;
                  });

                $("#divViewsList").jsGrid("option", "data", data);

                _currentTemplate[1].nodes = nodesWires.nodes;
                _currentTemplate[1].wires = nodesWires.wires;

                if (_currentTemplate[1].nodes.length > 0)
                  _currentViewId = _currentTemplate[1].nodes[0].viewId;
                else _currentViewId = "Main";

                fs.writeFileSync(
                  _currentTemplatePath,
                  JSON.stringify(_currentTemplate),
                  function (err) {
                    if (err) throw err;
                  }
                );
                OpenTemplate(_currentTemplatePath);
                e.stopPropagation();
              });

            return (
              $("<div>")
                //.append($customEditButton)
                .append($customDeleteButton)
            );
          },
        },
      ],
      rowClick: function (args) {
        _currentViewId = args.item.name;

        showDivs(_zen_divs, ["#main", "#canvas", "#propertiesSidebar"]);
        OpenTemplate(_currentTemplatePath);
      },
    });
  }

  function getNodesAndWiresExceptViewId(viewId) {
    var result = {};
    result.nodes = _currentTemplate[1].nodes.filter((x) => x.viewId != viewId);

    result.wires = [];
    _currentTemplate[1].wires.forEach(function (wire) {
      if (
        result.nodes.find(
          (x) =>
            x.id == wire.target.replace("-in", "") ||
            x.id ==
              wire.source.replace("-out_true", "").replace("-out_false", "")
        ) != null
      )
        result.wires.push(wire);
    });
    return result;
  }

  function initializeTemplatesListGrid() {
    $("#divTemplatesList").jsGrid({
      width: "500px",
      height: "500px",
      editing: false,

      fields: [
        { name: "name", type: "text", width: 150 },
        { name: "path", type: "text", width: 150, css: "hide", width: 0 },
      ],
      rowClick: function (args) {
        showDivs(_zen_divs, ["#main", "#canvas", "#propertiesSidebar"]);
        OpenTemplate(args.item.path);
      },
      controller: {},
    });
  }

  function OpenTemplate(path) {
    if (!fs.existsSync(path)) {
      setRecentlyOpenedProjects(path, true);
      dialog.showMessageBoxSync(null, {
        type: "info",
        title: "About",
        message: "Project does not exist",
      });
    } else {
      let contents = fs.readFileSync(path, "utf8");
      _currentTemplatePath = require("path").normalize(path);
      _currentTemplate = JSON.parse(contents);

      _diagram = drawNodes(
        _diagram,
        "canvas",
        "a",
        "#aaaaff",
        _currentTemplate[1].nodes,
        _currentTemplate[1].wires,
        "elements/"
      );
      showDivs(_zen_divs, ["#main", "#canvas", "#propertiesSidebar"]);
      disableEnableMenu(true);
      document.title = _currentTemplatePath + " - " + _currentViewId;
      setRecentlyOpenedProjects(path, false);
    }
  }

  function setRecentlyOpenedProjects(projectPath, removeRecent) {
    let recents = fs.readFileSync(
      path.resolve(getRoot(), "settings.json"),
      "utf8"
    );

    // Get all recents without current one
    if (recents == "") recents = [];
    else {
      recents = JSON.parse(recents).filter(function (value, index, arr) {
        return (
          value.projectPath != projectPath && fs.existsSync(value.projectPath)
        );
      });
    }

    if (!removeRecent) {
      recent = {};
      recent.projectPath = projectPath;
      recent.viewId = _currentViewId;

      recents.unshift(recent);
    }

    fs.writeFileSync(
      path.join(getRoot(), "settings.json"),
      JSON.stringify(recents.slice(0, 10))
    );
  }

  ipcRenderer.on("open-recent", (event, projectPath, viewId) => {
    _currentViewId = viewId;
    OpenTemplate(projectPath);
  });

  ipcRenderer.on("open-documentation", (event) => {
    const open = require("open");
    open("https://www.algonia.net/Home/Documentation/introduction");
  });

  ipcRenderer.on("open-about", (event) => {
    const os = require("os");

    let algoniaVer =
      require("electron").remote.app.getVersion() +
      "." +
      fs.readFileSync(
        path.resolve(getAlgoniaRoot(), "CurrentCommit.txt"),
        "utf8"
      );

    let engineVer = !fs.existsSync(path.join(getEngineRoot(), "version.txt"))
      ? "not installed" + os.EOL
      : fs.readFileSync(path.resolve(getEngineRoot(), "version.txt"), "utf8") +
        fs.readFileSync(path.resolve(getEngineRoot(), "commit.txt"), "utf8");

    let standardAlgosVer = !fs.existsSync(
      path.join(getEngineRoot(), "cs_nodes_version.txt")
    )
      ? "not installed" + os.EOL
      : fs.readFileSync(
          path.resolve(getEngineRoot(), "cs_nodes_version.txt"),
          "utf8"
        ) +
        fs.readFileSync(
          path.resolve(getEngineRoot(), "cs_nodes_commit.txt"),
          "utf8"
        );
    dialog.showMessageBoxSync(null, {
      type: "info",
      title: "About",
      message:
        "Visual Designer: " +
        algoniaVer +
        "Engine: " +
        engineVer +
        "Standard algos:" +
        standardAlgosVer,
    });
  });

  ipcRenderer.on("clear-cache-checked-change", (event, isChecked) => {
    _is_menu_clear_cache_checked = isChecked;
  });

  ipcRenderer.on("reveal-in-explorer", (event) => {
    const openExplorer = require("open-file-explorer");

    openExplorer(require("path").dirname(_currentTemplatePath), (err) => {
      if (err) {
        console.log(err);
      } else {
      }
    });
  });

  ipcRenderer.on("reveal-in-explorer-engine", (event) => {
    const openExplorer = require("open-file-explorer");

    openExplorer(getEngineRoot(), (err) => {
      if (err) {
        console.log(err);
      } else {
      }
    });
  });

  ipcRenderer.on("delete-template", (event) => {
    let options = {};
    options.buttons = ["&Yes", "&No"];
    options.message = "Do you really want to delete project?";

    if (dialog.showMessageBoxSync(null, options) === 0) {
      try {
        require("rimraf").sync(path.dirname(_currentTemplatePath));
        closeTemplate();
      } catch (err) {
        dialog.showMessageBoxSync(null, {
          type: "error",
          title: "Delete project",
          message: err.message,
        });
      }
    }
  });

  ipcRenderer.on("run-template", (event) => {
    try {
      _logMsgCounter = 0;
      _isDockerRun = false;
      publishTemplate(true);
    } catch (err) {
      dialog.showMessageBoxSync(null, {
        type: "error",
        title: "Docker error",
        message: err.message,
      });
    }
  });

  ipcRenderer.on("create-package", (event) => {
    dialog.showMessageBox(null, {
      type: "info",
      title: "Package",
      message: "Creating package....",
    });

    let compiledTemplatePath = publishTemplate(false);

    fs.rename(
      compiledTemplatePath,
      path.resolve(getEngineRoot(), "Elements.compiled"),
      (err) => {
        if (err) {
          dialog.showMessageBoxSync(null, {
            type: "error",
            title: "Create package",
            message: err.message,
          });
        } else {
          var AdmZip = require("adm-zip");
          var zip = new AdmZip();
          zip.addLocalFolder(getEngineRoot());
          zip.writeZip(path.resolve(getAlgoniaRoot(), "AlgoniaEngine.zip"));
          require("open-file-explorer")(getAlgoniaRoot(), (err) => {
            if (err) {
              dialog.showMessageBoxSync(null, {
                type: "error",
                title: "Create package",
                message: err.message,
              });
            } else {
            }
          });
        }
      }
    );
  });

  ipcRenderer.on("new-template", (event) => {
    prompt({
      label: "Project name:",
      height: 200,
      type: "input",
    })
      .then((r) => {
        if (r !== null) {
          let newTemplatePath = path.resolve(
            getEngineRoot(),
            "templates",
            r,
            r + ".algo"
          );

          if (!fs.existsSync(path.dirname(newTemplatePath))) {
            fs.mkdirSync(path.dirname(newTemplatePath));
          }

          fs.writeFileSync(newTemplatePath, newTemplate);

          // Create docker bash script
          createStartBashScript(path.dirname(newTemplatePath));

          OpenTemplate(newTemplatePath);
          dialog.showMessageBoxSync(null, {
            type: "info",
            title: "Project created",
            message: "Project created! Start adding algos.",
          });
          document.title = newTemplatePath;
        }
      })
      .catch((error) =>
        dialog.showMessageBoxSync(null, {
          type: "error",
          title: "Create project",
          message: error.message,
        })
      );
  });

  ipcRenderer.on("open-template", (event) => {
    try {
      const files = dialog.showOpenDialogSync(null, {
        defaultPath: path.resolve(getEngineRoot(), "templates"),
        properties: ["openFile"],
        filters: [{ name: "algo", extensions: ["algo"] }],
      });
      if (files != null && files.length > 0) {
        fs.readFile(files[0], "utf8", function (err, contents) {
          OpenTemplate(files[0]);
          disableEnableMenu(true);
        });
      }
    } catch (err) {
      dialog.showMessageBoxSync(null, {
        type: "error",
        title: "Open project",
        message: err.message,
      });
    }
  });

  function createStartBashScript(templateRootPath) {
    const os = require("os");

    fs.writeFileSync(
      path.join(templateRootPath, "start.sh"),
      "#### START USER SCRIPT ####" +
        os.EOL +
        os.EOL +
        "#### END USER SCRIPT   ####" +
        os.EOL +
        os.EOL +
        "#### START AUTO GENERATED - DO NOT MODIFY ####" +
        os.EOL +
        "/home/algonia/AlgoniaEngine /home/algonia/templates/$1/$1.compiled 0;" +
        os.EOL +
        "#### END AUTO GENERATED - DO NOT MODIFY   ####",
      function (err) {
        if (err) throw err;
      }
    );

    if (process.platform == "darwin") {
      fs.chmodSync(path.join(templateRootPath, "start.sh"), "755");
    }
  }

  function saveTemplate(showConfirmationDialog) {
    try {
      var selectedNodesArr = _diagram.getSelectedNodes();

      if (selectedNodesArr.length > 0)
        selectedNodesArr[0].settings.elementProperties = SaveProperties();

      var nodes = _diagram.getNodes();

      for (var i in nodes) {
        nodes[i].settings.color = "#00b300";
      }

      var nodesWires = getNodesAndWiresExceptViewId(_currentViewId);
      // Add nodes and wires from current view to existing ones
      _currentTemplate[1].nodes = nodesWires.nodes.concat(
        _diagram.exportJson().nodes
      );
      _currentTemplate[1].wires = nodesWires.wires.concat(
        _diagram.exportJson().wires
      );

      fs.writeFileSync(
        _currentTemplatePath,
        JSON.stringify(_currentTemplate),
        function (err) {
          if (err) throw err;
        }
      );

      if (showConfirmationDialog) {
        dialog.showMessageBoxSync(null, {
          type: "info",
          title: "Save",
          message: "Project saved!",
        });
      }

      _diagram = drawNodes(
        _diagram,
        "canvas",
        "a",
        "#aaaaff",
        _currentTemplate[1].nodes,
        _currentTemplate[1].wires,
        "elements/"
      );

      closeNav();
    } catch (err) {
      dialog.showMessageBoxSync(null, {
        type: "error",
        title: "Save project",
        message: err.message,
      });
    }
  }

  ipcRenderer.on("save-template", (event) => {
    saveTemplate(true);
  });

  ipcRenderer.on("compile-template", (event) => {
    let compiledTemplate = getCompiledTemplate();
    fs.writeFileSync(
      _currentTemplatePath.replace(".algo", ".compiled"),
      JSON.stringify(compiledTemplate)
    );
    dialog.showMessageBoxSync(null, {
      type: "info",
      title: "Compile",
      message: "Project compiled!",
    });
  });

  ipcRenderer.on("run-docker", (event) => {
    try {
      _logMsgCounter = 0;
      _isDockerRun = true;
      publishTemplate(true);
    } catch (err) {
      dialog.showMessageBoxSync(null, {
        type: "error",
        title: "Docker error",
        message: err.message,
      });
    }
  });

  ipcRenderer.on("copy-node", (event) => {
    const clipboardy = require("clipboardy");
    var selectedNodesArr = _diagram.getSelectedNodes();
    if (selectedNodesArr.length > 0) {
      clipboardy.writeSync(JSON.stringify(selectedNodesArr[0].settings));
    }
    dialog.showMessageBoxSync(null, {
      type: "info",
      title: "Algo",
      message: "Algo copied to clipboard!",
    });
  });

  function checkCurrentNodeVersion(metadata, metadataRootDir) {
    var currentMetadata;
    var unzippedMetadataFile = path.resolve(
      "AlgoniaEngine",
      "libs",
      metadataRootDir,
      "metadata.json"
    );

    if (fs.existsSync(unzippedMetadataFile)) {
      currentMetadata = JSON.parse(
        fs.readFileSync(unzippedMetadataFile, "utf8")
      );

      var semver = require("semver");
      let options = {};

      if (currentMetadata.version == metadata.version) {
        options.buttons = ["&OK"];
        options.message = "Same algo version is already installed.";

        dialog.showMessageBoxSync(null, options);
        return false;
      } else if (semver.gt(currentMetadata.version, metadata.version)) {
        options.buttons = ["&Yes", "&No"];
        options.message =
          "Algo v" +
          currentMetadata.version +
          " is already installed which is higher then installed v" +
          metadata.version +
          ". Continue anyway?";
        return dialog.showMessageBoxSync(null, options) == 0;
      } else {
        options.buttons = ["&Yes", "&No"];
        options.message =
          "Upgrade algo version " +
          currentMetadata.version +
          " to " +
          metadata.version +
          "?";
        return dialog.showMessageBoxSync(null, options) == 0;
      }
    }
    return true;
  }

  // TO DO : Check templates by it's version
  function preinstallTemplateCheck(unzippedDir) {
    return true;
    var doInstall = false;
    require("fs-readdir-recursive")(unzippedDir).forEach((file) => {
      if (path.basename(file) == "metadata.json") {
        doInstall = checkCurrentNodeVersion(
          JSON.parse(fs.readFileSync(path.resolve(unzippedDir, file), "utf8")),
          path.dirname(file)
        );
      }
    });
    return doInstall;
  }

  function preinstallNodeCheck(unzippedDir) {
    var doInstall = false;
    require("fs-readdir-recursive")(unzippedDir).forEach((file) => {
      if (path.basename(file) == "metadata.json") {
        doInstall = checkCurrentNodeVersion(
          JSON.parse(fs.readFileSync(path.resolve(unzippedDir, file), "utf8")),
          path.dirname(file)
        );
      }
    });
    return doInstall;
  }

  ipcRenderer.on("install-template", (event) => {
    const files = dialog.showOpenDialogSync(null, {
      properties: ["openFile"],
      filters: [{ name: "", extensions: ["algoproj"] }],
    });

    try {
      if (files != null && files.length > 0) {
        var AdmZip = require("adm-zip");

        var zip = new AdmZip(files[0]);

        let tmpDir = path.resolve(getEngineRoot(), "tmp", uuidv4());
        zip.extractAllTo(tmpDir, true);

        if (!preinstallTemplateCheck(tmpDir)) return;

        const fse = require("fs-extra");

        fse.copySync(tmpDir, getEngineRoot());

        // Get path to template directly from archive
        // Combine it with engine path and open it
        zip.getEntries().forEach((entry) => {
          if (path.extname(path.basename(entry.entryName)) == ".algo") {
            // Set permissions for start.sh.
            // It fails if called from Docker, because is called as docker user
            let start_script = path.join(
              path.dirname(path.join(getEngineRoot(), entry.entryName)),
              "start.sh"
            );
            if (fs.existsSync(start_script) && process.platform == "darwin")
              fs.chmodSync(start_script, "755");

            OpenTemplate(path.join(getEngineRoot(), entry.entryName));
          }
        });
      }
    } catch (err) {
      dialog.showMessageBoxSync(null, {
        type: "error",
        title: "Install project",
        message: err.message,
      });
    }
  });

  ipcRenderer.on("install-node", (event) => {
    const files = dialog.showOpenDialogSync(null, {
      properties: ["openFile"],
      filters: [{ name: "", extensions: ["algo"] }],
    });

    try {
      if (files != null && files.length > 0) {
        var AdmZip = require("adm-zip");

        var zip = new AdmZip(files[0]);

        let tmpDir = path.resolve(getEngineRoot(), "tmp", uuidv4());
        zip.extractAllTo(tmpDir, true);

        if (!preinstallNodeCheck(tmpDir)) return;

        const fse = require("fs-extra");

        fse.copySync(tmpDir, path.resolve(getEngineRoot(), "libs"));

        var rimraf = require("rimraf");
        rimraf(tmpDir, function () {
          dialog.showMessageBoxSync(null, {
            type: "info",
            title: "Save",
            message: "Algo installed!",
          });
        });
      }
    } catch (err) {
      dialog.showMessageBoxSync(null, {
        type: "error",
        title: "Install algo",
        message: err.message,
      });
    }
  });

  function createTemplatePackage(name, email, version) {
    var templateName;

    try {
      var templateDir = path.dirname(_currentTemplatePath);
      var templateName = path.basename(_currentTemplatePath, ".algo");

      // Create and write template metadata (currently not in use)
      let templateMetadata = {
        name: templateName,
        author: name,
        author_email: email,
        version: version,
      };
      fs.writeFileSync(
        path.resolve(templateDir, "metadata.json"),
        JSON.stringify(templateMetadata)
      );

      // Delete old bundles - we don't want to include them in package over and over again
      if (fs.existsSync(path.resolve(templateDir, templateName + ".algoproj")))
        fs.unlinkSync(path.resolve(templateDir, templateName + ".algoproj"));

      var AdmZip = require("adm-zip");
      var zip = new AdmZip();
      zip.addLocalFolder(templateDir, path.join("templates", templateName));

      zip.writeZip(
        path.resolve(
          path.dirname(_currentTemplatePath),
          templateName + ".algoproj"
        )
      );

      dialog.showMessageBoxSync(null, {
        type: "info",
        title: "Save",
        message: "Project exported!",
      });
    } catch (err) {
      dialog.showMessageBoxSync(null, {
        type: "error",
        title: "Create package",
        message: err.message,
      });
    }
  }

  function createNodePackage(name, email, version) {
    // *.algonia - algorithm settings file
    // *.algo    - algorithm bundle
    var selectedNodesArr = _diagram.getSelectedNodes();
    if (selectedNodesArr.length > 0) {
      // Open default - libs folder
      const exportNodePath = dialog.showSaveDialogSync(null, {
        defaultPath: path.resolve(
          getEngineRoot(),
          "libs",
          selectedNodesArr[0].settings.label + ".algonia"
        ),
      });

      if (exportNodePath == null) return;

      var algo_name = path.dirname(exportNodePath).split(path.sep).pop();

      // Delete old bundles - we don't want to include them in package over and over again
      if (
        fs.existsSync(
          path.resolve(path.dirname(exportNodePath), algo_name + ".algo")
        )
      )
        fs.unlinkSync(
          path.resolve(path.dirname(exportNodePath), algo_name + ".algo")
        );

      // Write algo settings to *.algonia file
      fs.writeFileSync(
        exportNodePath,
        JSON.stringify(selectedNodesArr[0].settings)
      );

      // Write Metadata File
      let algoMetadata = {
        name: algo_name,
        author: name,
        author_email: email,
        version: version,
        isStandardNode: 0,
      };

      fs.writeFileSync(
        path.resolve(path.dirname(exportNodePath), "metadata.json"),
        JSON.stringify(algoMetadata)
      );

      var AdmZip = require("adm-zip");
      var zip = new AdmZip();

      zip.addLocalFolder(
        path.dirname(exportNodePath),
        path.dirname(
          path.relative(path.join(getEngineRoot(), "libs"), exportNodePath)
        )
      );

      zip.writeZip(
        path.resolve(path.dirname(exportNodePath), algo_name + ".algo")
      );

      dialog.showMessageBoxSync(null, {
        type: "info",
        title: "Save",
        message: "Algo package created!",
      });
    }
  }

  ipcRenderer.on("export-template", (event) => {
    var name = "";
    var email = "";
    var version = "";

    prompt({
      label: "Author name:",
      height: 200,
      type: "input",
    })
      .then((r) => {
        if (!r) return;
        name = r;
        prompt({
          label: "Author email:",
          height: 200,
          type: "input",
        })
          .then((r) => {
            if (!r) return;
            email = r;
            prompt({
              label: "Version (Major.Minor.Build):",
              height: 200,
              type: "input",
            })
              .then((r) => {
                if (!r) return;
                version = r;
                createTemplatePackage(name, email, version);
              })
              .catch(console.error);
          })
          .catch(console.error);
      })
      .catch(console.error);
  });

  ipcRenderer.on("export-node", (event) => {
    var name = "";
    var email = "";
    var version = "";

    prompt({
      label: "Author name:",
      height: 200,
      type: "input",
    })
      .then((r) => {
        if (!r) return;
        name = r;
        prompt({
          label: "Author email:",
          height: 200,
          type: "input",
        })
          .then((r) => {
            if (!r) return;
            email = r;
            prompt({
              label: "Version (Major.Minor.Build):",
              height: 200,
              type: "input",
            })
              .then((r) => {
                if (!r) return;
                version = r;
                createNodePackage(name, email, version);
              })
              .catch(console.error);
          })
          .catch(console.error);
      })
      .catch(console.error);
  });

  ipcRenderer.on("add-nodes", (event) => {
    showAddNodesDialog();
  });

  function showAddNodesDialog() {
    showDivs(_zen_divs, ["#divSelectElements"]);

    var elementsMetadata = [];
    let standardNodes = fs.readdirSync(
      path.resolve(getAlgoniaRoot(), "elements")
    );

    standardNodes.forEach((file) => {
      elementsMetadata.push(
        JSON.parse(
          fs.readFileSync(
            path.resolve(getAlgoniaRoot(), "elements", file, "metadata.json"),
            "utf8"
          )
        )
      );
    });

    var read = require("fs-readdir-recursive");
    let algoNodes = read(path.resolve(getEngineRoot(), "libs"));

    algoNodes.forEach((file) => {
      if (path.basename(file) == "metadata.json") {
        var metadata = JSON.parse(
          fs.readFileSync(path.resolve(getEngineRoot(), "libs", file), "utf8")
        );

        var dirName = path.dirname(path.resolve(getEngineRoot(), "libs", file));
        fs.readdirSync(dirName).forEach((algoFile) => {
          if (path.extname(algoFile) == ".algonia")
            metadata.file = path.join(dirName, algoFile);
        });

        elementsMetadata.push(metadata);
      }
    });

    initializeElementsListGrid();
    $("#divElementsList").jsGrid("option", "data", elementsMetadata);
  }

  function importOrPasteNode(nodeJson) {
    var element = JSON.parse(nodeJson);

    element.id = uuidv4();
    element.viewId = _currentViewId;
    element.x = 100;
    element.y = 100;

    var node = addNodeHelper(_diagram, element, "elements/");
    _diagram.selectNode(node);
    node.setLabelColor("#ff0000");
    return node;
  }

  function callSavePropertiesOnAddedNode() {
    if (_addedNodes.length > 0) {
      var element = _addedNodes[_addedNodes.length - 1];
      _diagram.selectNode(element);

      file = path.resolve(
        getAlgoniaRoot(),
        "elements",
        element.settings.file,
        element.settings.file + ".html"
      );

      $("#propertiesSidebar").load(file, function (data) {
        _diagram.getSelectedNodes()[0].settings.elementProperties = SaveProperties();
        _addedNodes.pop();
        callSavePropertiesOnAddedNode();
      });
    }
  }

  ipcRenderer.on("paste-node", (event) => {
    const clipboardy = require("clipboardy");
    _addedNodes.push(importOrPasteNode(clipboardy.readSync()));
    callSavePropertiesOnAddedNode();
  });

  ipcRenderer.on("open-settings", (event) => {
    closeNav();
    fillSettings();
    $("#settingsContainer").show();
  });

  ipcRenderer.on("list-templates", (event) => {
    showDivs(_zen_divs, ["#divSelectTemplates"]);
    const result = getAllFiles(path.resolve(getEngineRoot(), "templates"));
    var templates = [];
    result.forEach((file) => {
      templates.push({ name: path.basename(file), path: file });
    });

    initializeTemplatesListGrid();
    $("#divTemplatesList").jsGrid("option", "data", templates);
  });

  ipcRenderer.on("list-views", (event) => {
    showDivs(_zen_divs, ["#divSelectViews"]);

    var views = [];
    _currentTemplate[1].nodes
      .map((item) => item.viewId)
      .filter((value, index, self) => self.indexOf(value) === index)
      .forEach((view) => {
        views.push({ name: view });
      });

    initializeViewsListGrid();
    $("#divViewsList").jsGrid("option", "data", views);
  });

  $("#btnCancelSelectElements").on("click", function () {
    showDivs(_zen_divs, ["#main", "#canvas", "#propertiesSidebar"]);
  });

  $("#btnSelectElements").on("click", function () {
    showDivs(_zen_divs, ["#main", "#canvas", "#propertiesSidebar"]);

    $("#divElementsList")
      .jsGrid("option", "data")
      .forEach((element) => {
        if (element.checked) {
          if (element.isStandardNode == 1)
            _addedNodes.push(addStandardNode(element));
          else {
            _addedNodes.push(
              importOrPasteNode(fs.readFileSync(element.file, "utf8"))
            );
          }
        }
      });
    callSavePropertiesOnAddedNode();
  });

  const getAllFiles = function (dirPath, arrayOfFiles) {
    files = fs.readdirSync(dirPath);

    arrayOfFiles = arrayOfFiles || [];

    files.forEach(function (file) {
      if (fs.statSync(dirPath + "/" + file).isDirectory()) {
        arrayOfFiles = getAllFiles(dirPath + "/" + file, arrayOfFiles);
      } else if (path.extname(file) == ".algo") {
        arrayOfFiles.push(dirPath + "/" + file);
      }
    });

    return arrayOfFiles;
  };

  function addStandardNode(element) {
    var newElement = {};
    newElement.id = uuidv4();
    newElement.label = element.name;
    newElement.x = 100;
    newElement.y = 100;
    newElement.color = "#00b300";
    newElement.implementation = element.implementation;
    newElement.file = element.file;
    newElement.viewId = _currentViewId;
    newElement.scope = "MainWorkflow";
    newElement.input = [{ name: "in", label: "Input", scopes: ["a"] }];
    newElement.output = [
      { name: "out_true", label: "True", scopes: ["a"] },
      { name: "out_false", label: "False", scopes: ["a"] },
    ];

    var node = addNodeHelper(_diagram, newElement, "elements/");
    _diagram.selectNode(node);
    node.setLabelColor("#ff0000");
    return node;
  }

  // Quick and dirty fix:
  // Algonia Engine works with labels instead of ids
  // We must map true and false childs to labels for that reason
  function fixChildsForEngine(element, elements) {
    // Go through each true child
    $.each(element.trueChilds, function (key, item) {
      // Replace id with label
      element.trueChilds[key] = $.grep(elements, function (element) {
        return item == element.id;
      })[0].label;
    });

    // Go through each false child
    $.each(element.falseChilds, function (key, item) {
      element.falseChilds[key] = $.grep(elements, function (element) {
        return item == element.id;
      })[0].label;
    });
  }
  function getCompiledTemplate() {
    let contents = fs.readFileSync(_currentTemplatePath, "utf8");
    let elements = JSON.parse(contents)[1];

    $.each(elements.nodes, function (key, element) {
      element.trueChilds = [];
      element.falseChilds = [];
      element.operator = "&";
      var trueChilds = $.grep(elements.wires, function (wire) {
        return wire.source == element.id + "-out_true";
      });

      $.each(trueChilds, function (key, item) {
        element.trueChilds.push(item.target.replace("-in", ""));
      });

      var falseChilds = $.grep(elements.wires, function (wire) {
        return wire.source == element.id + "-out_false";
      });

      $.each(falseChilds, function (key, item) {
        element.falseChilds.push(item.target.replace("-in", ""));
      });
      fixChildsForEngine(element, elements.nodes);
    });

    var distinctImplementations = elements.nodes.reduce(function (memo, e1) {
      var matches = memo.filter(function (e2) {
        return e1.id == e2.id;
      });
      if (matches.length == 0) memo.push(e1.implementation);
      return memo;
    }, []);

    var compiledTemplate = $.extend(true, {}, _currentTemplate);
    compiledTemplate[1] = elements.nodes;
    compiledTemplate[3] = distinctImplementations;

    return compiledTemplate;
  }

  function clearCache(engineRoot) {
    const del = require("del");
    if (_is_menu_clear_cache_checked) {
      if (fs.existsSync(path.join(engineRoot, "tmp"))) {
        (async () => {
          const deletedPaths = await del([path.join(engineRoot, "tmp")], {
            force: true,
          });
        })();
      }
    }
  }

  function spawnAlgoniaEngine(engineRoot, compiledTemplatePath) {
    //TODO
    child = spawn(
      path.join(engineRoot, "AlgoniaEngine"),
      [
        compiledTemplatePath,
        0 /*$('#chkAttachDebugger').prop('checked') ? 1:0*/,
      ],
      { cwd: engineRoot }
    );

    child.stdout.pipe(process.stdout);

    var buffer = Buffer.alloc(0);
    var errBuffer = Buffer.alloc(0);

    child.stdout.on("data", (data) => {
      buffer = Buffer.concat([buffer, data]);
      if (data.toString().indexOf("\n") !== -1) {
        var lines = data.toString().split("\n");
        lines.forEach((msg) => handleEngineLog(msg, 0));
        buffer = Buffer.alloc(0);
      }
    });

    child.stderr.on("data", (data) => {
      var arg = data != null ? data : "";

      errBuffer = Buffer.concat([errBuffer, arg]);
      if (arg.toString().indexOf("\n") !== -1) {
        var lines = arg.toString().split("\n");
        lines.forEach((msg) => handleEngineLog(msg, 1));
        errBuffer = Buffer.alloc(0);
      }
    });

    child.on("exit", (code, signal) => {
      $("#divLogContent").prepend($("<div>Engine exited...</br></br></div>"));
    });
  }

  function publishTemplate(execute) {
    saveTemplate(false);
    let compiledTemplate = getCompiledTemplate();

    let engineRoot = getEngineRoot();
    if (engineRoot != null) {
      clearCache(engineRoot);

      let fileName = path.basename(_currentTemplatePath, ".algo");
      const compiledTemplatePath = _currentTemplatePath.replace(
        fileName + ".algo",
        fileName + ".compiled"
      );

      fs.writeFileSync(compiledTemplatePath, JSON.stringify(compiledTemplate));

      if (!execute) return compiledTemplatePath;

      showDivs(_zen_divs, ["#logContainer"]);

      if (_isDockerRun) {
        let settings = getSettingsIniObject(engineRoot);

        stopAndRunContainer(
          settings.Docker.ImageName,
          settings.Docker.ContainerName,
          [],
          [
            getTemplatesRootDockerFormat() + ":/home/algonia/templates",
            getLibsRootDockerFormat() + ":/home/algonia/libs",
            getTmpRootDockerFormat() + ":/home/algonia/tmp",
          ],
          ["TEMPLATE_NAME=" + path.basename(_currentTemplatePath, ".algo")]
        );
      } else {
        spawnAlgoniaEngine(engineRoot, compiledTemplatePath);
      }
      return compiledTemplatePath;
    }
  }

  $("#btnSettingsCancel").on("click", function () {
    $("#settingsContainer").hide();
  });

  $("#btnSettingsSave").on("click", function () {
    const writeIniFile = require("write-ini-file");

    let engineRoot = getEngineRoot();
    let settings = getSettingsIniObject(engineRoot);

    settings.NetCore.Path = $("#txtSettings_NetCore_Path").val();
    settings.Python.ModulesPath36 = $(
      "#txtSettings_Python_PackagesPath36"
    ).val();
    settings.Python.ModulesPath37 = $(
      "#txtSettings_Python_PackagesPath37"
    ).val();
    settings.Python.ModulesPath38 = $(
      "#txtSettings_Python_PackagesPath38"
    ).val();

    settings.Docker.ImageName = $("#txtSettings_Docker_ImageName").val();
    settings.Docker.ContainerName = $(
      "#txtSettings_Docker_ContainerName"
    ).val();

    writeIniFile(path.join(engineRoot, "Settings.ini"), settings).then(() => {
      $("#settingsContainer").hide();
    });
  });

  $("#btnSettings_Docker_ModifyScript").on("click", function () {
    const openExplorer = require("open-file-explorer");
    openExplorer(
      path.join(path.dirname(_currentTemplatePath), "start.sh"),
      (err) => {
        if (err) {
          dialog.showMessageBoxSync(null, {
            type: "error",
            title: "Open docker script",
            message: err.message,
          });
        }
      }
    );
  });

  $("#btnSettings_NetCore_Path").on("click", function () {
    let result = dialog.showOpenDialogSync(null, {
      properties: ["openDirectory"],
    });
    if (result != null && result.length > 0) {
      $("#txtSettings_NetCore_Path").val(result[0]);
    }
  });

  $("#btnStopTemplate").on("click", function () {
    if (_isDockerRun) {
      (async () => {
        await stopDockerContainer(
          getSettingsIniObject(getEngineRoot()).Docker.ContainerName
        );
      })();
    } else {
      child.stdin.pause();
      child.kill();
    }
  });

  /*$("#btnExportDockerArchive").on("click", function () {
    if (_isDockerRun) {
      (async () => {
        await exportDockerArchive(
          "test",
          "/home/zenodys/app/tmp/",
          "docker_tmp.tar"
        );
      })();
    }
  });

  $("#btnDebugStepOver").on("click", function () {
    child.stdin.write("_DEBUG_:SIGNAL\n", "utf8");
  });

  $("#btnDebugStart").on("click", function () {
    child.stdin.write("_DEBUG_MODE_:1\n", "utf8");
  });

  $("#btnDebugEnd").on("click", function () {
    child.stdin.write("_DEBUG_MODE_:0\n", "utf8");
  });
*/

  $("#btnAddView").on("click", function () {
    AddNewView();
  });

  function AddNewView() {
    prompt({
      label: "View name:",
      height: 200,
      type: "input",
    })
      .then((r) => {
        if (r !== null) {
          _currentViewId = r;

          showDivs(_zen_divs, ["#main", "#canvas", "#propertiesSidebar"]);
          OpenTemplate(_currentTemplatePath);
        }
      })
      .catch((error) =>
        dialog.showMessageBoxSync(null, {
          type: "error",
          title: "Create view",
          message: error.message,
        })
      );
  }

  $("#btnCloseLog").on("click", function () {
    $("#divLogContent").empty();
    showDivs(_zen_divs, ["#main", "#canvas", "#propertiesSidebar"]);
  });

  function closeTemplate() {
    _diagram = new flowdesigner("canvas");
    disableEnableMenu(false);
    document.title = "algonia";
  }

  function fillSettings() {
    let engineRoot = getEngineRoot();
    if (engineRoot != null) {
      let settings = getSettingsIniObject(engineRoot);
      $("#txtSettings_NetCore_Path").val(settings.NetCore.Path);

      $("#txtSettings_Docker_ImageName").val(settings.Docker.ImageName);
      $("#txtSettings_Docker_ContainerName").val(settings.Docker.ContainerName);

      $("#txtSettings_Python_PackagesPath36").val(
        settings.Python.ModulesPath36
      );
      $("#txtSettings_Python_PackagesPath37").val(
        settings.Python.ModulesPath37
      );
      $("#txtSettings_Python_PackagesPath38").val(
        settings.Python.ModulesPath38
      );
    }
  }

  function getSettingsIniObject(engineRoot) {
    const loadIniFile = require("read-ini-file");
    const path = require("path");

    return loadIniFile.sync(path.join(engineRoot, "Settings.ini"));
  }

  disableEnableMenu(false);
  ipcRenderer.send("close-loader");

  function reopenLastActiveProject() {
    let recents = fs.readFileSync(
      path.resolve(getRoot(), "settings.json"),
      "utf8"
    );

    if (recents != "") {
      oRecents = JSON.parse(recents);
      if (oRecents.length > 0) {
        _currentViewId = oRecents[0].viewId;
        OpenTemplate(oRecents[0].projectPath, false);
      }
    }
  }

  reopenLastActiveProject();
});
