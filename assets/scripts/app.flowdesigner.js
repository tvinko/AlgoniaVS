function addNodeHelper(diagram, node, propertiesTemplateRoot){
    diagram.addNode(n = new flowdesigner.node(diagram, {
        'id':node.id,
        'label': node.label,
        'x': node.x,
        'y': node.y,
        'color': node.color,
        'implementation': node.implementation,
        'file': node.file,
        'elementProperties': node.elementProperties,
        'viewId': node.viewId,
        'input': node.input,
        'output': node.output,
        'scope': node.scope
    }));
    n.render();
  
    n.onPreMouseDown = function(event){
        var selectedNodesArr = diagram.getSelectedNodes();
        if (selectedNodesArr.length > 0)
        {
            var currentProperties = JSON.stringify(selectedNodesArr[0].settings.elementProperties);
            if (selectedNodesArr[0].settings.scope == 'DataProcessPipeline')
                selectedNodesArr[0].settings.elementProperties = SavePropertiesDpf();
            else
            {
                selectedNodesArr[0].settings.elementProperties = SaveProperties();
            }
            
            if (JSON.stringify(selectedNodesArr[0].settings.elementProperties) != currentProperties)
              selectedNodesArr[0].setLabelColor('#ff0000');
        };
    };
    
    n.onMouseDown = function(event){
        var fileName = diagram.getSelectedNodes()[0].settings.file;
        $("#propertiesSidebar").load(propertiesTemplateRoot + "/"+ fileName +"/"+ fileName +".html");
        openNav();
    };

    return n;
  }

function drawNodes(diagram, containerName,scope, color, nodes, wires, propertiesTemplateRoot){
    diagram = new flowdesigner(containerName);
    diagram.defineScope(scope, {'color': color});
    
    $.each(nodes, function( key, element ) {
        if (element.viewId == _currentViewId)
            addNodeHelper(diagram, element, propertiesTemplateRoot);
    });

    $.each(wires, function( key, wire ) {
        
        if (nodes.find(x => x.viewId == _currentViewId && (x.id==wire.target.replace("-in", "") ||x.id==wire.source.replace("-out_true", "").replace("-out_false", ""))) != null)
            diagram.addWire(wire);
    });
    
    diagram.draw();
    return diagram;
}