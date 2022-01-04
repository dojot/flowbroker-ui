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
(function ($) {
  const contextParse = function (v, defaultStore) {
    const parts = RED.utils.parseContextKey(v, defaultStore && defaultStore.value);
    return {
      option: parts.store,
      value: parts.key
    };
  };
  const contextExport = function (v, opt) {
    if (!opt) {
      return v;
    }
    const store = ((typeof opt === "string") ? opt : opt.value);
    if (store !== RED.settings.context.default) {
      return `#:(${store})::${v}`;
    }
    return v;
  };
  const contextLabel = function (container, value) {
    const that = this;
    container.css("pointer-events", "none");
    container.css("flex-grow", 0);
    container.css("position", "relative");
    container.css("overflow", "visible");
    $("<div></div>").text(value).css({
      position: "absolute",
      bottom: "-2px",
      right: "5px",
      "font-size": "0.7em",
      opacity: 0.3
    }).appendTo(container);
    this.elementDiv.show();
  };
  const mapDeprecatedIcon = function (icon) {
    if (/^red\/images\/typedInput\/.+\.png$/.test(icon)) {
      icon = icon.replace(/.png$/, ".svg");
    }
    return icon;
  };
  const allOptions = {
    msg: { value: "msg", label: "msg.", validate: RED.utils.validatePropertyExpression },
    flow: {
      value: "flow",
      label: "flow.",
      hasValue: true,
      options: [],
      validate: RED.utils.validatePropertyExpression,
      parse: contextParse,
      export: contextExport,
      valueLabel: contextLabel
    },
    global: {
      value: "global",
      label: "global.",
      hasValue: true,
      options: [],
      validate: RED.utils.validatePropertyExpression,
      parse: contextParse,
      export: contextExport,
      valueLabel: contextLabel
    },
    str: { value: "str", label: "string", icon: "red/images/typedinput/az.svg" },
    num: {
      value: "num", label: "number", icon: "red/images/typedinput/09.svg", validate: /^[+-]?[0-9]*\.?[0-9]*([eE][-+]?[0-9]+)?$/
    },
    bool: {
      value: "bool", label: "boolean", icon: "red/images/typedinput/bool.svg", options: ["true", "false"]
    },
    json: {
      value: "json",
      label: "JSON",
      icon: "red/images/typedinput/json.svg",
      validate(v) { try { JSON.parse(v); return true; } catch (e) { return false; } },
      expand() {
        const that = this;
        let value = this.value();
        try {
          value = JSON.stringify(JSON.parse(value), null, 4);
        } catch (err) {
        }
        RED.editor.editJSON({
          value,
          complete(v) {
            let value = v;
            try {
              value = JSON.stringify(JSON.parse(v));
            } catch (err) {
            }
            that.value(value);
          }
        });
      }
    },
    re: { value: "re", label: "regular expression", icon: "red/images/typedinput/re.svg" },
    date: {
      value: "date", label: "timestamp", icon: "fa fa-clock-o", hasValue: false
    },
    jsonata: {
      value: "jsonata",
      label: "expression",
      icon: "red/images/typedinput/expr.svg",
      validate(v) { try { jsonata(v); return true; } catch (e) { return false; } },
      expand() {
        const that = this;
        RED.editor.editExpression({
          value: this.value().replace(/\t/g, "\n"),
          complete(v) {
            that.value(v.replace(/\n/g, "\t"));
          }
        });
      }
    },
    bin: {
      value: "bin",
      label: "buffer",
      icon: "red/images/typedinput/bin.svg",
      expand() {
        const that = this;
        RED.editor.editBuffer({
          value: this.value(),
          complete(v) {
            that.value(v);
          }
        });
      }
    },
    env: {
      value: "env",
      label: "env variable",
      icon: "red/images/typedinput/env.svg"
    },
    node: {
      value: "node",
      label: "node",
      icon: "red/images/typedinput/target.svg",
      valueLabel(container, value) {
        const node = RED.nodes.node(value);
        const nodeDiv = $("<div>", { class: "red-ui-search-result-node" }).css({
          "margin-top": "2px",
          "margin-left": "3px"
        }).appendTo(container);
        const nodeLabel = $("<span>").css({
          "line-height": "32px",
          "margin-left": "6px"
        }).appendTo(container);
        if (node) {
          let colour = RED.utils.getNodeColor(node.type, node._def);
          const icon_url = RED.utils.getNodeIcon(node._def, node);
          if (node.type === "tab") {
            colour = "#C0DEED";
          }
          nodeDiv.css("backgroundColor", colour);
          const iconContainer = $("<div/>", { class: "red-ui-palette-icon-container" }).appendTo(nodeDiv);
          RED.utils.createIconElement(icon_url, iconContainer, true);
          const l = RED.utils.getNodeLabel(node, node.id);
          nodeLabel.text(l);
        } else {
          nodeDiv.css({
            backgroundColor: "#eee",
            "border-style": "dashed"
          });
        }
      },
      expand() {
        const that = this;
        RED.tray.hide();
        RED.view.selectNodes({
          single: true,
          selected: [that.value()],
          onselect(selection) {
            that.value(selection.id);
            RED.tray.show();
          },
          oncancel() {
            RED.tray.show();
          }
        });
      }
    },
    cred: {
      value: "cred",
      label: "credential",
      icon: "fa fa-lock",
      inputType: "password",
      valueLabel(container, value) {
        const that = this;
        container.css("pointer-events", "none");
        container.css("flex-grow", 0);
        this.elementDiv.hide();
        const buttons = $("<div>").css({
          position: "absolute",
          right: "6px",
          top: "6px",
          "pointer-events": "all"
        }).appendTo(container);
        const eyeButton = $("<button type=\"button\" class=\"red-ui-button red-ui-button-small\"></button>").css({
          width: "20px"
        }).appendTo(buttons).on("click", (evt) => {
          evt.preventDefault();
          const cursorPosition = that.input[0].selectionStart;
          const currentType = that.input.attr("type");
          if (currentType === "text") {
            that.input.attr("type", "password");
            eyeCon.removeClass("fa-eye-slash").addClass("fa-eye");
            setTimeout(() => {
              that.input.focus();
              that.input[0].setSelectionRange(cursorPosition, cursorPosition);
            }, 50);
          } else {
            that.input.attr("type", "text");
            eyeCon.removeClass("fa-eye").addClass("fa-eye-slash");
            setTimeout(() => {
              that.input.focus();
              that.input[0].setSelectionRange(cursorPosition, cursorPosition);
            }, 50);
          }
        })
          .hide();
        var eyeCon = $("<i class=\"fa fa-eye\"></i>").css("margin-left", "-2px").appendTo(eyeButton);

        if (value === "__PWRD__") {
          const innerContainer = $("<div><i class=\"fa fa-asterisk\"></i><i class=\"fa fa-asterisk\"></i><i class=\"fa fa-asterisk\"></i><i class=\"fa fa-asterisk\"></i><i class=\"fa fa-asterisk\"></i></div>").css({
            padding: "6px 6px",
            borderRadius: "4px"
          }).addClass("red-ui-typedInput-value-label-inactive").appendTo(container);
          var editButton = $("<button type=\"button\" class=\"red-ui-button red-ui-button-small\"><i class=\"fa fa-pencil\"></i></button>").appendTo(buttons).on("click", (evt) => {
            evt.preventDefault();
            innerContainer.hide();
            container.css("background", "none");
            container.css("pointer-events", "none");
            that.input.val("");
            that.element.val("");
            that.elementDiv.show();
            editButton.hide();
            cancelButton.show();
            eyeButton.show();
            setTimeout(() => {
              that.input.focus();
            }, 50);
          });
          var cancelButton = $("<button type=\"button\" class=\"red-ui-button red-ui-button-small\"><i class=\"fa fa-times\"></i></button>").css("margin-left", "3px").appendTo(buttons).on("click", (evt) => {
            evt.preventDefault();
            innerContainer.show();
            container.css("background", "");
            that.input.val("__PWRD__");
            that.element.val("__PWRD__");
            that.elementDiv.hide();
            editButton.show();
            cancelButton.hide();
            eyeButton.hide();
            that.input.attr("type", "password");
            eyeCon.removeClass("fa-eye-slash").addClass("fa-eye");
          })
            .hide();
        } else {
          container.css("background", "none");
          container.css("pointer-events", "none");
          this.elementDiv.show();
          eyeButton.show();
        }
      }
    }
  };
  let nlsd = false;

  $.widget("nodered.typedInput", {
    _create() {
      try {
        if (!nlsd && RED && RED._) {
          for (const i in allOptions) {
            if (allOptions.hasOwnProperty(i)) {
              allOptions[i].label = RED._(`typedInput.type.${i}`, { defaultValue: allOptions[i].label });
            }
          }
          const contextStores = RED.settings.context.stores;
          const contextOptions = contextStores.map((store) => ({ value: store, label: store, icon: "<i class=\"red-ui-typedInput-icon fa fa-database\"></i>" })).sort((A, B) => {
            if (A.value === RED.settings.context.default) {
              return -1;
            } if (B.value === RED.settings.context.default) {
              return 1;
            }
            return A.value.localeCompare(B.value);
          });
          if (contextOptions.length < 2) {
            allOptions.flow.options = [];
            allOptions.global.options = [];
          } else {
            allOptions.flow.options = contextOptions;
            allOptions.global.options = contextOptions;
          }
        }
        nlsd = true;
        const that = this;

        this.disarmClick = false;
        this.input = $("<input class=\"red-ui-typedInput-input\" type=\"text\"></input>");
        this.input.insertAfter(this.element);
        this.input.val(this.element.val());
        this.element.addClass("red-ui-typedInput");
        this.uiWidth = this.element.outerWidth();
        this.elementDiv = this.input.wrap("<div>").parent().addClass("red-ui-typedInput-input-wrap");
        this.uiSelect = this.elementDiv.wrap("<div>").parent();
        const attrStyle = this.element.attr("style");
        let m;
        if ((m = /width\s*:\s*(calc\s*\(.*\)|\d+(%|px))/i.exec(attrStyle)) !== null) {
          this.input.css("width", "100%");
          this.uiSelect.width(m[1]);
          this.uiWidth = null;
        } else if (this.uiWidth !== 0) {
          this.uiSelect.width(this.uiWidth);
        }
        ["Right", "Left"].forEach((d) => {
          const m = that.element.css(`margin${d}`);
          that.uiSelect.css(`margin${d}`, m);
          that.input.css(`margin${d}`, 0);
        });

        ["type", "placeholder", "autocomplete", "data-i18n"].forEach((d) => {
          const m = that.element.attr(d);
          that.input.attr(d, m);
        });

        this.defaultInputType = this.input.attr("type");

        this.uiSelect.addClass("red-ui-typedInput-container");

        this.element.attr("type", "hidden");

        if (!this.options.types && this.options.type) {
          this.options.types = [this.options.type];
        } else {
          this.options.types = this.options.types || Object.keys(allOptions);
        }

        this.selectTrigger = $("<button class=\"red-ui-typedInput-type-select\" tabindex=\"0\"></button>").prependTo(this.uiSelect);
        $("<i class=\"red-ui-typedInput-icon fa fa-caret-down\"></i>").toggle(this.options.types.length > 1).appendTo(this.selectTrigger);

        this.selectLabel = $("<span class=\"red-ui-typedInput-type-label\"></span>").appendTo(this.selectTrigger);

        this.valueLabelContainer = $("<div class=\"red-ui-typedInput-value-label\">").appendTo(this.uiSelect);

        this.types(this.options.types);

        if (this.options.typeField) {
          this.typeField = $(this.options.typeField).hide();
          const t = this.typeField.val();
          if (t && this.typeMap[t]) {
            this.options.default = t;
          }
        } else {
          this.typeField = $("<input>", { type: "hidden" }).appendTo(this.uiSelect);
        }

        this.input.on("focus", () => {
          that.uiSelect.addClass("red-ui-typedInput-focus");
        });
        this.input.on("blur", () => {
          that.uiSelect.removeClass("red-ui-typedInput-focus");
        });
        this.input.on("change", () => {
          that.validate();
          that.element.val(that.value());
          that.element.trigger("change", [that.propertyType, that.value()]);
        });
        this.input.on("keyup", (evt) => {
          that.validate();
          that.element.val(that.value());
          that.element.trigger("keyup", evt);
        });
        this.input.on("paste", (evt) => {
          that.validate();
          that.element.val(that.value());
          that.element.trigger("paste", evt);
        });
        this.input.on("keydown", (evt) => {
          if (evt.keyCode >= 37 && evt.keyCode <= 40) {
            evt.stopPropagation();
          }
        });
        this.selectTrigger.on("click", (event) => {
          event.preventDefault();
          event.stopPropagation();
          that._showTypeMenu();
        });
        this.selectTrigger.on("keydown", (evt) => {
          if (evt.keyCode === 40) {
            // Down
            that._showTypeMenu();
          }
          evt.stopPropagation();
        }).on("focus", () => {
          that.uiSelect.addClass("red-ui-typedInput-focus");
        }).on("blur", () => {
          const opt = that.typeMap[that.propertyType];
          if (opt.hasValue === false) {
            that.uiSelect.removeClass("red-ui-typedInput-focus");
          }
        });

        // explicitly set optionSelectTrigger display to inline-block otherwise jQ sets it to 'inline'
        this.optionSelectTrigger = $("<button tabindex=\"0\" class=\"red-ui-typedInput-option-trigger\" style=\"display:inline-block\"><span class=\"red-ui-typedInput-option-caret\"><i class=\"red-ui-typedInput-icon fa fa-caret-down\"></i></span></button>").appendTo(this.uiSelect);
        this.optionSelectLabel = $("<span class=\"red-ui-typedInput-option-label\"></span>").prependTo(this.optionSelectTrigger);
        RED.popover.tooltip(this.optionSelectLabel, () => that.optionValue);
        this.optionSelectTrigger.on("click", (event) => {
          event.preventDefault();
          event.stopPropagation();
          that._showOptionSelectMenu();
        }).on("keydown", (evt) => {
          if (evt.keyCode === 40) {
            // Down
            that._showOptionSelectMenu();
          }
          evt.stopPropagation();
        }).on("blur", () => {
          that.uiSelect.removeClass("red-ui-typedInput-focus");
        }).on("focus", () => {
          that.uiSelect.addClass("red-ui-typedInput-focus");
        });

        this.optionExpandButton = $("<button tabindex=\"0\" class=\"red-ui-typedInput-option-expand\" style=\"display:inline-block\"></button>").appendTo(this.uiSelect);
        this.optionExpandButtonIcon = $("<i class=\"red-ui-typedInput-icon fa fa-ellipsis-h\"></i>").appendTo(this.optionExpandButton);
        this.type(this.options.default || this.typeList[0].value);
      } catch (err) {
        console.log(err.stack);
      }
    },
    _showTypeMenu() {
      if (this.typeList.length > 1) {
        this._showMenu(this.menu, this.selectTrigger);
        const selected = this.menu.find(`[value='${this.propertyType}']`);
        setTimeout(() => {
          selected.trigger("focus");
        }, 120);
      } else {
        this.input.trigger("focus");
      }
    },
    _showOptionSelectMenu() {
      if (this.optionMenu) {
        this.optionMenu.css({
          minWidth: this.optionSelectLabel.width()
        });

        this._showMenu(this.optionMenu, this.optionSelectTrigger);
        let targetValue = this.optionValue;
        if (this.optionValue === null || this.optionValue === undefined) {
          targetValue = this.value();
        }
        let selectedOption = this.optionMenu.find(`[value='${targetValue}']`);
        if (selectedOption.length === 0) {
          selectedOption = this.optionMenu.children(":first");
        }
        selectedOption.trigger("focus");
      }
    },
    _hideMenu(menu) {
      $(document).off("mousedown.red-ui-typedInput-close-property-select");
      menu.hide();
      menu.css({
        height: "auto"
      });

      if (menu.opts.multiple) {
        const selected = [];
        menu.find("input[type=\"checkbox\"]").each(function () {
          if ($(this).prop("checked")) {
            selected.push($(this).data("value"));
          }
        });
        menu.callback(selected);
      }

      if (this.elementDiv.is(":visible")) {
        this.input.trigger("focus");
      } else if (this.optionSelectTrigger.is(":visible")) {
        this.optionSelectTrigger.trigger("focus");
      } else {
        this.selectTrigger.trigger("focus");
      }
    },
    _createMenu(menuOptions, opts, callback) {
      const that = this;
      const menu = $("<div>").addClass("red-ui-typedInput-options red-ui-editor-dialog");
      menu.opts = opts;
      menu.callback = callback;
      menuOptions.forEach((opt) => {
        if (typeof opt === "string") {
          opt = { value: opt, label: opt };
        }
        const op = $("<a href=\"#\"></a>").attr("value", opt.value).appendTo(menu);
        if (opt.label) {
          op.text(opt.label);
        }
        if (opt.title) {
          op.prop("title", opt.title);
        }
        if (opt.icon) {
          if (opt.icon.indexOf("<") === 0) {
            $(opt.icon).prependTo(op);
          } else if (opt.icon.indexOf("/") !== -1) {
            $("<img>", { src: mapDeprecatedIcon(opt.icon), style: "margin-right: 4px; height: 18px; filter: invert(100%);" }).prependTo(op);
          } else {
            $("<i>", { class: `red-ui-typedInput-icon ${opt.icon}` }).prependTo(op);
          }
        } else {
          op.css({ paddingLeft: "18px" });
        }
        if (!opt.icon && !opt.label) {
          op.text(opt.value);
        }
        let cb;
        if (opts.multiple) {
          cb = $("<input type=\"checkbox\">").css("pointer-events", "none").data("value", opt.value).prependTo(op)
            .on("mousedown", (evt) => { evt.preventDefault(); });
        }

        op.on("click", (event) => {
          event.preventDefault();
          event.stopPropagation();
          if (!opts.multiple) {
            callback(opt.value);
            that._hideMenu(menu);
          } else {
            cb.prop("checked", !cb.prop("checked"));
          }
        });
      });
      menu.css({
        display: "none"
      });
      menu.appendTo(document.body);

      menu.on("keydown", function (evt) {
        if (evt.keyCode === 40) {
          evt.preventDefault();
          // DOWN
          $(this).children(":focus").next().trigger("focus");
        } else if (evt.keyCode === 38) {
          evt.preventDefault();
          // UP
          $(this).children(":focus").prev().trigger("focus");
        } else if (evt.keyCode === 27) {
          // ESCAPE
          evt.preventDefault();
          that._hideMenu(menu);
        }
        evt.stopPropagation();
      });
      return menu;
    },
    _showMenu(menu, relativeTo) {
      if (this.disarmClick) {
        this.disarmClick = false;
        return;
      }
      if (menu.opts.multiple) {
        const selected = {};
        this.value().split(",").forEach((f) => {
          selected[f] = true;
        });
        menu.find("input[type=\"checkbox\"]").each(function () {
          $(this).prop("checked", selected[$(this).data("value")]);
        });
      }


      const that = this;
      const pos = relativeTo.offset();
      const height = relativeTo.height();
      const menuHeight = menu.height();
      let top = (height + pos.top);
      if (top + menuHeight > $(window).height()) {
        top -= (top + menuHeight) - $(window).height() + 5;
      }
      if (top < 0) {
        menu.height(menuHeight + top);
        top = 0;
      }
      menu.css({
        top: `${top}px`,
        left: `${pos.left}px`,
      });
      menu.slideDown(100);
      this._delay(() => {
        that.uiSelect.addClass("red-ui-typedInput-focus");
        $(document).on("mousedown.red-ui-typedInput-close-property-select", (event) => {
          if (!$(event.target).closest(menu).length) {
            that._hideMenu(menu);
          }
          if ($(event.target).closest(relativeTo).length) {
            that.disarmClick = true;
            event.preventDefault();
          }
        });
      });
    },
    _getLabelWidth(label, done) {
      let labelWidth = label.outerWidth();
      if (labelWidth === 0) {
        const wrapper = $("<div class=\"red-ui-editor\"></div>").css({
          position: "absolute",
          "white-space": "nowrap",
          top: -2000
        }).appendTo(document.body);
        const container = $("<div class=\"red-ui-typedInput-container\"></div>").appendTo(wrapper);
        const newTrigger = label.clone().appendTo(container);
        setTimeout(() => {
          labelWidth = newTrigger.outerWidth();
          wrapper.remove();
          done(labelWidth);
        }, 50);
      } else {
        done(labelWidth);
      }
    },
    _updateOptionSelectLabel(o) {
      const opt = this.typeMap[this.propertyType];
      this.optionSelectLabel.empty();
      if (opt.hasValue) {
        this.valueLabelContainer.empty();
        this.valueLabelContainer.show();
      } else {
        this.valueLabelContainer.hide();
      }
      if (this.typeMap[this.propertyType].valueLabel) {
        if (opt.multiple) {
          this.typeMap[this.propertyType].valueLabel.call(this, opt.hasValue ? this.valueLabelContainer : this.optionSelectLabel, o);
        } else {
          this.typeMap[this.propertyType].valueLabel.call(this, opt.hasValue ? this.valueLabelContainer : this.optionSelectLabel, o.value);
        }
      }
      if (!this.typeMap[this.propertyType].valueLabel || opt.hasValue) {
        if (!opt.multiple) {
          if (o.icon) {
            if (o.icon.indexOf("<") === 0) {
              $(o.icon).prependTo(this.optionSelectLabel);
            } else if (o.icon.indexOf("/") !== -1) {
              // url
              $("<img>", { src: mapDeprecatedIcon(o.icon), style: "height: 18px;" }).prependTo(this.optionSelectLabel);
            } else {
              // icon class
              $("<i>", { class: `red-ui-typedInput-icon ${o.icon}` }).prependTo(this.optionSelectLabel);
            }
          } else if (o.label) {
            this.optionSelectLabel.text(o.label);
          } else {
            this.optionSelectLabel.text(o.value);
          }
          if (opt.hasValue) {
            this.optionValue = o.value;
            this.input.trigger("change", [this.propertyType, this.value()]);
          }
        } else {
          this.optionSelectLabel.text(`${o.length} selected`);
        }
      }
    },
    _destroy() {
      if (this.optionMenu) {
        this.optionMenu.remove();
      }
      this.menu.remove();
      this.uiSelect.remove();
    },
    types(types) {
      const that = this;
      const currentType = this.type();
      this.typeMap = {};
      this.typeList = types.map((opt) => {
        let result;
        if (typeof opt === "string") {
          result = allOptions[opt];
        } else {
          result = opt;
        }
        that.typeMap[result.value] = result;
        return result;
      });
      if (this.typeList.length < 2) {
        this.selectTrigger.attr("tabindex", -1);
      } else {
        this.selectTrigger.attr("tabindex", 0);
      }
      this.selectTrigger.toggleClass("disabled", this.typeList.length === 1);
      this.selectTrigger.find(".fa-caret-down").toggle(this.typeList.length > 1);
      if (this.menu) {
        this.menu.remove();
      }
      this.menu = this._createMenu(this.typeList, {}, (v) => { that.type(v); });
      if (currentType && !this.typeMap.hasOwnProperty(currentType)) {
        this.type(this.typeList[0].value);
      } else {
        this.propertyType = null;
        this.type(currentType);
      }
    },
    width(desiredWidth) {
      this.uiWidth = desiredWidth;
      if (this.uiWidth !== null) {
        this.uiSelect.width(this.uiWidth);
      }
    },
    value(value) {
      const that = this;
      const opt = this.typeMap[this.propertyType];
      if (!arguments.length) {
        let v = this.input.val();
        if (opt.export) {
          v = opt.export(v, this.optionValue);
        }
        return v;
      }
      let selectedOption = [];
      if (opt.options) {
        let checkValues = [value];
        if (opt.multiple) {
          selectedOption = [];
          checkValues = value.split(",");
        }
        checkValues.forEach((value) => {
          for (let i = 0; i < opt.options.length; i++) {
            const op = opt.options[i];
            if (typeof op === "string") {
              if (op === value || op === `${value}`) {
                selectedOption.push(that.activeOptions[op]);
                break;
              }
            } else if (op.value === value) {
              selectedOption.push(op);
              break;
            }
          }
        });
        this.input.val(value);
        if (!opt.multiple) {
          if (selectedOption.length === 0) {
            selectedOption = [{ value: "" }];
          }
          this._updateOptionSelectLabel(selectedOption[0]);
        } else {
          this._updateOptionSelectLabel(selectedOption);
        }
      } else {
        this.input.val(value);
        if (opt.valueLabel) {
          this.valueLabelContainer.empty();
          opt.valueLabel.call(this, this.valueLabelContainer, value);
        }
      }
      this.input.trigger("change", [this.type(), value]);
    },
    type(type) {
      if (!arguments.length) {
        return this.propertyType;
      }
      const that = this;
      const opt = this.typeMap[type];
      if (opt && this.propertyType !== type) {
        this.propertyType = type;
        if (this.typeField) {
          this.typeField.val(type);
        }
        this.selectLabel.empty();
        let image;
        if (opt.icon && opt.showLabel !== false) {
          if (opt.icon.indexOf("<") === 0) {
            $(opt.icon).prependTo(this.selectLabel);
          } else if (opt.icon.indexOf("/") !== -1) {
            image = new Image();
            image.name = opt.icon;
            image.src = mapDeprecatedIcon(opt.icon);
            $("<img>", { src: mapDeprecatedIcon(opt.icon), style: "margin-right: 4px;height: 18px;filter: invert(100%);" }).prependTo(this.selectLabel);
          } else {
            $("<i>", { class: `red-ui-typedInput-icon ${opt.icon}`, style: "min-width: 13px; margin-right: 4px;filter: invert(100%);" }).prependTo(this.selectLabel);
          }
        }
        if (opt.hasValue === false || (opt.showLabel !== false && !opt.icon)) {
          this.selectLabel.text(opt.label);
        }
        if (opt.label) {
          this.selectTrigger.attr("title", opt.label);
        } else {
          this.selectTrigger.attr("title", "");
        }
        if (opt.hasValue === false) {
          this.selectTrigger.addClass("red-ui-typedInput-full-width");
        } else {
          this.selectTrigger.removeClass("red-ui-typedInput-full-width");
        }

        if (this.optionMenu) {
          this.optionMenu.remove();
          this.optionMenu = null;
        }
        if (opt.options) {
          if (this.optionExpandButton) {
            this.optionExpandButton.hide();
            this.optionExpandButton.shown = false;
          }
          if (this.optionSelectTrigger) {
            this.optionSelectTrigger.css({ display: "inline-flex" });
            if (!opt.hasValue) {
              this.optionSelectTrigger.css({ "flex-grow": 1 });
              this.elementDiv.hide();
              this.valueLabelContainer.hide();
            } else {
              this.optionSelectTrigger.css({ "flex-grow": 0 });
              this.elementDiv.show();
              this.valueLabelContainer.hide();
            }
            this.activeOptions = {};
            opt.options.forEach((o) => {
              if (typeof o === "string") {
                that.activeOptions[o] = { label: o, value: o };
              } else {
                that.activeOptions[o.value] = o;
              }
            });

            if (!that.activeOptions.hasOwnProperty(that.optionValue)) {
              that.optionValue = null;
            }

            let op;
            if (!opt.hasValue) {
              let validValue = false;
              const currentVal = this.input.val();
              if (!opt.multiple) {
                for (var i = 0; i < opt.options.length; i++) {
                  op = opt.options[i];
                  if (typeof op === "string" && op === currentVal) {
                    that._updateOptionSelectLabel({ value: currentVal });
                    validValue = true;
                    break;
                  } else if (op.value === currentVal) {
                    that._updateOptionSelectLabel(op);
                    validValue = true;
                    break;
                  }
                }
                if (!validValue) {
                  op = opt.options[0];
                  if (typeof op === "string") {
                    this.value(op);
                    that._updateOptionSelectLabel({ value: op });
                  } else {
                    this.value(op.value);
                    that._updateOptionSelectLabel(op);
                  }
                }
              } else {
                // Check to see if value is a valid csv of
                // options.
                const currentValues = {};
                currentVal.split(",").forEach((v) => {
                  if (v) {
                    currentValues[v] = true;
                  }
                });
                for (var i = 0; i < opt.options.length; i++) {
                  op = opt.options[i];
                  delete currentValues[op.value || op];
                }
                if (!$.isEmptyObject(currentValues)) {
                  // Invalid, set to default/empty
                  this.value((opt.default || []).join(","));
                }
              }
            } else {
              let selectedOption = this.optionValue || opt.options[0];
              if (opt.parse) {
                const parts = opt.parse(this.input.val(), selectedOption);
                if (parts.option) {
                  selectedOption = parts.option;
                  if (!this.activeOptions.hasOwnProperty(selectedOption)) {
                    parts.option = Object.keys(this.activeOptions)[0];
                    selectedOption = parts.option;
                  }
                }
                this.input.val(parts.value);
                if (opt.export) {
                  this.element.val(opt.export(parts.value, parts.option || selectedOption));
                }
              }
              if (typeof selectedOption === "string") {
                this.optionValue = selectedOption;
                if (!this.activeOptions.hasOwnProperty(selectedOption)) {
                  selectedOption = Object.keys(this.activeOptions)[0];
                }
                if (!selectedOption) {
                  this.optionSelectTrigger.hide();
                } else {
                  this._updateOptionSelectLabel(this.activeOptions[selectedOption]);
                }
              } else if (selectedOption) {
                this.optionValue = selectedOption.value;
                this._updateOptionSelectLabel(selectedOption);
              } else {
                this.optionSelectTrigger.hide();
              }
            }
            this.optionMenu = this._createMenu(opt.options, opt, (v) => {
              if (!opt.multiple) {
                that._updateOptionSelectLabel(that.activeOptions[v]);
                if (!opt.hasValue) {
                  that.value(that.activeOptions[v].value);
                }
              } else {
                that._updateOptionSelectLabel(v);
                if (!opt.hasValue) {
                  that.value(v.join(","));
                }
              }
            });
          }
          this._trigger("typechange", null, this.propertyType);
          this.input.trigger("change", [this.propertyType, this.value()]);
        } else {
          if (this.optionSelectTrigger) {
            this.optionSelectTrigger.hide();
          }
          if (opt.inputType) {
            this.input.attr("type", opt.inputType);
          } else {
            this.input.attr("type", this.defaultInputType);
          }
          if (opt.hasValue === false) {
            this.oldValue = this.input.val();
            this.input.val("");
            this.elementDiv.hide();
            this.valueLabelContainer.hide();
          } else if (opt.valueLabel) {
            // Reset any CSS the custom label may have set
            this.valueLabelContainer.css("pointer-events", "");
            this.valueLabelContainer.css("flex-grow", 1);
            this.valueLabelContainer.css("overflow", "hidden");
            this.valueLabelContainer.show();
            this.valueLabelContainer.empty();
            this.elementDiv.hide();
            opt.valueLabel.call(this, this.valueLabelContainer, this.input.val());
          } else {
            if (this.oldValue !== undefined) {
              this.input.val(this.oldValue);
              delete this.oldValue;
            }
            this.valueLabelContainer.hide();
            this.elementDiv.show();
          }
          if (this.optionExpandButton) {
            if (opt.expand) {
              if (opt.expand.icon) {
                this.optionExpandButtonIcon.removeClass().addClass(`red-ui-typedInput-icon fa ${opt.expand.icon}`);
              } else {
                this.optionExpandButtonIcon.removeClass().addClass("red-ui-typedInput-icon fa fa-ellipsis-h");
              }
              this.optionExpandButton.shown = true;
              this.optionExpandButton.show();
              this.optionExpandButton.off("click");
              this.optionExpandButton.on("click", (evt) => {
                evt.preventDefault();
                if (typeof opt.expand === "function") {
                  opt.expand.call(that);
                } else {
                  const container = $("<div>");
                  const content = opt.expand.content.call(that, container);
                  const panel = RED.popover.panel(container);
                  panel.container.css({
                    width: that.valueLabelContainer.width()
                  });
                  if (opt.expand.minWidth) {
                    panel.container.css({
                      minWidth: `${opt.expand.minWidth}px`
                    });
                  }
                  panel.show({
                    target: that.optionExpandButton,
                    onclose: content.onclose,
                    align: "left"
                  });
                }
              });
            } else {
              this.optionExpandButton.shown = false;
              this.optionExpandButton.hide();
            }
          }
          this._trigger("typechange", null, this.propertyType);
          this.input.trigger("change", [this.propertyType, this.value()]);
        }
      }
    },
    validate() {
      let result;
      const value = this.value();
      const type = this.type();
      if (this.typeMap[type] && this.typeMap[type].validate) {
        const val = this.typeMap[type].validate;
        if (typeof val === "function") {
          result = val(value);
        } else {
          result = val.test(value);
        }
      } else {
        result = true;
      }
      if (result) {
        this.uiSelect.removeClass("input-error");
      } else {
        this.uiSelect.addClass("input-error");
      }
      return result;
    },
    show() {
      this.uiSelect.show();
    },
    hide() {
      this.uiSelect.hide();
    },
    disable(val) {
      if (val === undefined || !!val) {
        this.uiSelect.attr("disabled", "disabled");
      } else {
        this.uiSelect.attr("disabled", null); // remove attr
      }
    },
    enable() {
      this.uiSelect.attr("disabled", null); // remove attr
    },
    disabled() {
      return this.uiSelect.attr("disabled") === "disabled";
    }
  });
}(jQuery));
