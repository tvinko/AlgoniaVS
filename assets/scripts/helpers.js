var _zen_divs = [
  "#divSelectTemplates",
  "#divSelectViews",
  "#divSelectElements",
  "#canvas",
  "#propertiesSidebar",
  "#dialogsContainer",
  "#logContainer",
  "#settingsContainer",
  "#main",
];

var row_splitter = "#101#";
var col_splitter = "#100#";

const engineCannotBeFoundOptions = {
  type: "error",
  buttons: ["OK"],
  title: "Error",
  message: "Engine cannot be found. Select path to engine!",
};

function fillSelectWithElements(selectName, implementations) {
  $(selectName).val();
  var nodes = _diagram.getNodes();
  for (var i in nodes) {
    if (
      implementations == null ||
      $.inArray(nodes[i].settings.implementation, implementations) > -1
    )
      $(selectName).append(
        '<option value="' +
          nodes[i].id +
          '">' +
          nodes[i].settings.label +
          "</option>"
      );
  }
}

function onPropertyDialogClose(hiddenFieldName, jsGridName) {
  $(hiddenFieldName).val("");
  $.each($(jsGridName).jsGrid("option", "data"), function (index, value) {
    $(hiddenFieldName).val(
      $(hiddenFieldName).val() +
        value.name +
        col_splitter +
        value.data_kind +
        row_splitter
    );
  });

  showDivs(_zen_divs, [
    "#canvas",
    "#main",
    "#propertiesSidebar",
    "#divSelectElements",
    "#divSelectTemplates",
    "#divSelectViews",
  ]);
  SaveProperties();
}

function createPropertyDialogClickEvent(htmlFilePath, buttonClass) {
  buttonClass = buttonClass == null ? ".open-command-dialog " : buttonClass;

  $(buttonClass).on("click", function (e) {
    e.preventDefault();
    showDivs(_zen_divs, ["#dialogsContainer"]);
    $("#dialogsContainer").load(htmlFilePath, function (data) {});
  });
}

function showDivs(divsCollection, divsToShow) {
  $.each(divsCollection, function (i) {
    $(divsCollection[i]).hide();
  });

  $.each(divsToShow, function (i) {
    $(divsToShow[i]).show();
  });
}

function uuidv4() {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
    var r = (Math.random() * 16) | 0,
      v = c == "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

var chars = {
  encode: function (str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/'/g, "&apos;")
      .replace(/\./g, "&period;")
      .replace(/,/g, "&comma;")
      .replace(/"/g, "&quot;")
      .replace(/\\/g, "&#92;");
  },
  decode: function (str) {
    return String(str)
      .replace(/&#92;/g, "\\")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&apos;/g, "'")
      .replace(/&period;/g, ".")
      .replace(/&comma;/g, ",")
      .replace(/&quot;/g, '"')
      .replace(/&amp;/g, "&");
  },
};

function text_truncate(str, length, ending) {
  if (length == null) {
    length = 100;
  }

  if (ending == null) {
    ending = "...";
  }

  if (str.length > length) {
    return str.substring(0, length - ending.length) + ending;
  } else {
    return str;
  }
}

function getAlgoniaRoot() {
  if (require("electron-is-packaged").isPackaged)
    return path.dirname(
      require("path").normalize(require("electron-root-path").rootPath)
    );
  else return require("path").normalize(require("electron-root-path").rootPath);
}

function getEngineRoot() {
  return path.resolve(getAlgoniaRoot(), "AlgoniaEngine");
}

function getAppRootDockerFormatHelper(path) {
  return (
    "/" +
    require("path")
      .join(getEngineRoot(), path)
      .replace(/\\/g, "/")
      .replace(":", "") +
    "/"
  );
}

function getTemplatesRootDockerFormat() {
  return getAppRootDockerFormatHelper("templates");
}

function getLibsRootDockerFormat() {
  return getAppRootDockerFormatHelper("libs");
}

function getTmpRootDockerFormat() {
  return getAppRootDockerFormatHelper("tmp");
}

var _logMsgCounter;
function handleEngineLog(msg, type) {
  _logMsgCounter++;
  if (_logMsgCounter > 1000) {
    _logMsgCounter = 0;
    $("#divLogContent").empty();
  }

  switch (type) {
    case 0:
      $("#divLogContent").prepend(
        $("<div><span>" + msg + "</span></div></br>")
      );
      break;

    case 1:
      $("#divLogContent").prepend(
        $('<div class="error"><span>' + msg + "</span></div></br>")
      );
      break;
  }
}
