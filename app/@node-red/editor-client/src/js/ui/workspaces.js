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
 **/


RED.workspaces = (function() {

    var activeWorkspace = 0;
    var workspaceIndex = 0;

    var viewStack = [];
    var viewStackPos = 0;


    function addToViewStack(id) {
        if (viewStackPos !== viewStack.length) {
            viewStack.splice(viewStackPos);
        }
        viewStack.push(id);
        viewStackPos = viewStack.length;
        // console.warn("addToViewStack",id,viewStack);
    }

    function addWorkspace(ws,skipHistoryEntry,targetIndex) {
        if (ws) {
            workspace_tabs.addTab(ws,targetIndex);
            workspace_tabs.resize();
        } else {
            var tabId = RED.nodes.id();
            do {
                workspaceIndex += 1;
            } while ($("#red-ui-workspace-tabs a[title='"+RED._('workspace.defaultName',{number:workspaceIndex})+"']").size() !== 0);

            ws = {type:"tab",id:tabId,disabled: false,info:"",label:RED._('workspace.defaultName',{number:workspaceIndex})};
            RED.nodes.addWorkspace(ws,targetIndex);
            workspace_tabs.addTab(ws,targetIndex);
            workspace_tabs.activateTab(tabId);
            if (!skipHistoryEntry) {
                RED.history.push({t:'add',workspaces:[ws],dirty:RED.nodes.dirty()});
                RED.nodes.dirty(true);
            }
        }
        RED.view.focus();
        return ws;
    }
    function deleteWorkspace(ws) {
        if (workspaceTabCount === 1) {
            return;
        }
        var workspaceOrder = RED.nodes.getWorkspaceOrder();
        ws._index = workspaceOrder.indexOf(ws.id);
        removeWorkspace(ws);
        var historyEvent = RED.nodes.removeWorkspace(ws.id);
        historyEvent.t = 'delete';
        historyEvent.dirty = RED.nodes.dirty();
        historyEvent.workspaces = [ws];
        RED.history.push(historyEvent);
        RED.nodes.dirty(true);
        RED.sidebar.config.refresh();
    }

    function showEditWorkspaceDialog(id) {
        var workspace = RED.nodes.workspace(id);
        if (!workspace) {
            var subflow = RED.nodes.subflow(id);
            if (subflow) {
                RED.editor.editSubflow(subflow);
            }
            return;
        }
        RED.view.state(RED.state.EDITING);
        var tabflowEditor;
        var trayOptions = {
            title: RED._("workspace.editFlow",{name:RED.utils.sanitize(workspace.label)}),
            buttons: [
                {
                    id: "node-dialog-delete",
                    class: 'leftButton'+((workspaceTabCount === 1)?" disabled":""),
                    text: RED._("common.label.delete"), //'<i class="fa fa-trash"></i>',
                    click: function() {
                        deleteWorkspace(workspace);
                        RED.tray.close();
                    }
                },
                {
                    id: "node-dialog-cancel",
                    text: RED._("common.label.cancel"),
                    click: function() {
                        RED.tray.close();
                    }
                },
                {
                    id: "node-dialog-ok",
                    class: "primary",
                    text: RED._("common.label.done"),
                    click: function() {
                        var label = $( "#node-input-name" ).val();
                        var changed = false;
                        var changes = {};
                        if (workspace.label != label) {
                            changes.label = workspace.label;
                            changed = true;
                            workspace.label = label;
                            workspace_tabs.renameTab(workspace.id,label);
                        }
                        var disabled = $("#node-input-disabled").prop("checked");
                        if (workspace.disabled !== disabled) {
                            changes.disabled = workspace.disabled;
                            changed = true;
                            workspace.disabled = disabled;
                        }
                        var info = tabflowEditor.getValue();
                        if (workspace.info !== info) {
                            changes.info = workspace.info;
                            changed = true;
                            workspace.info = info;
                        }
                        $("#red-ui-tab-"+(workspace.id.replace(".","-"))).toggleClass('red-ui-workspace-disabled',!!workspace.disabled);
                        $("#red-ui-workspace").toggleClass("red-ui-workspace-disabled",!!workspace.disabled);

                        if (changed) {
                            var historyEvent = {
                                t: "edit",
                                changes:changes,
                                node: workspace,
                                dirty: RED.nodes.dirty()
                            }
                            workspace.changed = true;
                            RED.history.push(historyEvent);
                            RED.nodes.dirty(true);
                            RED.sidebar.config.refresh();
                            if (changes.hasOwnProperty('disabled')) {
                                RED.nodes.eachNode(function(n) {
                                    if (n.z === workspace.id) {
                                        n.dirty = true;
                                    }
                                });
                                RED.view.redraw();
                            }
                            RED.events.emit("flows:change",workspace);
                        }
                        RED.tray.close();
                    }
                }
            ],
            resize: function(dimensions) {
                var rows = $("#dialog-form>div:not(.node-text-editor-row)");
                var editorRow = $("#dialog-form>div.node-text-editor-row");
                var height = $("#dialog-form").height();
                for (var i=0; i<rows.size(); i++) {
                    height -= $(rows[i]).outerHeight(true);
                }
                height -= (parseInt($("#dialog-form").css("marginTop"))+parseInt($("#dialog-form").css("marginBottom")));
                $(".node-text-editor").css("height",height+"px");
                tabflowEditor.resize();
            },
            open: function(tray) {
                var trayFooter = tray.find(".red-ui-tray-footer");
                var trayBody = tray.find('.red-ui-tray-body');
                var trayFooterLeft = $('<div class="red-ui-tray-footer-left"></div>').appendTo(trayFooter)

                var dialogForm = $('<form id="dialog-form" class="form-horizontal"></form>').appendTo(trayBody);
                $('<div class="form-row">'+
                    '<label for="node-input-name" data-i18n="[append]editor:common.label.name"><i class="fa fa-tag"></i> </label>'+
                    '<input type="text" id="node-input-name" data-i18n="[placeholder]common.label.name">'+
                '</div>').appendTo(dialogForm);


                if (!workspace.hasOwnProperty("disabled")) {
                    workspace.disabled = false;
                }

                $('<input id="node-input-disabled" type="checkbox">').prop("checked",workspace.disabled).appendTo(trayFooterLeft).toggleButton({
                    enabledIcon: "fa-circle-thin",
                    disabledIcon: "fa-ban",
                    invertState: true
                })


                var row = $('<div class="form-row node-text-editor-row">'+
                    '<label for="node-input-info" data-i18n="editor:workspace.info" style="width:300px;"></label>'+
                    '<div style="min-height:250px;" class="node-text-editor" id="node-input-info"></div>'+
                '</div>').appendTo(dialogForm);
                tabflowEditor = RED.editor.createEditor({
                    id: 'node-input-info',
                    mode: 'ace/mode/markdown',
                    value: ""
                });

                $('#node-info-input-info-expand').on("click", function(e) {
                    e.preventDefault();
                    var value = tabflowEditor.getValue();
                    RED.editor.editMarkdown({
                        value: value,
                        width: "Infinity",
                        cursor: tabflowEditor.getCursorPosition(),
                        complete: function(v,cursor) {
                            tabflowEditor.setValue(v, -1);
                            tabflowEditor.gotoLine(cursor.row+1,cursor.column,false);
                            setTimeout(function() {
                                tabflowEditor.focus();
                            },300);
                        }
                    })
                });



                $('<input type="text" style="display: none;" />').prependTo(dialogForm);
                dialogForm.on("submit", function(e) { e.preventDefault();});
                $("#node-input-name").val(workspace.label);
                RED.text.bidi.prepareInput($("#node-input-name"));
                tabflowEditor.getSession().setValue(workspace.info || "", -1);
                dialogForm.i18n();
            },
            close: function() {
                if (RED.view.state() != RED.state.IMPORT_DRAGGING) {
                    RED.view.state(RED.state.DEFAULT);
                }
                var selection = RED.view.selection();
                if (!selection.nodes && !selection.links && workspace.id === activeWorkspace) {
                    RED.sidebar.info.refresh(workspace);
                }
                tabflowEditor.destroy();
            }
        }
        RED.tray.show(trayOptions);
    }


    var workspace_tabs;
    var workspaceTabCount = 0;
    function createWorkspaceTabs() {
        workspace_tabs = RED.tabs.create({
            id: "red-ui-workspace-tabs",
            onchange: function(tab) {
                var event = {
                    old: activeWorkspace
                }
                activeWorkspace = tab.id;
                event.workspace = activeWorkspace;
                RED.events.emit("workspace:change",event);
                window.location.hash = 'flow/'+tab.id;
                $("#red-ui-workspace").toggleClass("red-ui-workspace-disabled",!!tab.disabled);
                RED.sidebar.config.refresh();
                RED.view.focus();
            },
            onclick: function(tab) {
                if (tab.id !== activeWorkspace) {
                    addToViewStack(activeWorkspace);
                }
                RED.view.focus();
            },
            ondblclick: function(tab) {
                if (tab.type != "subflow") {
                    showEditWorkspaceDialog(tab.id);
                } else {
                    RED.editor.editSubflow(RED.nodes.subflow(tab.id));
                }
            },
            onadd: function(tab) {
                if (tab.type === "tab") {
                    workspaceTabCount++;
                }
                $('<span class="red-ui-workspace-disabled-icon"><i class="fa fa-ban"></i> </span>').prependTo("#red-ui-tab-"+(tab.id.replace(".","-"))+" .red-ui-tab-label");
                if (tab.disabled) {
                    $("#red-ui-tab-"+(tab.id.replace(".","-"))).addClass('red-ui-workspace-disabled');
                }
                RED.menu.setDisabled("menu-item-workspace-delete",workspaceTabCount <= 1);
                if (workspaceTabCount === 1) {
                    showWorkspace();
                }
            },
            onremove: function(tab) {
                if (tab.type === "tab") {
                    workspaceTabCount--;
                }
                RED.menu.setDisabled("menu-item-workspace-delete",workspaceTabCount <= 1);
                if (workspaceTabCount === 0) {
                    hideWorkspace();
                }
            },
            onreorder: function(oldOrder, newOrder) {
                RED.history.push({t:'reorder',order:oldOrder,dirty:RED.nodes.dirty()});
                RED.nodes.dirty(true);
                setWorkspaceOrder(newOrder);
            },
            onselect: function(selectedTabs) {
                RED.view.select(false)
                if (selectedTabs.length === 0) {
                    $("#red-ui-workspace-chart svg").css({"pointer-events":"auto",filter:"none"})
                    $("#red-ui-workspace-toolbar").css({"pointer-events":"auto",filter:"none"})
                    $("#red-ui-palette-container").css({"pointer-events":"auto",filter:"none"})
                    $(".red-ui-sidebar-shade").hide();
                } else {
                    RED.view.select(false)
                    $("#red-ui-workspace-chart svg").css({"pointer-events":"none",filter:"opacity(60%)"})
                    $("#red-ui-workspace-toolbar").css({"pointer-events":"none",filter:"opacity(60%)"})
                    $("#red-ui-palette-container").css({"pointer-events":"none",filter:"opacity(60%)"})
                    $(".red-ui-sidebar-shade").show();
                }
            },
            minimumActiveTabWidth: 150,
            scrollable: true,
            addButton: "core:add-flow",
            addButtonCaption: RED._("workspace.addFlow"),
            searchButton: "core:list-flows",
            searchButtonCaption: RED._("workspace.listFlows")
        });
        workspaceTabCount = 0;
    }
    function showWorkspace() {
        $("#red-ui-workspace .red-ui-tabs").show()
        $("#red-ui-workspace-chart").show()
        $("#red-ui-workspace-footer").children().show()
    }
    function hideWorkspace() {
        $("#red-ui-workspace .red-ui-tabs").hide()
        $("#red-ui-workspace-chart").hide()
        $("#red-ui-workspace-footer").children().hide()
    }

    function init() {
        $('<ul id="red-ui-workspace-tabs"></ul>').appendTo("#red-ui-workspace");
        $('<div id="red-ui-workspace-tabs-shade" class="hide"></div>').appendTo("#red-ui-workspace");
        $('<div id="red-ui-workspace-chart" tabindex="1"></div>').appendTo("#red-ui-workspace");
        $('<div id="red-ui-workspace-toolbar"></div>').appendTo("#red-ui-workspace");
        $('<div id="red-ui-workspace-footer" class="red-ui-component-footer"></div>').appendTo("#red-ui-workspace");
        $('<div id="red-ui-editor-shade" class="hide"></div>').appendTo("#red-ui-workspace");


        createWorkspaceTabs();
        RED.events.on("sidebar:resize",workspace_tabs.resize);

        RED.actions.add("core:show-next-tab",function() {
            var oldActive = activeWorkspace;
            workspace_tabs.nextTab();
            if (oldActive !== activeWorkspace) {
                addToViewStack(oldActive)
            }
        });
        RED.actions.add("core:show-previous-tab",function() {
            var oldActive = activeWorkspace;
            workspace_tabs.previousTab();
            if (oldActive !== activeWorkspace) {
                addToViewStack(oldActive)
            }
        });

        RED.menu.setAction('menu-item-workspace-delete',function() {
            deleteWorkspace(RED.nodes.workspace(activeWorkspace));
        });

        $(window).on("resize", function() {
            workspace_tabs.resize();
        });

        RED.actions.add("core:add-flow",function(opts) { addWorkspace(undefined,undefined,opts?opts.index:undefined)});
        RED.actions.add("core:edit-flow",editWorkspace);
        RED.actions.add("core:remove-flow",removeWorkspace);
        RED.actions.add("core:enable-flow",enableWorkspace);
        RED.actions.add("core:disable-flow",disableWorkspace);

        RED.actions.add("core:list-flows",function() {
            RED.actions.invoke("core:search","type:tab ");
        })

        RED.actions.add("core:go-to-previous-location", function() {
            if (viewStackPos > 0) {
                if (viewStackPos === viewStack.length) {
                    // We're at the end of the stack. Remember the activeWorkspace
                    // so we can come back to it.
                    viewStack.push(activeWorkspace);
                }
                RED.workspaces.show(viewStack[--viewStackPos],true);
            }
        })
        RED.actions.add("core:go-to-next-location", function() {
            if (viewStackPos < viewStack.length - 1) {
                RED.workspaces.show(viewStack[++viewStackPos],true);
            }
        })


        hideWorkspace();
    }

    function editWorkspace(id) {
        showEditWorkspaceDialog(id||activeWorkspace);
    }

    function enableWorkspace(id) {
        setWorkspaceState(id,false);
    }
    function disableWorkspace(id) {
        setWorkspaceState(id,true);
    }
    function setWorkspaceState(id,disabled) {
        var workspace = RED.nodes.workspace(id||activeWorkspace);
        if (!workspace) {
            return;
        }
        if (workspace.disabled !== disabled) {
            var changes = { disabled: workspace.disabled };
            workspace.disabled = disabled;
            $("#red-ui-tab-"+(workspace.id.replace(".","-"))).toggleClass('red-ui-workspace-disabled',!!workspace.disabled);
            if (id === activeWorkspace) {
                $("#red-ui-workspace").toggleClass("red-ui-workspace-disabled",!!workspace.disabled);
            }
            var historyEvent = {
                t: "edit",
                changes:changes,
                node: workspace,
                dirty: RED.nodes.dirty()
            }
            workspace.changed = true;
            RED.history.push(historyEvent);
            RED.events.emit("flows:change",workspace);
            RED.nodes.dirty(true);
            RED.sidebar.config.refresh();
            var selection = RED.view.selection();
            if (!selection.nodes && !selection.links && workspace.id === activeWorkspace) {
                RED.sidebar.info.refresh(workspace);
            }
            if (changes.hasOwnProperty('disabled')) {
                RED.nodes.eachNode(function(n) {
                    if (n.z === workspace.id) {
                        n.dirty = true;
                    }
                });
                RED.view.redraw();
            }
        }
    }


    function removeWorkspace(ws) {
        if (!ws) {
            deleteWorkspace(RED.nodes.workspace(activeWorkspace));
        } else {
            if (workspace_tabs.contains(ws.id)) {
                workspace_tabs.removeTab(ws.id);
            }
            if (ws.id === activeWorkspace) {
                activeWorkspace = 0;
            }
        }
    }

    function setWorkspaceOrder(order) {
        var newOrder = order.filter(function(id) {
            return RED.nodes.workspace(id) !== undefined;
        })
        var currentOrder = RED.nodes.getWorkspaceOrder();
        if (JSON.stringify(newOrder) !== JSON.stringify(currentOrder)) {
            RED.nodes.setWorkspaceOrder(newOrder);
            RED.events.emit("flows:reorder",newOrder);
        }
        workspace_tabs.order(order);
    }

    return {
        init: init,
        add: addWorkspace,
        remove: removeWorkspace,
        order: setWorkspaceOrder,
        edit: editWorkspace,
        contains: function(id) {
            return workspace_tabs.contains(id);
        },
        count: function() {
            return workspaceTabCount;
        },
        active: function() {
            return activeWorkspace
        },
        selection: function() {
            return workspace_tabs.selection();
        },
        show: function(id,skipStack) {
            if (!workspace_tabs.contains(id)) {
                var sf = RED.nodes.subflow(id);
                if (sf) {
                    addWorkspace(
                        {type:"subflow",id:id,icon:"red/images/subflow_tab.svg",label:sf.name, closeable: true},
                        null,
                        workspace_tabs.activeIndex()+1
                    );
                } else {
                    return;
                }
            }
            if (!skipStack && activeWorkspace !== id) {
                addToViewStack(activeWorkspace)
            }
            workspace_tabs.activateTab(id);
        },
        refresh: function() {
            RED.nodes.eachWorkspace(function(ws) {
                workspace_tabs.renameTab(ws.id,ws.label);

            })
            RED.nodes.eachSubflow(function(sf) {
                if (workspace_tabs.contains(sf.id)) {
                    workspace_tabs.renameTab(sf.id,sf.name);
                }
            });
            RED.sidebar.config.refresh();
        },
        resize: function() {
            workspace_tabs.resize();
        },
        enable: enableWorkspace,
        disable: disableWorkspace
    }
})();
