function GetElementMainProperty(diagram, key) {
    return diagram.getSelectedNodes()[0].node.settings.elementProperties[key];
}

function SaveInputPropertyEncoded(h, htmlId) {
    if ($("#" + htmlId).val().length != 0) {
        h[htmlId] = chars.encode($("#" + htmlId).val());
    }
}

function SetNameProperty(diagram) {
    $("#name").val(diagram.getSelectedNodes()[0].settings.label);
}

function SaveNameProperty(diagram) {
    if (diagram.getSelectedNodes()[0].settings.label != ($("#name").val()))
        diagram.getSelectedNodes()[0].setLabelColor('#ff0000');


    diagram.getSelectedNodes()[0].setLabel(($("#name").val()));

}

function SaveInputProperty(h, htmlId) {
    h[htmlId] = $("#" + htmlId).val();
}

function GetElementProperty(diagram, key) {
    if (diagram.getSelectedNodes()[0].settings.hasOwnProperty('elementProperties')
        && diagram.getSelectedNodes()[0].settings.elementProperties != null
    )
        return diagram.getSelectedNodes()[0].settings.elementProperties[key];

    return null;
}

function SetCheckBoxElementProperty(diagram, htmlId, defaultValue, trueValue) {
    var val =
        GetElementProperty(diagram, htmlId) == null
            ? defaultValue
            : GetElementProperty(diagram, htmlId);
    $("#" + htmlId + "").prop("checked", val == trueValue);
}

function SaveCheckboxProperty(h, htmlId, trueValue, falseValue) {
    h[htmlId] = $("#" + htmlId).is(":checked") ? trueValue : falseValue;
}

function SetInputElementPropertyDecoded(diagram, htmlId, defaultValue) {
    var propValue = GetElementProperty(diagram, htmlId);
    if (propValue != null) {
        if (propValue.indexOf("&amp;gt;") > -1) {
            throw "Invalid string encoding.";
        }

        $("#" + htmlId + "").val(chars.decode(propValue));
    } else $("#" + htmlId + "").val(defaultValue);
}

function SetInputElementProperty(diagram, htmlId, defaultValue) {
    var propValue = GetElementProperty(diagram, htmlId);
    if (propValue != null) $("#" + htmlId + "").val(propValue);
    else $("#" + htmlId + "").val(defaultValue);
}