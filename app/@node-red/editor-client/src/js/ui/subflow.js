/**
 * Copyright JS Foundation and other contributors, http://js.foundation
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * */

RED.subflow = (function () {
  let currentLocale = "en-US";

  const _subflowEditTemplate = "<script type=\"text/x-red\" data-template-name=\"subflow\">"
        + "<div class=\"form-row\">"
            + "<label for=\"node-input-name\" data-i18n=\"[append]editor:common.label.name\"><i class=\"fa fa-tag\"></i> </label>"
            + "<input type=\"text\" id=\"node-input-name\" data-i18n=\"[placeholder]common.label.name\">"
        + "</div>"
        + "<div id=\"subflow-input-ui\"></div>"
        + "</script>";

  const _subflowTemplateEditTemplate = "<script type=\"text/x-red\" data-template-name=\"subflow-template\">"
        + "<div class=\"form-row\">"
            + "<label for=\"subflow-input-name\" data-i18n=\"[append]common.label.name\"><i class=\"fa fa-tag\"></i>  </label>"
            + "<input type=\"text\" id=\"subflow-input-name\" data-i18n=\"[placeholder]common.label.name\">"
        + "</div>"
        + "<div class=\"form-row\">"
            + "<ul style=\"margin-bottom: 20px;\" id=\"subflow-env-tabs\"></ul>"
        + "</div>"
        + "<div id=\"subflow-env-tabs-content\">"
            + "<div id=\"subflow-env-tab-edit\">"
                + "<div class=\"form-row node-input-env-container-row\" id=\"subflow-input-edit-ui\">"
                    + "<ol class=\"red-ui-editor-subflow-env-list\" id=\"node-input-env-container\"></ol>"
                    + "<div class=\"node-input-env-locales-row\"><i class=\"fa fa-language\"></i> <select id=\"subflow-input-env-locale\"></select></div>"
                + "</div>"
            + "</div>"
            + "<div id=\"subflow-env-tab-preview\">"
                + "<div id=\"subflow-input-ui\"/>"
            + "</div>"
        + "</div>"
        + "</script>";

  const _subflowModulePaneTemplate = "<form class=\"dialog-form form-horizontal\" autocomplete=\"off\">"
        + "<div class=\"form-row\">"
            + "<label for=\"subflow-input-module-module\" data-i18n=\"[append]editor:subflow.module\"><i class=\"fa fa-cube\"></i> </label>"
            + "<input style=\"width: calc(100% - 110px)\" type=\"text\" id=\"subflow-input-module-module\" data-i18n=\"[placeholder]common.label.name\">"
        + "</div>"
        + "<div class=\"form-row\">"
            + "<label for=\"subflow-input-module-type\" data-i18n=\"[append]editor:subflow.type\"> </label>"
            + "<input style=\"width: calc(100% - 110px)\" type=\"text\" id=\"subflow-input-module-type\">"
        + "</div>"
        + "<div class=\"form-row\">"
            + "<label for=\"subflow-input-module-version\" data-i18n=\"[append]editor:subflow.version\"></label>"
            + "<input style=\"width: calc(100% - 110px)\" type=\"text\" id=\"subflow-input-module-version\" data-i18n=\"[placeholder]editor:subflow.versionPlaceholder\">"
        + "</div>"
        + "<div class=\"form-row\">"
            + "<label for=\"subflow-input-module-desc\" data-i18n=\"[append]editor:subflow.desc\"></label>"
            + "<input style=\"width: calc(100% - 110px)\" type=\"text\" id=\"subflow-input-module-desc\">"
        + "</div>"
        + "<div class=\"form-row\">"
            + "<label for=\"subflow-input-module-license\" data-i18n=\"[append]editor:subflow.license\"></label>"
            + "<input style=\"width: calc(100% - 110px)\" type=\"text\" id=\"subflow-input-module-license\">"
        + "</div>"
        + "<div class=\"form-row\">"
            + "<label for=\"subflow-input-module-author\" data-i18n=\"[append]editor:subflow.author\"></label>"
            + "<input style=\"width: calc(100% - 110px)\" type=\"text\" id=\"subflow-input-module-author\" data-i18n=\"[placeholder]editor:subflow.authorPlaceholder\">"
        + "</div>"
        + "<div class=\"form-row\">"
            + "<label for=\"subflow-input-module-keywords\" data-i18n=\"[append]editor:subflow.keys\"></label>"
            + "<input style=\"width: calc(100% - 110px)\" type=\"text\" id=\"subflow-input-module-keywords\" data-i18n=\"[placeholder]editor:subflow.keysPlaceholder\">"
        + "</div>"
    + "</form>";

  function findAvailableSubflowIOPosition(subflow, isInput) {
    const pos = { x: 50, y: 30 };
    if (!isInput) {
      pos.x += 110;
    }
    const ports = [].concat(subflow.out).concat(subflow.in);
    if (subflow.status) {
      ports.push(subflow.status);
    }
    ports.sort((A, B) => A.x - B.x);
    for (let i = 0; i < ports.length; i++) {
      const port = ports[i];
      if (port.x == pos.x && port.y == pos.y) {
        pos.x += 55;
      }
    }
    return pos;
  }

  function addSubflowInput() {
    const subflow = RED.nodes.subflow(RED.workspaces.active());
    if (subflow.in.length === 1) {
      return;
    }
    const position = findAvailableSubflowIOPosition(subflow, true);
    const newInput = {
      type: "subflow",
      direction: "in",
      z: subflow.id,
      i: subflow.in.length,
      x: position.x,
      y: position.y,
      id: RED.nodes.id()
    };
    const oldInCount = subflow.in.length;
    subflow.in.push(newInput);
    subflow.dirty = true;
    const wasDirty = RED.nodes.dirty();
    const wasChanged = subflow.changed;
    subflow.changed = true;
    const result = refresh(true);
    const historyEvent = {
      t: "edit",
      node: subflow,
      dirty: wasDirty,
      changed: wasChanged,
      subflow: {
        inputCount: oldInCount,
        instances: result.instances
      }
    };
    RED.history.push(historyEvent);
    RED.view.select();
    RED.nodes.dirty(true);
    RED.view.redraw();
    $("#red-ui-subflow-input-add").addClass("active");
    $("#red-ui-subflow-input-remove").removeClass("active");
    RED.events.emit("subflows:change", subflow);
  }

  function removeSubflowInput() {
    const activeSubflow = RED.nodes.subflow(RED.workspaces.active());
    if (activeSubflow.in.length === 0) {
      return;
    }
    const removedInput = activeSubflow.in[0];
    const removedInputLinks = [];
    RED.nodes.eachLink((l) => {
      if (l.source.type == "subflow" && l.source.z == activeSubflow.id && l.source.i == removedInput.i) {
        removedInputLinks.push(l);
      } else if (l.target.type == `subflow:${activeSubflow.id}`) {
        removedInputLinks.push(l);
      }
    });
    removedInputLinks.forEach((l) => { RED.nodes.removeLink(l); });
    activeSubflow.in = [];
    $("#red-ui-subflow-input-add").removeClass("active");
    $("#red-ui-subflow-input-remove").addClass("active");
    activeSubflow.changed = true;
    RED.events.emit("subflows:change", activeSubflow);
    return { subflowInputs: [removedInput], links: removedInputLinks };
  }

  function addSubflowOutput() {
    const subflow = RED.nodes.subflow(RED.workspaces.active());
    const position = findAvailableSubflowIOPosition(subflow, false);

    const newOutput = {
      type: "subflow",
      direction: "out",
      z: subflow.id,
      i: subflow.out.length,
      x: position.x,
      y: position.y,
      id: RED.nodes.id()
    };
    const oldOutCount = subflow.out.length;
    subflow.out.push(newOutput);
    subflow.dirty = true;
    const wasDirty = RED.nodes.dirty();
    const wasChanged = subflow.changed;
    subflow.changed = true;

    const result = refresh(true);

    const historyEvent = {
      t: "edit",
      node: subflow,
      dirty: wasDirty,
      changed: wasChanged,
      subflow: {
        outputCount: oldOutCount,
        instances: result.instances
      }
    };
    RED.history.push(historyEvent);
    RED.view.select();
    RED.nodes.dirty(true);
    RED.view.redraw();
    $("#red-ui-subflow-output .spinner-value").text(subflow.out.length);
    RED.events.emit("subflows:change", subflow);
  }

  function removeSubflowOutput(removedSubflowOutputs) {
    const activeSubflow = RED.nodes.subflow(RED.workspaces.active());
    if (activeSubflow.out.length === 0) {
      return;
    }
    if (typeof removedSubflowOutputs === "undefined") {
      removedSubflowOutputs = [activeSubflow.out[activeSubflow.out.length - 1]];
    }
    let removedLinks = [];
    removedSubflowOutputs.sort((a, b) => b.i - a.i);
    for (let i = 0; i < removedSubflowOutputs.length; i++) {
      var output = removedSubflowOutputs[i];
      activeSubflow.out.splice(output.i, 1);
      var subflowRemovedLinks = [];
      var subflowMovedLinks = [];
      RED.nodes.eachLink((l) => {
        if (l.target.type == "subflow" && l.target.z == activeSubflow.id && l.target.i == output.i) {
          subflowRemovedLinks.push(l);
        }
        if (l.source.type == `subflow:${activeSubflow.id}`) {
          if (l.sourcePort == output.i) {
            subflowRemovedLinks.push(l);
          } else if (l.sourcePort > output.i) {
            subflowMovedLinks.push(l);
          }
        }
      });
      subflowRemovedLinks.forEach((l) => { RED.nodes.removeLink(l); });
      subflowMovedLinks.forEach((l) => { l.sourcePort--; });

      removedLinks = removedLinks.concat(subflowRemovedLinks);
      for (let j = output.i; j < activeSubflow.out.length; j++) {
        activeSubflow.out[j].i--;
        activeSubflow.out[j].dirty = true;
      }
    }
    activeSubflow.changed = true;
    RED.events.emit("subflows:change", activeSubflow);
    return { subflowOutputs: removedSubflowOutputs, links: removedLinks };
  }

  function addSubflowStatus() {
    const subflow = RED.nodes.subflow(RED.workspaces.active());
    if (subflow.status) {
      return;
    }
    const position = findAvailableSubflowIOPosition(subflow, false);
    const statusNode = {
      type: "subflow",
      direction: "status",
      z: subflow.id,
      x: position.x,
      y: position.y,
      id: RED.nodes.id()
    };
    subflow.status = statusNode;
    subflow.dirty = true;
    const wasDirty = RED.nodes.dirty();
    const wasChanged = subflow.changed;
    subflow.changed = true;
    // const result = refresh(true);
    const historyEvent = {
      t: "edit",
      node: subflow,
      dirty: wasDirty,
      changed: wasChanged,
      subflow: { status: true }
    };
    RED.history.push(historyEvent);
    RED.view.select();
    RED.nodes.dirty(true);
    RED.view.redraw();
    RED.events.emit("subflows:change", subflow);
    $("#red-ui-subflow-status").prop("checked", !!subflow.status);
    $("#red-ui-subflow-status").parent().parent().toggleClass("active", !!subflow.status);
  }

  function removeSubflowStatus() {
    const subflow = RED.nodes.subflow(RED.workspaces.active());
    if (!subflow.status) {
      return;
    }
    const subflowRemovedLinks = [];
    RED.nodes.eachLink((l) => {
      if (l.target.type == "subflow" && l.target.z == subflow.id && l.target.direction == "status") {
        subflowRemovedLinks.push(l);
      }
    });
    subflowRemovedLinks.forEach((l) => { RED.nodes.removeLink(l); });
    delete subflow.status;

    $("#red-ui-subflow-status").prop("checked", !!subflow.status);
    $("#red-ui-subflow-status").parent().parent().toggleClass("active", !!subflow.status);

    return { links: subflowRemovedLinks };
  }

  function refresh(markChange) {
    const activeSubflow = RED.nodes.subflow(RED.workspaces.active());
    refreshToolbar(activeSubflow);
    const subflowInstances = [];
    if (activeSubflow) {
      RED.nodes.filterNodes({ type: `subflow:${activeSubflow.id}` }).forEach((n) => {
        subflowInstances.push({
          id: n.id,
          changed: n.changed
        });
        if (markChange) {
          n.changed = true;
        }
        n.inputs = activeSubflow.in.length;
        n.outputs = activeSubflow.out.length;
        n.resize = true;
        n.dirty = true;
        RED.editor.updateNodeProperties(n);
      });
      RED.editor.validateNode(activeSubflow);
      return {
        instances: subflowInstances
      };
    }
  }

  function refreshToolbar(activeSubflow) {
    if (activeSubflow) {
      $("#red-ui-subflow-input-add").toggleClass("active", activeSubflow.in.length !== 0);
      $("#red-ui-subflow-input-remove").toggleClass("active", activeSubflow.in.length === 0);

      $("#red-ui-subflow-output .spinner-value").text(activeSubflow.out.length);

      $("#red-ui-subflow-status").prop("checked", !!activeSubflow.status);
      $("#red-ui-subflow-status").parent().parent().toggleClass("active", !!activeSubflow.status);
    }
  }

  function showWorkspaceToolbar(activeSubflow) {
    const toolbar = $("#red-ui-workspace-toolbar");
    toolbar.empty();

    // Edit properties
    $("<a class=\"button\" id=\"red-ui-subflow-edit\" href=\"#\" data-i18n=\"[append]subflow.editSubflowProperties\"><i class=\"fa fa-pencil\"></i> </a>").appendTo(toolbar);

    // Inputs
    $("<span style=\"margin-left: 5px;\" data-i18n=\"subflow.input\"></span> "
            + "<div style=\"display: inline-block;\" class=\"button-group\">"
            + "<a id=\"red-ui-subflow-input-remove\" class=\"button active\" href=\"#\">0</a>"
            + "<a id=\"red-ui-subflow-input-add\" class=\"button\" href=\"#\">1</a>"
            + "</div>").appendTo(toolbar);

    // Outputs
    $("<span style=\"margin-left: 5px;\" data-i18n=\"subflow.output\"></span> <div id=\"red-ui-subflow-output\" style=\"display: inline-block;\" class=\"button-group spinner-group\">"
            + "<a id=\"red-ui-subflow-output-remove\" class=\"button\" href=\"#\"><i class=\"fa fa-minus\"></i></a>"
            + "<div class=\"spinner-value\">3</div>"
            + "<a id=\"red-ui-subflow-output-add\" class=\"button\" href=\"#\"><i class=\"fa fa-plus\"></i></a>"
            + "</div>").appendTo(toolbar);

    // Status
    $("<span class=\"button-group\"><span class=\"button\" style=\"padding:0\"><label for=\"red-ui-subflow-status\"><input id=\"red-ui-subflow-status\" type=\"checkbox\"> <span data-i18n=\"subflow.status\"></span></label></span></span>").appendTo(toolbar);

    // $('<a class="button disabled" id="red-ui-subflow-add-input" href="#" data-i18n="[append]subflow.input"><i class="fa fa-plus"></i> </a>').appendTo(toolbar);
    // $('<a class="button" id="red-ui-subflow-add-output" href="#" data-i18n="[append]subflow.output"><i class="fa fa-plus"></i> </a>').appendTo(toolbar);

    // Delete
    $("<a class=\"button\" id=\"red-ui-subflow-delete\" href=\"#\" data-i18n=\"[append]subflow.deleteSubflow\"><i class=\"fa fa-trash\"></i> </a>").appendTo(toolbar);

    toolbar.i18n();


    $("#red-ui-subflow-output-remove").on("click", (event) => {
      event.preventDefault();
      const wasDirty = RED.nodes.dirty();
      const wasChanged = activeSubflow.changed;
      const result = removeSubflowOutput();
      if (result) {
        const inst = refresh(true);
        RED.history.push({
          t: "delete",
          links: result.links,
          subflowOutputs: result.subflowOutputs,
          changed: wasChanged,
          dirty: wasDirty,
          subflow: {
            instances: inst.instances
          }
        });

        RED.view.select();
        RED.nodes.dirty(true);
        RED.view.redraw(true);
      }
    });

    $("#red-ui-subflow-output-add").on("click", (event) => {
      event.preventDefault();
      addSubflowOutput();
    });

    $("#red-ui-subflow-input-add").on("click", (event) => {
      event.preventDefault();
      addSubflowInput();
    });

    $("#red-ui-subflow-input-remove").on("click", (event) => {
      event.preventDefault();
      const wasDirty = RED.nodes.dirty();
      const wasChanged = activeSubflow.changed;
      activeSubflow.changed = true;
      const result = removeSubflowInput();
      if (result) {
        const inst = refresh(true);
        RED.history.push({
          t: "delete",
          links: result.links,
          changed: wasChanged,
          subflowInputs: result.subflowInputs,
          dirty: wasDirty,
          subflow: {
            instances: inst.instances
          }
        });
        RED.view.select();
        RED.nodes.dirty(true);
        RED.view.redraw(true);
      }
    });

    $("#red-ui-subflow-status").on("change", function (evt) {
      if (this.checked) {
        addSubflowStatus();
      } else {
        const currentStatus = activeSubflow.status;
        const wasChanged = activeSubflow.changed;
        const result = removeSubflowStatus();
        if (result) {
          activeSubflow.changed = true;
          const wasDirty = RED.nodes.dirty();
          RED.history.push({
            t: "delete",
            links: result.links,
            changed: wasChanged,
            dirty: wasDirty,
            subflow: {
              id: activeSubflow.id,
              status: currentStatus
            }
          });
          RED.view.select();
          RED.nodes.dirty(true);
          RED.view.redraw();
        }
      }
    });

    $("#red-ui-subflow-edit").on("click", (event) => {
      RED.editor.editSubflow(RED.nodes.subflow(RED.workspaces.active()));
      event.preventDefault();
    });

    $("#red-ui-subflow-delete").on("click", (event) => {
      event.preventDefault();
      const subflow = RED.nodes.subflow(RED.workspaces.active());
      if (subflow.instances.length > 0) {
        const msg = $("<div>");
        $("<p>").text(RED._("subflow.subflowInstances", { count: subflow.instances.length })).appendTo(msg);
        $("<p>").text(RED._("subflow.confirmDelete")).appendTo(msg);
        var confirmDeleteNotification = RED.notify(msg, {
          modal: true,
          fixed: true,
          buttons: [
            {
              text: RED._("common.label.cancel"),
              click() {
                confirmDeleteNotification.close();
              }
            },
            {
              text: RED._("workspace.confirmDelete"),
              class: "primary",
              click() {
                confirmDeleteNotification.close();
                completeDelete();
              }
            }
          ]
        });
      } else {
        completeDelete();
      }
      function completeDelete() {
        const startDirty = RED.nodes.dirty();
        const historyEvent = removeSubflow(RED.workspaces.active());
        historyEvent.t = "delete";
        historyEvent.dirty = startDirty;
        RED.history.push(historyEvent);
      }
    });

    refreshToolbar(activeSubflow);

    $("#red-ui-workspace-chart").css({ "margin-top": "40px" });
    $("#red-ui-workspace-toolbar").show();
  }

  function hideWorkspaceToolbar() {
    $("#red-ui-workspace-toolbar").hide().empty();
    $("#red-ui-workspace-chart").css({ "margin-top": "0" });
  }

  function removeSubflow(id, keepInstanceNodes) {
    // TODO:  A lot of this logic is common with RED.nodes.removeWorkspace
    let removedNodes = [];
    let removedLinks = [];
    let removedGroups = [];

    const activeSubflow = RED.nodes.subflow(id);

    RED.nodes.eachNode((n) => {
      if (!keepInstanceNodes && n.type == `subflow:${id}`) {
        removedNodes.push(n);
      }
      if (n.z == id) {
        removedNodes.push(n);
      }
    });
    RED.nodes.eachConfig((n) => {
      if (n.z == id) {
        removedNodes.push(n);
      }
    });
    RED.nodes.groups(id).forEach((n) => {
      removedGroups.push(n);
    });
    let removedConfigNodes = [];
    for (var i = 0; i < removedNodes.length; i++) {
      const removedEntities = RED.nodes.remove(removedNodes[i].id);
      removedLinks = removedLinks.concat(removedEntities.links);
      removedConfigNodes = removedConfigNodes.concat(removedEntities.nodes);
    }
    // TODO: this whole delete logic should be in RED.nodes.removeSubflow..
    removedNodes = removedNodes.concat(removedConfigNodes);

    removedGroups = RED.nodes.groups(id).filter((g) => !g.g);
    for (i = 0; i < removedGroups.length; i++) {
      removedGroups[i].nodes.forEach((n) => {
        if (n.type === "group") {
          removedGroups.push(n);
        }
      });
    }
    // Now remove them in the reverse order
    for (i = removedGroups.length - 1; i >= 0; i--) {
      RED.nodes.removeGroup(removedGroups[i]);
    }
    RED.nodes.removeSubflow(activeSubflow);
    RED.workspaces.remove(activeSubflow);
    RED.nodes.dirty(true);
    RED.view.redraw();

    return {
      nodes: removedNodes,
      links: removedLinks,
      groups: removedGroups,
      subflows: [activeSubflow]
    };
  }

  function init() {
    RED.events.on("workspace:change", (event) => {
      const activeSubflow = RED.nodes.subflow(event.workspace);
      if (activeSubflow) {
        showWorkspaceToolbar(activeSubflow);
      } else {
        hideWorkspaceToolbar();
      }
    });
    RED.events.on("view:selection-changed", (selection) => {
      if (!selection.nodes) {
        RED.menu.setDisabled("menu-item-subflow-convert", true);
      } else {
        RED.menu.setDisabled("menu-item-subflow-convert", false);
      }
    });

    RED.actions.add("core:create-subflow", createSubflow);
    RED.actions.add("core:convert-to-subflow", convertToSubflow);

    $(_subflowEditTemplate).appendTo("#red-ui-editor-node-configs");
    $(_subflowTemplateEditTemplate).appendTo("#red-ui-editor-node-configs");
  }

  function createSubflow() {
    let lastIndex = 0;
    RED.nodes.eachSubflow((sf) => {
      const m = (new RegExp("^Subflow (\\d+)$")).exec(sf.name);
      if (m) {
        lastIndex = Math.max(lastIndex, m[1]);
      }
    });

    const name = `Subflow ${lastIndex + 1}`;

    const subflowId = RED.nodes.id();
    const subflow = {
      type: "subflow",
      id: subflowId,
      name,
      info: "",
      in: [],
      out: []
    };
    RED.nodes.addSubflow(subflow);
    RED.history.push({
      t: "createSubflow",
      subflow: {
        subflow
      },
      dirty: RED.nodes.dirty()
    });
    RED.workspaces.show(subflowId);
    RED.nodes.dirty(true);
  }

  function snapToGrid(x) {
    if (RED.settings.get("editor").view["view-snap-grid"]) {
      x = Math.round(x / RED.view.gridSize()) * RED.view.gridSize();
    }
    return x;
  }

  function convertToSubflow() {
    const selection = RED.view.selection();
    if (!selection.nodes) {
      RED.notify(RED._("subflow.errors.noNodesSelected"), "error");
      return;
    }
    let i; let n;
    let nodeList = new Set();
    let tmplist = selection.nodes.slice();
    const includedGroups = new Set();
    while (tmplist.length > 0) {
      n = tmplist.shift();
      if (n.type === "group") {
        includedGroups.add(n.id);
        tmplist = tmplist.concat(n.nodes);
      }
      nodeList.add(n);
    }

    nodeList = Array.from(nodeList);

    let containingGroup = nodeList[0].g;
    const nodesMovedFromGroup = [];

    for (i = 0; i < nodeList.length; i++) {
      if (nodeList[i].g && !includedGroups.has(nodeList[i].g)) {
        if (containingGroup !== nodeList[i].g) {
          RED.notify("Cannot create subflow across multiple groups", "error");
          return;
        }
      }
    }
    if (containingGroup) {
      containingGroup = RED.nodes.group(containingGroup);
    }
    const nodes = {};
    const new_links = [];
    const removedLinks = [];

    const candidateInputs = [];
    let candidateOutputs = [];
    const candidateInputNodes = {};

    let boundingBox = [nodeList[0].x,
      nodeList[0].y,
      nodeList[0].x,
      nodeList[0].y];

    for (i = 0; i < nodeList.length; i++) {
      n = nodeList[i];
      nodes[n.id] = { n, outputs: {} };
      boundingBox = [
        Math.min(boundingBox[0], n.x),
        Math.min(boundingBox[1], n.y),
        Math.max(boundingBox[2], n.x),
        Math.max(boundingBox[3], n.y)
      ];
    }
    const offsetX = snapToGrid(boundingBox[0] - 200);
    const offsetY = snapToGrid(boundingBox[1] - 80);


    const center = [
      snapToGrid((boundingBox[2] + boundingBox[0]) / 2),
      snapToGrid((boundingBox[3] + boundingBox[1]) / 2)
    ];

    RED.nodes.eachLink((link) => {
      if (nodes[link.source.id] && nodes[link.target.id]) {
        // A link wholely within the selection
      }

      if (nodes[link.source.id] && !nodes[link.target.id]) {
        // An outbound link from the selection
        candidateOutputs.push(link);
        removedLinks.push(link);
      }
      if (!nodes[link.source.id] && nodes[link.target.id]) {
        // An inbound link
        candidateInputs.push(link);
        candidateInputNodes[link.target.id] = link.target;
        removedLinks.push(link);
      }
    });

    const outputs = {};
    candidateOutputs = candidateOutputs.filter((v) => {
      if (outputs[`${v.source.id}:${v.sourcePort}`]) {
        outputs[`${v.source.id}:${v.sourcePort}`].targets.push(v.target);
        return false;
      }
      v.targets = [];
      v.targets.push(v.target);
      outputs[`${v.source.id}:${v.sourcePort}`] = v;
      return true;
    });
    candidateOutputs.sort((a, b) => a.source.y - b.source.y);

    if (Object.keys(candidateInputNodes).length > 1) {
      RED.notify(RED._("subflow.errors.multipleInputsToSelection"), "error");
      return;
    }

    let lastIndex = 0;
    RED.nodes.eachSubflow((sf) => {
      const m = (new RegExp("^Subflow (\\d+)$")).exec(sf.name);
      if (m) {
        lastIndex = Math.max(lastIndex, m[1]);
      }
    });

    const name = `Subflow ${lastIndex + 1}`;

    const subflowId = RED.nodes.id();
    const subflow = {
      type: "subflow",
      id: subflowId,
      name,
      info: "",
      in: Object.keys(candidateInputNodes).map((v, i) => {
        const index = i; return {
          type: "subflow",
          direction: "in",
          x: snapToGrid(candidateInputNodes[v].x - (candidateInputNodes[v].w / 2) - 80 - offsetX),
          y: snapToGrid(candidateInputNodes[v].y - offsetY),
          z: subflowId,
          i: index,
          id: RED.nodes.id(),
          wires: [{ id: candidateInputNodes[v].id }]
        };
      }),
      out: candidateOutputs.map((v, i) => {
        const index = i; return {
          type: "subflow",
          direction: "out",
          x: snapToGrid(v.source.x + (v.source.w / 2) + 80 - offsetX),
          y: snapToGrid(v.source.y - offsetY),
          z: subflowId,
          i: index,
          id: RED.nodes.id(),
          wires: [{ id: v.source.id, port: v.sourcePort }]
        };
      })
    };

    RED.nodes.addSubflow(subflow);

    const subflowInstance = {
      id: RED.nodes.id(),
      type: `subflow:${subflow.id}`,
      x: center[0],
      y: center[1],
      z: RED.workspaces.active(),
      inputs: subflow.in.length,
      outputs: subflow.out.length,
      h: Math.max(30/* node_height */, (subflow.out.length || 0) * 15),
      changed: true
    };
    subflowInstance._def = RED.nodes.getType(subflowInstance.type);
    RED.editor.validateNode(subflowInstance);
    RED.nodes.add(subflowInstance);

    if (containingGroup) {
      RED.group.addToGroup(containingGroup, subflowInstance);
      nodeList.forEach((nl) => {
        if (nl.g === containingGroup.id) {
          delete nl.g;
          const index = containingGroup.nodes.indexOf(nl);
          containingGroup.nodes.splice(index, 1);
          nodesMovedFromGroup.push(nl);
        }
      });
      containingGroup.dirty = true;
    }


    candidateInputs.forEach((l) => {
      const link = { source: l.source, sourcePort: l.sourcePort, target: subflowInstance };
      new_links.push(link);
      RED.nodes.addLink(link);
    });

    candidateOutputs.forEach((output, i) => {
      output.targets.forEach((target) => {
        const link = { source: subflowInstance, sourcePort: i, target };
        new_links.push(link);
        RED.nodes.addLink(link);
      });
    });

    subflow.in.forEach((input) => {
      input.wires.forEach((wire) => {
        const link = { source: input, sourcePort: 0, target: RED.nodes.node(wire.id) };
        new_links.push(link);
        RED.nodes.addLink(link);
      });
    });
    subflow.out.forEach((output, i) => {
      output.wires.forEach((wire) => {
        const link = { source: RED.nodes.node(wire.id), sourcePort: wire.port, target: output };
        new_links.push(link);
        RED.nodes.addLink(link);
      });
    });

    for (i = 0; i < removedLinks.length; i++) {
      RED.nodes.removeLink(removedLinks[i]);
    }

    for (i = 0; i < nodeList.length; i++) {
      n = nodeList[i];
      if (/^link /.test(n.type)) {
        n.links = n.links.filter((id) => {
          const isLocalLink = nodes.hasOwnProperty(id);
          if (!isLocalLink) {
            const otherNode = RED.nodes.node(id);
            if (otherNode && otherNode.links) {
              const i = otherNode.links.indexOf(n.id);
              if (i > -1) {
                otherNode.links.splice(i, 1);
              }
            }
          }
          return isLocalLink;
        });
      }
      n.x -= offsetX;
      n.y -= offsetY;
      RED.nodes.moveNodeToTab(n, subflow.id);
    }


    let historyEvent = {
      t: "createSubflow",
      nodes: [subflowInstance.id],
      links: new_links,
      subflow: {
        subflow,
        offsetX,
        offsetY
      },

      activeWorkspace: RED.workspaces.active(),
      removedLinks,

      dirty: RED.nodes.dirty()
    };
    if (containingGroup) {
      historyEvent = {
        t: "multi",
        events: [historyEvent]
      };
      historyEvent.events.push({
        t: "addToGroup",
        group: containingGroup,
        nodes: [subflowInstance]
      });
      historyEvent.events.push({
        t: "removeFromGroup",
        group: containingGroup,
        nodes: nodesMovedFromGroup,
        reparent: false
      });
    }
    RED.history.push(historyEvent);
    RED.editor.validateNode(subflow);
    RED.nodes.dirty(true);
    RED.view.updateActive();
    RED.view.select(null);
  }


  /**
     * Create interface for controlling env var UI definition
     */
  function buildEnvControl(envList, node) {
    const tabs = RED.tabs.create({
      id: "subflow-env-tabs",
      onchange(tab) {
        if (tab.id === "subflow-env-tab-preview") {
          const inputContainer = $("#subflow-input-ui");
          const list = envList.editableList("items");
          const exportedEnv = exportEnvList(list, true);
          buildEnvUI(inputContainer, exportedEnv, node);
        }
        $("#subflow-env-tabs-content").children().hide();
        $(`#${tab.id}`).show();
      }
    });
    tabs.addTab({
      id: "subflow-env-tab-edit",
      label: RED._("editor-tab.envProperties")
    });
    tabs.addTab({
      id: "subflow-env-tab-preview",
      label: RED._("editor-tab.preview")
    });

    const localesList = RED.settings.theme("languages")
      .map((lc) => { const name = RED._(`languages.${lc}`); return { text: (name || lc), val: lc }; })
      .sort((a, b) => a.text.localeCompare(b.text));
    RED.popover.tooltip($(".node-input-env-locales-row i"), RED._("editor.locale"));
    const locales = $("#subflow-input-env-locale");
    localesList.forEach((item) => {
      const opt = {
        value: item.val
      };
      if (item.val === "en-US") { // make en-US default selected
        opt.selected = "";
      }
      $("<option/>", opt).text(item.text).appendTo(locales);
    });
    const locale = RED.i18n.lang();
    locales.val(locale);

    locales.on("change", function () {
      currentLocale = $(this).val();
      const items = $("#node-input-env-container").editableList("items");
      items.each(function (i, item) {
        const entry = $(this).data("data");
        const { labelField } = entry.ui;
        labelField.val(lookupLabel(entry.ui.label, "", currentLocale));
        if (labelField.timeout) {
          clearTimeout(labelField.timeout);
          delete labelField.timeout;
        }
        labelField.addClass("input-updated");
        labelField.timeout = setTimeout(() => {
          delete labelField.timeout;
          labelField.removeClass("input-updated");
        }, 3000);
      });
    });
  }

  const DEFAULT_ENV_TYPE_LIST = ["str", "num", "bool", "json", "bin", "env"];
  const DEFAULT_ENV_TYPE_LIST_INC_CRED = ["str", "num", "bool", "json", "bin", "env", "cred"];

  /**
     * Create env var edit interface
     * @param container - container
     * @param node - subflow node
     */
  function buildPropertiesList(envContainer, node) {
    const isTemplateNode = (node.type === "subflow");

    if (isTemplateNode) {
      buildEnvControl(envContainer, node);
    }
    envContainer
      .css({
        "min-height": "150px",
        "min-width": "450px"
      })
      .editableList({
        header: isTemplateNode ? $("<div><div><div></div><div data-i18n=\"common.label.name\"></div><div data-i18n=\"editor-tab.defaultValue\"></div><div></div></div></div>") : undefined,
        addItem(container, i, opt) {
          // If this is an instance node, these are properties unique to
          // this instance - ie opt.parent will not be defined.

          if (isTemplateNode) {
            container.addClass("red-ui-editor-subflow-env-editable");
          }

          const envRow = $("<div/>").appendTo(container);
          let nameField = null;
          let valueField = null;

          nameField = $("<input/>", {
            class: "node-input-env-name",
            type: "text",
            placeholder: RED._("common.label.name")
          }).attr("autocomplete", "disable").appendTo(envRow).val(opt.name);
          valueField = $("<input/>", {
            style: "width:100%",
            class: "node-input-env-value",
            type: "text",
          }).attr("autocomplete", "disable").appendTo(envRow);
          valueField.typedInput({ default: "str", types: isTemplateNode ? DEFAULT_ENV_TYPE_LIST : DEFAULT_ENV_TYPE_LIST_INC_CRED });
          valueField.typedInput("type", opt.type);
          if (opt.type === "cred") {
            if (opt.value) {
              valueField.typedInput("value", opt.value);
            } else if (node.credentials && node.credentials[opt.name]) {
              valueField.typedInput("value", node.credentials[opt.name]);
            } else if (node.credentials && node.credentials[`has_${opt.name}`]) {
              valueField.typedInput("value", "__PWRD__");
            } else {
              valueField.typedInput("value", "");
            }
          } else {
            valueField.typedInput("value", opt.value);
          }


          opt.nameField = nameField;
          opt.valueField = valueField;

          const actionButton = $("<a/>", { href: "#", class: "red-ui-editableList-item-remove red-ui-button red-ui-button-small" }).appendTo(envRow);
          $("<i/>", { class: `fa ${opt.parent ? "fa-reply" : "fa-remove"}` }).appendTo(actionButton);
          const removeTip = RED.popover.tooltip(actionButton, RED._("subflow.env.remove"));
          actionButton.on("click", (evt) => {
            evt.preventDefault();
            removeTip.close();
            container.parent().addClass("red-ui-editableList-item-deleting");
            container.fadeOut(300, () => {
              envContainer.editableList("removeItem", opt);
            });
          });

          if (isTemplateNode) {
            // Add the UI customisation row
            // if `opt.ui` does not exist, then apply defaults. If these
            // defaults do not change then they will get stripped off
            // before saving.
            if (opt.type === "cred") {
              opt.ui = opt.ui || {
                icon: "",
                type: "cred"
              };
              opt.ui.type = "cred";
            } else {
              opt.ui = opt.ui || {
                icon: "",
                type: "input",
                opts: { types: DEFAULT_ENV_TYPE_LIST }
              };
            }
            opt.ui.label = opt.ui.label || {};
            opt.ui.type = opt.ui.type || "input";

            const uiRow = $("<div/>").appendTo(container).hide();
            // save current info for reverting on cancel
            // var copy = $.extend(true, {}, ui);

            $("<a href=\"#\"><i class=\"fa fa-angle-right\"></a>").prependTo(envRow).on("click", function (evt) {
              evt.preventDefault();
              if ($(this).hasClass("expanded")) {
                uiRow.slideUp();
                $(this).removeClass("expanded");
              } else {
                uiRow.slideDown();
                $(this).addClass("expanded");
              }
            });

            buildEnvEditRow(uiRow, opt.ui, nameField, valueField);
            nameField.trigger("change");
          }
        },
        sortable: ".red-ui-editableList-item-handle",
        removable: false
      });
    const parentEnv = {};
    const envList = [];
    if (/^subflow:/.test(node.type)) {
      const subflowDef = RED.nodes.subflow(node.type.substring(8));
      if (subflowDef.env) {
        subflowDef.env.forEach((env) => {
          const item = {
            name: env.name,
            parent: {
              type: env.type,
              value: env.value,
              ui: env.ui
            }
          };
          envList.push(item);
          parentEnv[env.name] = item;
        });
      }
    }

    if (node.env) {
      for (let i = 0; i < node.env.length; i++) {
        const env = node.env[i];
        if (parentEnv.hasOwnProperty(env.name)) {
          parentEnv[env.name].type = env.type;
          parentEnv[env.name].value = env.value;
        } else {
          envList.push({
            name: env.name,
            type: env.type,
            value: env.value,
            ui: env.ui
          });
        }
      }
    }
    envList.forEach((env) => {
      if (env.parent && env.parent.ui && env.parent.ui.type === "hide") {
        return;
      }
      if (!isTemplateNode && env.parent) {
        return;
      }
      envContainer.editableList("addItem", JSON.parse(JSON.stringify(env)));
    });
  }

  /**
     * Create UI edit interface for environment variable
     * @param container - container
     * @param env - env var definition
     * @param nameField - name field of env var
     * @param valueField - value field of env var
     */
  function buildEnvEditRow(container, ui, nameField, valueField) {
    container.addClass("red-ui-editor-subflow-env-ui-row");
    const topRow = $("<div></div>").appendTo(container);
    $("<div></div>").appendTo(topRow);
    $("<div>").text(RED._("editor.icon")).appendTo(topRow);
    $("<div>").text(RED._("editor.label")).appendTo(topRow);
    $("<div>").text(RED._("editor.inputType")).appendTo(topRow);

    const row = $("<div></div>").appendTo(container);
    $("<div><i class=\"red-ui-editableList-item-handle fa fa-bars\"></i></div>").appendTo(row);
    const typeOptions = {
      input: { types: DEFAULT_ENV_TYPE_LIST },
      select: { opts: [] },
      spinner: {},
      cred: {}
    };
    if (ui.opts) {
      typeOptions[ui.type] = ui.opts;
    } else {
      // Pick up the default values if not otherwise provided
      ui.opts = typeOptions[ui.type];
    }
    const iconCell = $("<div></div>").appendTo(row);

    const iconButton = $("<a href=\"#\"></a>").appendTo(iconCell);
    iconButton.on("click", (evt) => {
      evt.preventDefault();
      const icon = ui.icon || "";
      const iconPath = (icon ? RED.utils.separateIconPath(icon) : {});
      RED.editor.showIconPicker(iconButton, null, iconPath, true, (newIcon) => {
        iconButton.empty();
        const path = newIcon || "";
        const newPath = RED.utils.separateIconPath(path);
        if (newPath) {
          $("<i class=\"fa\"></i>").addClass(newPath.file).appendTo(iconButton);
        }
        ui.icon = path;
      });
    });

    if (ui.icon) {
      const newPath = RED.utils.separateIconPath(ui.icon);
      $(`<i class="fa ${newPath.file}"></i>`).appendTo(iconButton);
    }

    const labelCell = $("<div></div>").appendTo(row);

    const label = ui.label && ui.label[currentLocale] || "";
    const labelInput = $("<input type=\"text\">").val(label).appendTo(labelCell);
    ui.labelField = labelInput;
    labelInput.on("change", function (evt) {
      ui.label = ui.label || {};
      const val = $(this).val().trim();
      if (val === "") {
        delete ui.label[currentLocale];
      } else {
        ui.label[currentLocale] = val;
      }
    });
    const labelIcon = $("<span class=\"red-ui-editor-subflow-env-lang-icon\"><i class=\"fa fa-language\"></i></span>").appendTo(labelCell);
    RED.popover.tooltip(labelIcon, () => {
      const langs = Object.keys(ui.label);
      const content = $("<div>");
      if (langs.indexOf(currentLocale) === -1) {
        langs.push(currentLocale);
        langs.sort();
      }
      langs.forEach((l) => {
        const row = $("<div>").appendTo(content);
        $("<span>").css({ display: "inline-block", width: "120px" }).text(RED._(`languages.${l}`) + (l === currentLocale ? "*" : "")).appendTo(row);
        $("<span>").text(ui.label[l] || "").appendTo(row);
      });
      return content;
    });

    nameField.on("change", function (evt) {
      labelInput.attr("placeholder", $(this).val());
    });

    const inputCell = $("<div></div>").appendTo(row);
    const inputCellInput = $("<input type=\"text\">").css("width", "100%").appendTo(inputCell);
    if (ui.type === "input") {
      inputCellInput.val(ui.opts.types.join(","));
    }
    let checkbox;
    let selectBox;

    inputCellInput.typedInput({
      types: [
        {
          value: "input",
          label: RED._("editor.inputs.input"),
          icon: "fa fa-i-cursor",
          showLabel: false,
          multiple: true,
          options: [
            { value: "str", label: RED._("editor.types.str"), icon: "red/images/typedinput/az.svg" },
            { value: "num", label: RED._("editor.types.num"), icon: "red/images/typedinput/09.svg" },
            { value: "bool", label: RED._("editor.types.bool"), icon: "red/images/typedinput/bool.svg" },
            { value: "json", label: RED._("editor.types.json"), icon: "red/images/typedinput/json.svg" },
            { value: "bin", label: RED._("editor.types.bin"), icon: "red/images/typedinput/bin.svg" },
            { value: "env", label: RED._("editor.types.env"), icon: "red/images/typedinput/env.svg" },
            { value: "cred", label: RED._("editor.types.cred"), icon: "fa fa-lock" }
          ],
          default: DEFAULT_ENV_TYPE_LIST,
          valueLabel(container, value) {
            container.css("padding", 0);
            const innerContainer = $("<div class=\"red-ui-editor-subflow-env-input-type\"></div>").appendTo(container);

            const input = $("<div class=\"placeholder-input\">").appendTo(innerContainer);
            $("<span><i class=\"fa fa-i-cursor\"></i></span>").appendTo(input);
            if (value.length) {
              value.forEach((v) => {
                if (!/^fa /.test(v.icon)) {
                  $("<img>", { src: v.icon, style: "max-width:14px; padding: 0 3px; margin-top:-4px; margin-left: 1px" }).appendTo(input);
                } else {
                  const s = $("<span>", { style: "max-width:14px; padding: 0 3px; margin-top:-4px; margin-left: 1px" }).appendTo(input);
                  $("<i>", { class: v.icon }).appendTo(s);
                }
              });
            } else {
              $("<span class=\"red-ui-editor-subflow-env-input-type-placeholder\"></span>").text(RED._("editor.selectType")).appendTo(input);
            }
          }
        },
        {
          value: "cred",
          label: RED._("typedInput.type.cred"),
          icon: "fa fa-lock",
          showLabel: false,
          valueLabel(container, value) {
            container.css("padding", 0);
            const innerContainer = $("<div class=\"red-ui-editor-subflow-env-input-type\">").css({
              "border-top-right-radius": "4px",
              "border-bottom-right-radius": "4px"
            }).appendTo(container);
            $("<div class=\"placeholder-input\">").html("&bull;&bull;&bull;&bull;&bull;&bull;&bull;&bull;").appendTo(innerContainer);
          }
        },
        {
          value: "select",
          label: RED._("editor.inputs.select"),
          icon: "fa fa-tasks",
          showLabel: false,
          valueLabel(container, value) {
            container.css("padding", "0");

            selectBox = $("<select></select>").appendTo(container);
            if (ui.opts && Array.isArray(ui.opts.opts)) {
              ui.opts.opts.forEach((o) => {
                const label = lookupLabel(o.l, o.l["en-US"] || o.v, currentLocale);
                // $('<option>').val((o.t||'str')+":"+o.v).text(label).appendTo(selectBox);
                $("<option>").val(o.v).text(label).appendTo(selectBox);
              });
            }
            selectBox.on("change", (evt) => {
              const v = selectBox.val();
              // var parts = v.split(":");
              // var t = parts.shift();
              // v = parts.join(":");
              //
              // valueField.typedInput("type",'str')
              valueField.typedInput("value", v);
            });
            selectBox.val(valueField.typedInput("value"));
            // selectBox.val(valueField.typedInput('type')+":"+valueField.typedInput("value"));
          },
          expand: {
            icon: "fa-caret-down",
            minWidth: 400,
            content(container) {
              const content = $("<div class=\"red-ui-editor-subflow-ui-edit-panel\">").appendTo(container);
              var optList = $("<ol>").appendTo(content).editableList({
                header: $(`<div><div>${RED._("editor.select.label")}</div><div>${RED._("editor.select.value")}</div></div>`),
                addItem(row, index, itemData) {
                  const labelDiv = $("<div>").appendTo(row);
                  const label = lookupLabel(itemData.l, "", currentLocale);
                  itemData.label = $("<input type=\"text\">").val(label).appendTo(labelDiv);
                  itemData.label.on("keydown", (evt) => {
                    if (evt.keyCode === 13) {
                      itemData.input.focus();
                      evt.preventDefault();
                    }
                  });
                  const labelIcon = $("<span class=\"red-ui-editor-subflow-env-lang-icon\"><i class=\"fa fa-language\"></i></span>").appendTo(labelDiv);
                  RED.popover.tooltip(labelIcon, () => currentLocale);
                  itemData.input = $("<input type=\"text\">").val(itemData.v).appendTo(row);

                  // Problem using a TI here:
                  //  - this is in a popout panel
                  //  - clicking the expand button in the TI will close the parent edit tray
                  //    and open the type editor.
                  //  - but it leaves the popout panel over the top.
                  //  - there is no way to get back to the popout panel after closing the type editor
                  // .typedInput({default:itemData.t||'str', types:DEFAULT_ENV_TYPE_LIST});
                  itemData.input.on("keydown", (evt) => {
                    if (evt.keyCode === 13) {
                      // Enter or Tab
                      const index = optList.editableList("indexOf", itemData);
                      const length = optList.editableList("length");
                      if (index + 1 === length) {
                        const newItem = {};
                        optList.editableList("addItem", newItem);
                        setTimeout(() => {
                          if (newItem.label) {
                            newItem.label.focus();
                          }
                        }, 100);
                      } else {
                        const nextItem = optList.editableList("getItemAt", index + 1);
                        if (nextItem.label) {
                          nextItem.label.focus();
                        }
                      }
                      evt.preventDefault();
                    }
                  });
                },
                sortable: true,
                removable: true,
                height: 160
              });
              if (ui.opts.opts.length > 0) {
                ui.opts.opts.forEach((o) => {
                  optList.editableList("addItem", $.extend(true, {}, o));
                });
              } else {
                optList.editableList("addItem", {});
              }
              return {
                onclose() {
                  const items = optList.editableList("items");
                  const vals = [];
                  items.each((i, el) => {
                    const data = el.data("data");
                    const l = data.label.val().trim();
                    const v = data.input.val();
                    // var t = data.input.typedInput('type');
                    // var v = data.input.typedInput('value');
                    if (l.length > 0) {
                      data.l = data.l || {};
                      data.l[currentLocale] = l;
                    }
                    data.v = v;

                    if (l.length > 0 || v.length > 0) {
                      const val = { l: data.l, v: data.v };
                      // if (t !== 'str') {
                      //     val.t = t;
                      // }
                      vals.push(val);
                    }
                  });
                  ui.opts.opts = vals;
                  inputCellInput.typedInput("value", Date.now());
                }
              };
            }
          }
        },
        {
          value: "checkbox",
          label: RED._("editor.inputs.checkbox"),
          icon: "fa fa-check-square-o",
          showLabel: false,
          valueLabel(container, value) {
            container.css("padding", 0);
            checkbox = $("<input type=\"checkbox\">").appendTo(container);
            checkbox.on("change", function (evt) {
              valueField.typedInput("value", $(this).prop("checked") ? "true" : "false");
            });
            checkbox.prop("checked", valueField.typedInput("value") === "true");
          }
        },
        {
          value: "spinner",
          label: RED._("editor.inputs.spinner"),
          icon: "fa fa-sort-numeric-asc",
          showLabel: false,
          valueLabel(container, value) {
            container.css("padding", 0);
            const innerContainer = $("<div class=\"red-ui-editor-subflow-env-input-type\"></div>").appendTo(container);

            const input = $("<div class=\"placeholder-input\">").appendTo(innerContainer);
            $("<span><i class=\"fa fa-sort-numeric-asc\"></i></span>").appendTo(input);

            const min = ui.opts && ui.opts.min;
            const max = ui.opts && ui.opts.max;
            let label = "";
            if (min !== undefined && max !== undefined) {
              label = `${Math.min(min, max)} - ${Math.max(min, max)}`;
            } else if (min !== undefined) {
              label = `> ${min}`;
            } else if (max !== undefined) {
              label = `< ${max}`;
            }
            $("<span>").css("margin-left", "15px").text(label).appendTo(input);
          },
          expand: {
            icon: "fa-caret-down",
            content(container) {
              const content = $("<div class=\"red-ui-editor-subflow-ui-edit-panel\">").appendTo(container);
              content.css("padding", "8px 5px");
              const { min } = ui.opts;
              const { max } = ui.opts;
              const minInput = $("<input type=\"number\" style=\"margin-bottom:0; width:60px\">");
              minInput.val(min);
              const maxInput = $("<input type=\"number\" style=\"margin-bottom:0; width:60px\">");
              maxInput.val(max);
              $(`<div class="form-row" style="margin-bottom:3px"><label>${RED._("editor.spinner.min")}</label></div>`).append(minInput).appendTo(content);
              $(`<div class="form-row" style="margin-bottom:0"><label>${RED._("editor.spinner.max")}</label></div>`).append(maxInput).appendTo(content);
              return {
                onclose() {
                  const min = minInput.val().trim();
                  const max = maxInput.val().trim();
                  if (min !== "") {
                    ui.opts.min = parseInt(min);
                  } else {
                    delete ui.opts.min;
                  }
                  if (max !== "") {
                    ui.opts.max = parseInt(max);
                  } else {
                    delete ui.opts.max;
                  }
                  inputCellInput.typedInput("value", Date.now());
                }
              };
            }
          }
        },
        {
          value: "none",
          label: RED._("editor.inputs.none"),
          icon: "fa fa-times",
          hasValue: false
        },
        {
          value: "hide",
          label: RED._("editor.inputs.hidden"),
          icon: "fa fa-ban",
          hasValue: false
        }
      ],
      default: "none"
    }).on("typedinputtypechange", function (evt, type) {
      ui.type = $(this).typedInput("type");
      ui.opts = typeOptions[ui.type];
      if (ui.type === "input") {
        // In the case of 'input' type, the typedInput uses the multiple-option
        // mode. Its value needs to be set to a comma-separately list of the
        // selected options.
        inputCellInput.typedInput("value", ui.opts.types.join(","));
      } else {
        // No other type cares about `value`, but doing this will
        // force a refresh of the label now that `ui.opts` has
        // been updated.
        inputCellInput.typedInput("value", Date.now());
      }

      switch (ui.type) {
        case "input":
          valueField.typedInput("types", ui.opts.types);
          break;
        case "select":
          valueField.typedInput("types", ["str"]);
          break;
        case "checkbox":
          valueField.typedInput("types", ["bool"]);
          break;
        case "spinner":
          valueField.typedInput("types", ["num"]);
          break;
        case "cred":
          valueField.typedInput("types", ["cred"]);
          break;
        default:
          valueField.typedInput("types", DEFAULT_ENV_TYPE_LIST);
      }
      if (ui.type === "checkbox") {
        valueField.typedInput("type", "bool");
      } else if (ui.type === "spinner") {
        valueField.typedInput("type", "num");
      }
      if (ui.type !== "checkbox") {
        checkbox = null;
      }
    }).on("change", (evt, type) => {
      if (ui.type === "input") {
        const types = inputCellInput.typedInput("value");
        ui.opts.types = (types === "") ? ["str"] : types.split(",");
        valueField.typedInput("types", ui.opts.types);
      }
    });
    valueField.on("change", function (evt) {
      if (checkbox) {
        checkbox.prop("checked", $(this).typedInput("value") === "true");
      }
    });
    // Set the input to the right type. This will trigger the 'typedinputtypechange'
    // event handler (just above ^^) to update the value if needed
    inputCellInput.typedInput("type", ui.type);
  }

  function buildEnvUIRow(row, tenv, ui, node) {
    ui.label = ui.label || {};
    if ((tenv.type === "cred" || (tenv.parent && tenv.parent.type === "cred")) && !ui.type) {
      ui.type = "cred";
      ui.opts = {};
    } else if (!ui.type) {
      ui.type = "input";
      ui.opts = { types: DEFAULT_ENV_TYPE_LIST };
    } else if (!ui.opts) {
      ui.opts = (ui.type === "select") ? { opts: [] } : {};
    }

    const labels = ui.label || {};
    const locale = RED.i18n.lang();
    const labelText = lookupLabel(labels, labels["en-US"] || tenv.name, locale);
    const label = $("<label>").appendTo(row);
    $("<span>&nbsp;</span>").appendTo(row);
    const labelContainer = $("<span></span>").appendTo(label);
    if (ui.icon) {
      const newPath = RED.utils.separateIconPath(ui.icon);
      if (newPath) {
        $(`<i class='fa ${newPath.file}'/>`).appendTo(labelContainer);
      }
    }
    if (ui.type !== "checkbox") {
      const css = ui.icon ? { "padding-left": "5px" } : {};
      $("<span>").css(css).text(labelText).appendTo(label);
      if (ui.type === "none") {
        label.width("100%");
      }
    }
    let input;
    const val = {
      value: "",
      type: "str"
    };
    if (tenv.parent) {
      val.value = tenv.parent.value;
      val.type = tenv.parent.type;
    }
    if (tenv.hasOwnProperty("value")) {
      val.value = tenv.value;
    }
    if (tenv.hasOwnProperty("type")) {
      val.type = tenv.type;
    }
    switch (ui.type) {
      case "input":
        input = $("<input type=\"text\">").css("width", "70%").appendTo(row);
        if (ui.opts.types && ui.opts.types.length > 0) {
          let inputType = val.type;
          if (ui.opts.types.indexOf(inputType) === -1) {
            inputType = ui.opts.types[0];
          }
          input.typedInput({
            types: ui.opts.types,
            default: inputType
          });
          input.typedInput("value", val.value);
        } else {
          input.val(val.value);
        }
        break;
      case "select":
        input = $("<select>").css("width", "70%").appendTo(row);
        if (ui.opts.opts) {
          ui.opts.opts.forEach((o) => {
            $("<option>").val(o.v).text(lookupLabel(o.l, o.l["en-US"] || o.v, locale)).appendTo(input);
          });
        }
        input.val(val.value);
        break;
      case "checkbox":
        label.css("cursor", "default");
        var cblabel = $("<label>").css("width", "70%").appendTo(row);
        input = $("<input type=\"checkbox\">").css({
          marginTop: 0,
          width: "auto",
          height: "34px"
        }).appendTo(cblabel);
        labelContainer.css({ "padding-left": "5px" }).appendTo(cblabel);
        $("<span>").css({ "padding-left": "5px" }).text(labelText).appendTo(cblabel);
        var boolVal = false;
        if (val.type === "bool") {
          boolVal = val.value === "true";
        } else if (val.type === "num") {
          boolVal = val.value !== "0";
        } else {
          boolVal = val.value !== "";
        }
        input.prop("checked", boolVal);
        break;
      case "spinner":
        input = $("<input>").css("width", "70%").appendTo(row);
        var spinnerOpts = {};
        if (ui.opts.hasOwnProperty("min")) {
          spinnerOpts.min = ui.opts.min;
        }
        if (ui.opts.hasOwnProperty("max")) {
          spinnerOpts.max = ui.opts.max;
        }
        input.spinner(spinnerOpts).parent().width("70%");
        input.val(val.value);
        break;
      case "cred":
        input = $("<input type=\"password\">").css("width", "70%").appendTo(row);
        if (node.credentials) {
          if (node.credentials[tenv.name]) {
            input.val(node.credentials[tenv.name]);
          } else if (node.credentials[`has_${tenv.name}`]) {
            input.val("__PWRD__");
          } else {
            input.val("");
          }
        } else {
          input.val("");
        }
        input.typedInput({
          types: ["cred"],
          default: "cred"
        });
        break;
    }
    if (input) {
      input.attr("id", getSubflowEnvPropertyName(tenv.name));
    }
  }

  /**
     * Create environment variable input UI
     * @param uiContainer - container for UI
     * @param envList - env var definitions of template
     */
  function buildEnvUI(uiContainer, envList, node) {
    uiContainer.empty();
    // const elementID = 0;
    for (let i = 0; i < envList.length; i++) {
      const tenv = envList[i];
      if (tenv.ui && tenv.ui.type === "hide") {
        continue;
      }
      const row = $("<div/>", { class: "form-row" }).appendTo(uiContainer);
      buildEnvUIRow(row, tenv, tenv.ui || {}, node);

      // console.log(ui);
    }
  }
  // buildEnvUI

  function exportEnvList(list, all) {
    if (list) {
      const env = [];
      list.each(function (i) {
        const entry = $(this);
        const item = entry.data("data");
        const name = (item.parent ? item.name : item.nameField.val()).trim();
        if ((name !== "")
                    || (item.ui && (item.ui.type === "none"))) {
          const valueInput = item.valueField;
          const value = valueInput.typedInput("value");
          const type = valueInput.typedInput("type");
          if (all || !item.parent || (item.parent.value !== value || item.parent.type !== type)) {
            const envItem = {
              name,
              type,
              value,
            };
            if (item.ui) {
              const ui = {
                icon: item.ui.icon,
                label: $.extend(true, {}, item.ui.label),
                type: item.ui.type,
                opts: $.extend(true, {}, item.ui.opts)
              };
              // Check to see if this is the default ui definition.
              // Delete any defaults to keep it compact
              // {
              //     icon: "",
              //     label: {},
              //     type: "input",
              //     opts: {types:DEFAULT_ENV_TYPE_LIST}
              // }
              if (!ui.icon) {
                delete ui.icon;
              }
              if ($.isEmptyObject(ui.label)) {
                delete ui.label;
              }
              switch (ui.type) {
                case "input":
                  if (JSON.stringify(ui.opts) === JSON.stringify({ types: DEFAULT_ENV_TYPE_LIST })) {
                    // This is the default input config. Delete it as it will
                    // be applied automatically
                    delete ui.type;
                    delete ui.opts;
                  }
                  break;
                case "cred":
                  if (envItem.type === "cred") {
                    delete ui.type;
                  }
                  delete ui.opts;
                  break;
                case "select":
                  if (ui.opts && $.isEmptyObject(ui.opts.opts)) {
                    // This is the default select config.
                    // Delete it as it will be applied automatically
                    delete ui.opts;
                  }
                  break;
                case "spinner":
                  if ($.isEmptyObject(ui.opts)) {
                    // This is the default spinner config.
                    // Delete as it will be applied automatically
                    delete ui.opts;
                  }
                  break;
                default:
                  delete ui.opts;
              }
              if (!$.isEmptyObject(ui)) {
                envItem.ui = ui;
              }
            }
            env.push(envItem);
          }
        }
      });
      return env;
    }
    return null;
  }

  function getSubflowInstanceParentEnv(node) {
    const parentEnv = {};
    const envList = [];
    if (/^subflow:/.test(node.type)) {
      const subflowDef = RED.nodes.subflow(node.type.substring(8));
      if (subflowDef.env) {
        subflowDef.env.forEach((env) => {
          const item = {
            name: env.name,
            parent: {
              type: env.type,
              value: env.value
            },
            ui: $.extend(true, {}, env.ui)
          };
          envList.push(item);
          parentEnv[env.name] = item;
        });
      }
      if (node.env) {
        for (let i = 0; i < node.env.length; i++) {
          const env = node.env[i];
          if (parentEnv.hasOwnProperty(env.name)) {
            parentEnv[env.name].type = env.type;
            parentEnv[env.name].value = env.value;
          } else {
            // envList.push({
            //     name: env.name,
            //     type: env.type,
            //     value: env.value,
            // });
          }
        }
      }
    } else if (node._def.subflowModule) {
      const keys = Object.keys(node._def.defaults);
      keys.forEach((name) => {
        if (name !== "name") {
          const prop = node._def.defaults[name];
          const nodeProp = node[name];
          let nodePropType;
          let nodePropValue = nodeProp;
          if (prop.ui && prop.ui.type === "cred") {
            nodePropType = "cred";
          } else {
            switch (typeof nodeProp) {
              case "string": nodePropType = "str"; break;
              case "number": nodePropType = "num"; break;
              case "boolean": nodePropType = "bool"; nodePropValue = nodeProp ? "true" : "false"; break;
              default:
                nodePropType = nodeProp.type;
                nodePropValue = nodeProp.value;
            }
          }
          const item = {
            name,
            type: nodePropType,
            value: nodePropValue,
            parent: {
              type: prop.type,
              value: prop.value
            },
            ui: $.extend(true, {}, prop.ui)
          };
          envList.push(item);
        }
      });
    }
    return envList;
  }

  function exportSubflowInstanceEnv(node) {
    const env = [];

    // First, get the values for the SubflowTemplate defined properties
    //  - these are the ones with custom UI elements
    const parentEnv = getSubflowInstanceParentEnv(node);
    parentEnv.forEach((data) => {
      let item;
      const ui = data.ui || {};
      if (!ui.type) {
        if (data.parent && data.parent.type === "cred") {
          ui.type = "cred";
        } else {
          ui.type = "input";
          ui.opts = { types: DEFAULT_ENV_TYPE_LIST };
        }
      } else {
        ui.opts = ui.opts || {};
      }
      const input = $(`#${getSubflowEnvPropertyName(data.name)}`);
      if (input.length || ui.type === "cred") {
        item = { name: data.name };
        switch (ui.type) {
          case "input":
            if (ui.opts.types && ui.opts.types.length > 0) {
              item.value = input.typedInput("value");
              item.type = input.typedInput("type");
            } else {
              item.value = input.val();
              item.type = "str";
            }
            break;
          case "cred":
            item.value = input.val();
            item.type = "cred";
            break;
          case "spinner":
            item.value = input.val();
            item.type = "num";
            break;
          case "select":
            item.value = input.val();
            item.type = "str";
            break;
          case "checkbox":
            item.type = "bool";
            item.value = `${input.prop("checked")}`;
            break;
        }
        if (ui.type === "cred" || item.type !== data.parent.type || item.value !== data.parent.value) {
          env.push(item);
        }
      }
    });
    // Second, get the values from the Properties table tab
    const items = $("#red-ui-editor-subflow-env-list").editableList("items");
    items.each((i, el) => {
      const data = el.data("data");
      let item;
      if (data.nameField && data.valueField) {
        item = {
          name: data.nameField.val(),
          value: data.valueField.typedInput("value"),
          type: data.valueField.typedInput("type")
        };
        if (item.name.trim() !== "") {
          env.push(item);
        }
      }
    });
    return env;
  }

  function getSubflowEnvPropertyName(name) {
    return `node-input-subflow-env-${name.replace(/[^a-z0-9-_]/ig, "_")}`;
  }

  /**
     * Lookup text for specific locale
     * @param labels - dict of labels
     * @param defaultLabel - fallback label if not found
     * @param locale - target locale
     * @returns {string} text for specified locale
     */
  function lookupLabel(labels, defaultLabel, locale) {
    if (labels) {
      if (labels[locale]) {
        return labels[locale];
      }
      if (locale) {
        const lang = locale.substring(0, 2);
        if (labels[lang]) {
          return labels[lang];
        }
      }
    }
    return defaultLabel;
  }

  function buildEditForm(type, node) {
    if (type === "subflow-template") {
      buildPropertiesList($("#node-input-env-container"), node);
    } else if (type === "subflow") {
      // This gets called by the subflow type `oneditprepare` function
      // registered in nodes.js#addSubflow()
      buildEnvUI($("#subflow-input-ui"), getSubflowInstanceParentEnv(node), node);
    }
  }
  function buildPropertiesForm(node) {
    const container = $("#editor-subflow-envProperties-content");
    const form = $("<form class=\"dialog-form form-horizontal\"></form>").appendTo(container);
    const listContainer = $("<div class=\"form-row node-input-env-container-row\"></div>").appendTo(form);
    const list = $("<ol id=\"red-ui-editor-subflow-env-list\" class=\"red-ui-editor-subflow-env-list\"></ol>").appendTo(listContainer);
    buildPropertiesList(list, node);
  }

  function setupInputValidation(input, validator) {
    // let errorTip;
    let validateTimeout;

    const validateFunction = function () {
      if (validateTimeout) {
        return;
      }
      validateTimeout = setTimeout(() => {
        const error = validator(input.val());
        // if (!error && errorTip) {
        //     errorTip.close();
        //     errorTip = null;
        // } else if (error && !errorTip) {
        //     errorTip = RED.popover.create({
        //         tooltip: true,
        //         target:input,
        //         size: "small",
        //         direction: "bottom",
        //         content: error,
        //     }).open();
        // }
        input.toggleClass("input-error", !!error);
        validateTimeout = null;
      });
    };
    input.on("change keyup paste", validateFunction);
  }

  function buildModuleForm(container, node) {
    $(_subflowModulePaneTemplate).appendTo(container);
    const moduleProps = node.meta || {};
    [
      "module",
      "type",
      "version",
      "author",
      "desc",
      "keywords",
      "license"
    ].forEach((property) => {
      $(`#subflow-input-module-${property}`).val(moduleProps[property] || "");
    });
    $("#subflow-input-module-type").attr("placeholder", node.id);

    setupInputValidation($("#subflow-input-module-module"), (newValue) => {
      newValue = newValue.trim();
      let isValid = newValue.length < 215;
      isValid = isValid && !/^[._]/.test(newValue);
      isValid = isValid && !/[A-Z]/.test(newValue);
      if (newValue !== encodeURIComponent(newValue)) {
        const m = /^@([^\/]+)\/([^\/]+)$/.exec(newValue);
        if (m) {
          isValid = isValid && (m[1] === encodeURIComponent(m[1]) && m[2] === encodeURIComponent(m[2]));
        } else {
          isValid = false;
        }
      }
      return isValid ? "" : "Invalid module name";
    });
    setupInputValidation($("#subflow-input-module-version"), (newValue) => {
      newValue = newValue.trim();
      const isValid = newValue === ""
                          || /^(\d|[1-9]\d*)\.(\d|[1-9]\d*)\.(\d|[1-9]\d*)(-(0|[1-9A-Za-z-][0-9A-Za-z-]*|[0-9]*[A-Za-z-][0-9A-Za-z-]*)(\.(0|[1-9A-Za-z-][0-9A-Za-z-]*|[0-9]*[A-Za-z-][0-9A-Za-z-]*))*)?(\+[0-9A-Za-z-]+(\.[0-9A-Za-z-]+)*)?$/.test(newValue);
      return isValid ? "" : "Invalid version number";
    });

    const licenses = ["none", "Apache-2.0", "BSD-3-Clause", "BSD-2-Clause", "GPL-2.0", "GPL-3.0", "MIT", "MPL-2.0", "CDDL-1.0", "EPL-2.0"];
    const typedLicenses = {
      types: licenses.map((l) => ({
        value: l,
        label: l === "none" ? RED._("editor:subflow.licenseNone") : l,
        hasValue: false
      }))
    };
    typedLicenses.types.push({
      value: "_custom_", label: RED._("editor:subflow.licenseOther"), icon: "red/images/typedInput/az.svg"
    });
    if (!moduleProps.license) {
      typedLicenses.default = "none";
    } else if (licenses.indexOf(moduleProps.license) > -1) {
      typedLicenses.default = moduleProps.license;
    } else {
      typedLicenses.default = "_custom_";
    }
    $("#subflow-input-module-license").typedInput(typedLicenses);
  }

  function exportSubflowModuleProperties(node) {
    let value;
    const moduleProps = {};
    [
      "module",
      "type",
      "version",
      "author",
      "desc",
      "keywords"
    ].forEach((property) => {
      value = $(`#subflow-input-module-${property}`).val().trim();
      if (value) {
        moduleProps[property] = value;
      }
    });
    const selectedLicenseType = $("#subflow-input-module-license").typedInput("type");

    if (selectedLicenseType === "_custom_") {
      value = $("#subflow-input-module-license").val();
      if (value) {
        moduleProps.license = value;
      }
    } else if (selectedLicenseType !== "none") {
      moduleProps.license = selectedLicenseType;
    }
    return moduleProps;
  }


  return {
    init,
    createSubflow,
    convertToSubflow,
    removeSubflow,
    refresh,
    removeInput: removeSubflowInput,
    removeOutput: removeSubflowOutput,
    removeStatus: removeSubflowStatus,


    buildEditForm,
    buildPropertiesForm,
    buildModuleForm,

    exportSubflowTemplateEnv: exportEnvList,
    exportSubflowInstanceEnv,
    exportSubflowModuleProperties

  };
}());
