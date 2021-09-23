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
RED.sidebar.config = (function () {
  const content = document.createElement("div");
  content.className = "red-ui-sidebar-node-config";
  content.id = "red-ui-sidebar-node-config";
  content.tabIndex = 0;

  $("<div class=\"red-ui-sidebar-header\"><span class=\"button-group\">"
    + "<a class=\"red-ui-sidebar-header-button-toggle selected\" id=\"red-ui-sidebar-config-filter-all\" href=\"#\"><span data-i18n=\"sidebar.config.filterAll\"></span></a>"
    + "<a class=\"red-ui-sidebar-header-button-toggle\" id=\"red-ui-sidebar-config-filter-unused\" href=\"#\"><span data-i18n=\"sidebar.config.filterUnused\"></span></a> "
    + "</span></div>").appendTo(content);


  const toolbar = $("<div>"
    + "<a class=\"red-ui-footer-button\" id=\"red-ui-sidebar-config-collapse-all\" href=\"#\"><i class=\"fa fa-angle-double-up\"></i></a> "
    + "<a class=\"red-ui-footer-button\" id=\"red-ui-sidebar-config-expand-all\" href=\"#\"><i class=\"fa fa-angle-double-down\"></i></a>"
    + "</div>");

  const globalCategories = $("<div>").appendTo(content);
  const flowCategories = $("<div>").appendTo(content);
  const subflowCategories = $("<div>").appendTo(content);

  let showUnusedOnly = false;

  const categories = {};

  function getOrCreateCategory(name, parent, label) {
    name = name.replace(/\./i, "-");
    if (!categories[name]) {
      const container = $(`<div class="red-ui-palette-category red-ui-sidebar-config-category" id="red-ui-sidebar-config-category-${name}"></div>`).appendTo(parent);
      const header = $("<div class=\"red-ui-sidebar-config-tray-header red-ui-palette-header\"><i class=\"fa fa-angle-down expanded\"></i></div>").appendTo(container);
      if (label) {
        $("<span class=\"red-ui-palette-node-config-label\"/>").text(label).appendTo(header);
      } else {
        $(`<span class="red-ui-palette-node-config-label" data-i18n="sidebar.config.${name}">`).appendTo(header);
      }
      $("<span class=\"red-ui-sidebar-node-config-filter-info\"></span>").appendTo(header);
      category = $("<ul class=\"red-ui-palette-content red-ui-sidebar-node-config-list\"></ul>").appendTo(container);
      category.on("click", (e) => {
        $(content).find(".red-ui-palette-node").removeClass("selected");
      });
      container.i18n();
      const icon = header.find("i");
      var result = {
        label,
        list: category,
        size() {
          return result.list.find("li:not(.red-ui-palette-node-config-none)").length;
        },
        open(snap) {
          if (!icon.hasClass("expanded")) {
            icon.addClass("expanded");
            if (snap) {
              result.list.show();
            } else {
              result.list.slideDown();
            }
          }
        },
        close(snap) {
          if (icon.hasClass("expanded")) {
            icon.removeClass("expanded");
            if (snap) {
              result.list.hide();
            } else {
              result.list.slideUp();
            }
          }
        },
        isOpen() {
          return icon.hasClass("expanded");
        }
      };

      header.on("click", (e) => {
        if (result.isOpen()) {
          result.close();
        } else {
          result.open();
        }
      });
      categories[name] = result;
    } else if (categories[name].label !== label) {
      categories[name].list.parent().find(".red-ui-palette-node-config-label").text(label);
      categories[name].label = label;
    }
    return categories[name];
  }

  function createConfigNodeList(id, nodes) {
    const category = getOrCreateCategory(id.replace(/\./i, "-"));
    const { list } = category;

    nodes.sort((A, B) => {
      if (A.type < B.type) { return -1; }
      if (A.type > B.type) { return 1; }
      return 0;
    });
    if (showUnusedOnly) {
      let hiddenCount = nodes.length;
      nodes = nodes.filter((n) => n._def.hasUsers !== false && n.users.length === 0);
      hiddenCount -= nodes.length;
      if (hiddenCount > 0) {
        list.parent().find(".red-ui-sidebar-node-config-filter-info").text(RED._("sidebar.config.filtered", { count: hiddenCount })).show();
      } else {
        list.parent().find(".red-ui-sidebar-node-config-filter-info").hide();
      }
    } else {
      list.parent().find(".red-ui-sidebar-node-config-filter-info").hide();
    }
    list.empty();
    if (nodes.length === 0) {
      $("<li class=\"red-ui-palette-node-config-none\" data-i18n=\"sidebar.config.none\">NONE</li>").i18n().appendTo(list);
      category.close(true);
    } else {
      let currentType = "";
      nodes.forEach((node) => {
        var label = RED.utils.getNodeLabel(node, node.id);
        if (node.type != currentType) {
          $(`<li class="red-ui-palette-node-config-type">${node.type}</li>`).appendTo(list);
          currentType = node.type;
        }

        const entry = $(`<li class="red-ui-palette-node_id_${node.id.replace(/\./g, "-")}"></li>`).appendTo(list);
        const nodeDiv = $("<div class=\"red-ui-palette-node-config red-ui-palette-node\"></div>").appendTo(entry);
        entry.data("node", node.id);
        var label = $("<div class=\"red-ui-palette-label\"></div>").text(label).appendTo(nodeDiv);
        if (node.d) {
          nodeDiv.addClass("red-ui-palette-node-config-disabled");
          $("<i class=\"fa fa-ban\"></i>").prependTo(label);
        }

        if (node._def.hasUsers !== false) {
          const iconContainer = $("<div/>", { class: "red-ui-palette-icon-container red-ui-palette-icon-container-right" }).appendTo(nodeDiv);
          if (node.users.length === 0) {
            iconContainer.text(0);
          } else {
            $("<a href=\"#\"/>").on("click", (e) => {
              e.stopPropagation();
              e.preventDefault();
              RED.search.show(node.id);
            }).text(node.users.length).appendTo(iconContainer);
          }
          RED.popover.tooltip(iconContainer, RED._("editor.nodesUse", { count: node.users.length }));
          if (node.users.length === 0) {
            nodeDiv.addClass("red-ui-palette-node-config-unused");
          }
        }
        nodeDiv.on("click", function (e) {
          e.stopPropagation();
          RED.view.select(false);
          if (e.metaKey) {
            $(this).toggleClass("selected");
          } else {
            $(content).find(".red-ui-palette-node").removeClass("selected");
            $(this).addClass("selected");
          }
          RED.sidebar.info.refresh(node);
        });
        nodeDiv.on("dblclick", (e) => {
          e.stopPropagation();
          RED.editor.editConfig("", node.type, node.id);
        });
        const userArray = node.users.map((n) => n.id);
        nodeDiv.on("mouseover", (e) => {
          RED.nodes.eachNode((node) => {
            if (userArray.indexOf(node.id) != -1) {
              node.highlighted = true;
              node.dirty = true;
            }
          });
          RED.view.redraw();
        });
        nodeDiv.on("mouseout", (e) => {
          RED.nodes.eachNode((node) => {
            if (node.highlighted) {
              node.highlighted = false;
              node.dirty = true;
            }
          });
          RED.view.redraw();
        });
      });
      category.open(true);
    }
  }

  function refreshConfigNodeList() {
    const validList = { global: true };

    getOrCreateCategory("global", globalCategories);

    RED.nodes.eachWorkspace((ws) => {
      validList[ws.id.replace(/\./g, "-")] = true;
      getOrCreateCategory(ws.id, flowCategories, ws.label);
    });
    RED.nodes.eachSubflow((sf) => {
      validList[sf.id.replace(/\./g, "-")] = true;
      getOrCreateCategory(sf.id, subflowCategories, sf.name);
    });
    $(".red-ui-sidebar-config-category").each(function () {
      const id = $(this).attr("id").substring("red-ui-sidebar-config-category-".length);
      if (!validList[id]) {
        $(this).remove();
        delete categories[id];
      }
    });
    const globalConfigNodes = [];
    const configList = {};
    RED.nodes.eachConfig((cn) => {
      if (cn.z) { // } == RED.workspaces.active()) {
        configList[cn.z.replace(/\./g, "-")] = configList[cn.z.replace(/\./g, "-")] || [];
        configList[cn.z.replace(/\./g, "-")].push(cn);
      } else if (!cn.z) {
        globalConfigNodes.push(cn);
      }
    });
    for (const id in validList) {
      if (validList.hasOwnProperty(id)) {
        createConfigNodeList(id, configList[id] || []);
      }
    }
    createConfigNodeList("global", globalConfigNodes);
  }

  function init() {
    RED.sidebar.addTab({
      id: "config",
      label: RED._("sidebar.config.label"),
      name: RED._("sidebar.config.name"),
      content,
      toolbar,
      iconClass: "fa fa-cog",
      action: "core:show-config-tab",
      onchange() { refreshConfigNodeList(); }
    });
    RED.actions.add("core:show-config-tab", () => { RED.sidebar.show("config"); });
    RED.actions.add("core:select-all-config-nodes", () => {
      $(content).find(".red-ui-palette-node").addClass("selected");
    });
    RED.actions.add("core:delete-config-selection", () => {
      const selectedNodes = [];
      $(content).find(".red-ui-palette-node.selected").each(function () {
        selectedNodes.push($(this).parent().data("node"));
      });
      if (selectedNodes.length > 0) {
        const historyEvent = {
          t: "delete",
          nodes: [],
          changes: {},
          dirty: RED.nodes.dirty()
        };
        selectedNodes.forEach((id) => {
          const node = RED.nodes.node(id);
          try {
            if (node._def.oneditdelete) {
              node._def.oneditdelete.call(node);
            }
          } catch (err) {
            console.log("oneditdelete", node.id, node.type, err.toString());
          }
          historyEvent.nodes.push(node);
          for (let i = 0; i < node.users.length; i++) {
            const user = node.users[i];
            historyEvent.changes[user.id] = {
              changed: user.changed,
              valid: user.valid
            };
            for (const d in user._def.defaults) {
              if (user._def.defaults.hasOwnProperty(d) && user[d] == id) {
                historyEvent.changes[user.id][d] = id;
                user[d] = "";
                user.changed = true;
                user.dirty = true;
              }
            }
            RED.editor.validateNode(user);
          }
          RED.nodes.remove(id);
        });
        RED.nodes.dirty(true);
        RED.view.redraw(true);
        RED.history.push(historyEvent);
      }
    });


    RED.events.on("view:selection-changed", () => {
      $(content).find(".red-ui-palette-node").removeClass("selected");
    });

    $("#red-ui-sidebar-config-collapse-all").on("click", (e) => {
      e.preventDefault();
      for (const cat in categories) {
        if (categories.hasOwnProperty(cat)) {
          categories[cat].close();
        }
      }
    });
    $("#red-ui-sidebar-config-expand-all").on("click", (e) => {
      e.preventDefault();
      for (const cat in categories) {
        if (categories.hasOwnProperty(cat)) {
          if (categories[cat].size() > 0) {
            categories[cat].open();
          }
        }
      }
    });
    $("#red-ui-sidebar-config-filter-all").on("click", function (e) {
      e.preventDefault();
      if (showUnusedOnly) {
        $(this).addClass("selected");
        $("#red-ui-sidebar-config-filter-unused").removeClass("selected");
        showUnusedOnly = !showUnusedOnly;
        refreshConfigNodeList();
      }
    });
    $("#red-ui-sidebar-config-filter-unused").on("click", function (e) {
      e.preventDefault();
      if (!showUnusedOnly) {
        $(this).addClass("selected");
        $("#red-ui-sidebar-config-filter-all").removeClass("selected");
        showUnusedOnly = !showUnusedOnly;
        refreshConfigNodeList();
      }
    });
    RED.popover.tooltip($("#red-ui-sidebar-config-filter-all"), RED._("sidebar.config.showAllUnusedConfigNodes"));
    RED.popover.tooltip($("#red-ui-sidebar-config-filter-unused"), RED._("sidebar.config.showAllUnusedConfigNodes"));
  }
  function show(id) {
    if (typeof id === "boolean") {
      if (id) {
        $("#red-ui-sidebar-config-filter-unused").trigger("click");
      } else {
        $("#red-ui-sidebar-config-filter-all").trigger("click");
      }
    }
    refreshConfigNodeList();
    if (typeof id === "string") {
      $("#red-ui-sidebar-config-filter-all").trigger("click");
      id = id.replace(/\./g, "-");
      setTimeout(() => {
        const node = $(`.red-ui-palette-node_id_${id}`);
        const y = node.position().top;
        const h = node.height();
        const scrollWindow = $(".red-ui-sidebar-node-config");
        const scrollHeight = scrollWindow.height();

        if (y + h > scrollHeight) {
          scrollWindow.animate({ scrollTop: `-=${scrollHeight - (y + h) - 30}` }, 150);
        } else if (y < 0) {
          scrollWindow.animate({ scrollTop: `+=${y - 10}` }, 150);
        }
        let flash = 21;
        var flashFunc = function () {
          if ((flash % 2) === 0) {
            node.removeClass("node_highlighted");
          } else {
            node.addClass("node_highlighted");
          }
          flash--;
          if (flash >= 0) {
            setTimeout(flashFunc, 100);
          }
        };
        flashFunc();
      }, 100);
    }
    RED.sidebar.show("config");
  }
  return {
    init,
    show,
    refresh: refreshConfigNodeList
  };
}());
