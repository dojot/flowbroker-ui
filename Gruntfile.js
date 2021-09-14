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

const path = require("path");
const fs = require("fs-extra");
const sass = require("sass");

module.exports = function (grunt) {
  const nodemonArgs = ["-V"];
  const flowFile = grunt.option("flowFile");
  if (flowFile) {
    nodemonArgs.push(flowFile);
    process.env.NODE_RED_ENABLE_PROJECTS = false;
  }
  const userDir = grunt.option("userDir");
  if (userDir) {
    nodemonArgs.push("-u");
    nodemonArgs.push(userDir);
  }

  const browserstack = grunt.option("browserstack");
  if (browserstack) {
    process.env.BROWSERSTACK = true;
  }
  const nonHeadless = grunt.option("non-headless");
  if (nonHeadless) {
    process.env.NODE_RED_NON_HEADLESS = true;
  }
  const pkg = grunt.file.readJSON("package.json");
  process.env.NODE_RED_PACKAGE_VERSION = pkg.version;
  grunt.initConfig({
    pkg,
    paths: {
      dist: ".dist"
    },
    simplemocha: {
      options: {
        globals: ["expect"],
        timeout: 3000,
        ignoreLeaks: false,
        ui: "bdd",
        reporter: "spec"
      },
      all: { src: ["test/unit/_spec.js", "test/unit/**/*_spec.js", "test/nodes/**/*_spec.js"] },
      core: { src: ["test/unit/_spec.js", "test/unit/**/*_spec.js"] },
      nodes: { src: ["test/nodes/**/*_spec.js"] }
    },
    webdriver: {
      all: {
        configFile: "test/editor/wdio.conf.js"
      }
    },
    nyc: {
      options: {
        cwd: ".",
        include: ["**"],
        excludeNodeModules: false,
        exclude: ["@node-red/editor-client/**"],
        reporter: ["lcov", "html", "text-summary"],
        reportDir: "coverage",
        all: true
      },
      all: { cmd: false, args: ["grunt", "simplemocha:all"] },
      core: { options: { exclude: ["@node-red/editor-client/**", "@node-red/nodes/**"] }, cmd: false, args: ["grunt", "simplemocha:core"] },
      nodes: { cmd: false, args: ["grunt", "simplemocha:nodes"] }
    },
    jshint: {
      options: {
        jshintrc: true
        // http://www.jshint.com/docs/options/
        // "asi": true,      // allow missing semicolons
        // "curly": true,    // require braces
        // "eqnull": true,   // ignore ==null
        // "forin": true,    // require property filtering in "for in" loops
        // "immed": true,    // require immediate functions to be wrapped in ( )
        // "nonbsp": true,   // warn on unexpected whitespace breaking chars
        /// /"strict": true, // commented out for now as it causes 100s of warnings,
        // but want to get there eventually
        // "loopfunc": true, // allow functions to be defined in loops
        // "sub": true       // don't warn that foo['bar'] should be written as foo.bar
      },
      // all: [
      //     'Gruntfile.js',
      //     'red.js',
      //     'packages/**/*.js'
      // ],
      // core: {
      //     files: {
      //         src: [
      //             'Gruntfile.js',
      //             'red.js',
      //             'packages/**/*.js',
      //         ]
      //     }
      // },
      nodes: {
        files: {
          src: ["nodes/core/*/*.js"]
        }
      },
      editor: {
        files: {
          src: ["@node-red/editor-client/src/js/**/*.js"]
        }
      },
      tests: {
        files: {
          src: ["test/**/*.js"]
        },
        options: {
          expr: true
        }
      }
    },
    concat: {
      options: {
        separator: ";",
      },
      build: {
        src: [
          // Ensure editor source files are concatenated in
          // the right order
          "@node-red/editor-client/src/js/polyfills.js",
          "@node-red/editor-client/src/js/jquery-addons.js",
          "@node-red/editor-client/src/js/red.js",
          "@node-red/editor-client/src/js/events.js",
          "@node-red/editor-client/src/js/hooks.js",
          "@node-red/editor-client/src/js/i18n.js",
          "@node-red/editor-client/src/js/settings.js",
          "@node-red/editor-client/src/js/user.js",
          "@node-red/editor-client/src/js/comms.js",
          "@node-red/editor-client/src/js/text/bidi.js",
          "@node-red/editor-client/src/js/text/format.js",
          "@node-red/editor-client/src/js/ui/state.js",
          "@node-red/editor-client/src/js/plugins.js",
          "@node-red/editor-client/src/js/nodes.js",
          "@node-red/editor-client/src/js/font-awesome.js",
          "@node-red/editor-client/src/js/history.js",
          "@node-red/editor-client/src/js/validators.js",
          "@node-red/editor-client/src/js/ui/utils.js",
          "@node-red/editor-client/src/js/ui/common/editableList.js",
          "@node-red/editor-client/src/js/ui/common/treeList.js",
          "@node-red/editor-client/src/js/ui/common/checkboxSet.js",
          "@node-red/editor-client/src/js/ui/common/menu.js",
          "@node-red/editor-client/src/js/ui/common/panels.js",
          "@node-red/editor-client/src/js/ui/common/popover.js",
          "@node-red/editor-client/src/js/ui/common/searchBox.js",
          "@node-red/editor-client/src/js/ui/common/tabs.js",
          "@node-red/editor-client/src/js/ui/common/stack.js",
          "@node-red/editor-client/src/js/ui/common/typedInput.js",
          "@node-red/editor-client/src/js/ui/common/toggleButton.js",
          "@node-red/editor-client/src/js/ui/common/colorPicker.js",
          "@node-red/editor-client/src/js/ui/actions.js",
          "@node-red/editor-client/src/js/ui/deploy.js",
          "@node-red/editor-client/src/js/ui/diff.js",
          "@node-red/editor-client/src/js/ui/keyboard.js",
          "@node-red/editor-client/src/js/ui/workspaces.js",
          "@node-red/editor-client/src/js/ui/statusBar.js",
          "@node-red/editor-client/src/js/ui/view.js",
          "@node-red/editor-client/src/js/ui/view-annotations.js",
          "@node-red/editor-client/src/js/ui/view-navigator.js",
          "@node-red/editor-client/src/js/ui/view-tools.js",
          "@node-red/editor-client/src/js/ui/sidebar.js",
          "@node-red/editor-client/src/js/ui/palette.js",
          "@node-red/editor-client/src/js/ui/tab-info.js",
          "@node-red/editor-client/src/js/ui/tab-info-outliner.js",
          "@node-red/editor-client/src/js/ui/tab-help.js",
          "@node-red/editor-client/src/js/ui/tab-config.js",
          "@node-red/editor-client/src/js/ui/tab-context.js",
          "@node-red/editor-client/src/js/ui/palette-editor.js",
          "@node-red/editor-client/src/js/ui/editor.js",
          "@node-red/editor-client/src/js/ui/editors/*.js",
          "@node-red/editor-client/src/js/ui/editors/code-editors/*.js",
          "@node-red/editor-client/src/js/ui/event-log.js",
          "@node-red/editor-client/src/js/ui/tray.js",
          "@node-red/editor-client/src/js/ui/clipboard.js",
          "@node-red/editor-client/src/js/ui/library.js",
          "@node-red/editor-client/src/js/ui/notifications.js",
          "@node-red/editor-client/src/js/ui/search.js",
          "@node-red/editor-client/src/js/ui/actionList.js",
          "@node-red/editor-client/src/js/ui/typeSearch.js",
          "@node-red/editor-client/src/js/ui/subflow.js",
          "@node-red/editor-client/src/js/ui/group.js",
          "@node-red/editor-client/src/js/ui/userSettings.js",
          "@node-red/editor-client/src/js/ui/projects/projects.js",
          "@node-red/editor-client/src/js/ui/projects/projectSettings.js",
          "@node-red/editor-client/src/js/ui/projects/projectUserSettings.js",
          "@node-red/editor-client/src/js/ui/projects/tab-versionControl.js",
          "@node-red/editor-client/src/js/ui/touch/radialMenu.js"
        ],
        dest: "@node-red/editor-client/public/red/red.js"
      },
      vendor: {
        files: {
          "@node-red/editor-client/public/vendor/vendor.js": [
            "@node-red/editor-client/src/vendor/jquery/js/jquery-3.5.1.min.js",
            "@node-red/editor-client/src/vendor/jquery/js/jquery-migrate-3.3.0.min.js",
            "@node-red/editor-client/src/vendor/jquery/js/jquery-ui.min.js",
            "@node-red/editor-client/src/vendor/jquery/js/jquery.ui.touch-punch.min.js",
            "node_modules/marked/marked.min.js",
            "node_modules/dompurify/dist/purify.min.js",
            "@node-red/editor-client/src/vendor/d3/d3.v3.min.js",
            "node_modules/i18next/i18next.min.js",
            "node_modules/i18next-http-backend/i18nextHttpBackend.min.js",
            "node_modules/jquery-i18next/jquery-i18next.min.js",
            "node_modules/jsonata/jsonata-es5.min.js",
            "@node-red/editor-client/src/vendor/jsonata/formatter.js",
            "@node-red/editor-client/src/vendor/ace/ace.js",
            "@node-red/editor-client/src/vendor/ace/ext-language_tools.js",
          ],
          // "@node-red/editor-client/public/vendor/vendor.css": [
          //     // TODO: resolve relative resource paths in
          //     //       bootstrap/FA/jquery
          // ],
          "@node-red/editor-client/public/vendor/ace/worker-jsonata.js": [
            "node_modules/jsonata/jsonata-es5.min.js",
            "@node-red/editor-client/src/vendor/jsonata/worker-jsonata.js"
          ]
        }
      }
    },
    uglify: {
      build: {
        files: {
          "@node-red/editor-client/public/red/red.min.js": "@node-red/editor-client/public/red/red.js",
          "@node-red/editor-client/public/red/main.min.js": "@node-red/editor-client/public/red/main.js",
          "@node-red/editor-client/public/vendor/ace/mode-jsonata.js": "@node-red/editor-client/src/vendor/jsonata/mode-jsonata.js",
          "@node-red/editor-client/public/vendor/ace/snippets/jsonata.js": "@node-red/editor-client/src/vendor/jsonata/snippets-jsonata.js"
        }
      }
    },
    sass: {
      build: {
        options: {
          implementation: sass,
          outputStyle: "compressed"
        },
        files: [{
          dest: "@node-red/editor-client/public/red/style.min.css",
          src: "@node-red/editor-client/src/sass/style.scss"
        }]
      }
    },
    jsonlint: {
      messages: {
        src: [
          "@node-red/nodes/locales/**/*.json",
          "@node-red/editor-client/locales/**/*.json",
          "@node-red/runtime/locales/**/*.json"
        ]
      },
      keymaps: {
        src: [
          "@node-red/editor-client/src/js/keymap.json"
        ]
      }
    },
    attachCopyright: {
      js: {
        src: [
          "@node-red/editor-client/public/red/red.min.js",
          "@node-red/editor-client/public/red/main.min.js"
        ]
      },
      css: {
        src: [
          "@node-red/editor-client/public/red/style.min.css"
        ]
      }
    },
    clean: {
      build: {
        src: [
          "@node-red/editor-client/public/red",
          "@node-red/editor-client/public/index.html",
          "@node-red/editor-client/public/favicon.ico",
          "@node-red/editor-client/public/icons",
          "@node-red/editor-client/public/vendor",
          "@node-red/editor-client/public/types/node",
          "@node-red/editor-client/public/types/node-red",
        ]
      },
      release: {
        src: [
          "<%= paths.dist %>"
        ]
      }
    },
    watch: {
      js: {
        files: [
          "@node-red/editor-client/src/js/**/*.js"
        ],
        tasks: ["copy:build", "concat", /* 'uglify', */ "attachCopyright:js"]
      },
      sass: {
        files: [
          "@node-red/editor-client/src/sass/**/*.scss"
        ],
        tasks: ["sass", "attachCopyright:css"]
      },
      json: {
        files: [
          "@node-red/nodes/locales/**/*.json",
          "@node-red/editor-client/locales/**/*.json",
          "@node-red/runtime/locales/**/*.json"
        ],
        tasks: ["jsonlint:messages"]
      },
      keymaps: {
        files: [
          "@node-red/editor-client/src/js/keymap.json"
        ],
        tasks: ["jsonlint:keymaps", "copy:build"]
      },
      misc: {
        files: [
          "CHANGELOG.md"
        ],
        tasks: ["copy:build"]
      }
    },

    nodemon: {
      /* uses .nodemonignore */
      dev: {
        script: "node-red/red.js",
        options: {
          args: nodemonArgs,
          ext: "js,html,json",
          watch: [
            "packages/node_modules",
            "!@node-red/editor-client"
          ]
        }
      }
    },

    concurrent: {
      dev: {
        tasks: ["nodemon", "watch"],
        options: {
          logConcurrentOutput: true
        }
      }
    },

    copy: {
      build: {
        files: [
          {
            src: "@node-red/editor-client/src/js/main.js",
            dest: "@node-red/editor-client/public/red/main.js"
          },
          {
            src: "@node-red/editor-client/src/js/keymap.json",
            dest: "@node-red/editor-client/public/red/keymap.json"
          },
          {
            cwd: "@node-red/editor-client/src/images",
            src: "**",
            expand: true,
            dest: "@node-red/editor-client/public/red/images/"
          },
          {
            cwd: "@node-red/editor-client/src/vendor",
            src: [
              "ace/**",
              "jquery/css/base/**",
              "font-awesome/**",
              "monaco/dist/**",
              "monaco/types/extraLibs.js",
              "monaco/style.css",
              "monaco/monaco-bootstrap.js"
            ],
            expand: true,
            dest: "@node-red/editor-client/public/vendor/"
          },
          {
            cwd: "@node-red/editor-client/src",
            src: [
              "types/node/*.ts",
              "types/node-red/*.ts",
            ],
            expand: true,
            dest: "@node-red/editor-client/public/"
          },
          {
            cwd: "@node-red/editor-client/src/icons",
            src: "**",
            expand: true,
            dest: "@node-red/editor-client/public/icons/"
          },
          {
            expand: true,
            src: ["@node-red/editor-client/src/index.html", "@node-red/editor-client/src/favicon.ico"],
            dest: "@node-red/editor-client/public/",
            flatten: true
          },
          {
            src: "CHANGELOG.md",
            dest: "@node-red/editor-client/public/red/about"
          },
          {
            src: "CHANGELOG.md",
            dest: "node-red/"
          },
          {
            cwd: "@node-red/editor-client/src/ace/bin/",
            src: "**",
            expand: true,
            dest: "@node-red/editor-client/public/vendor/ace/"
          }
        ]
      }
    },
    chmod: {
      options: {
        mode: "755"
      },
      release: {
        src: [
          "@node-red/nodes/core/hardware/nrgpio",
          "@node-red/runtime/lib/storage/localfilesystem/projects/git/node-red-*sh"
        ]
      }
    },
    "npm-command": {
      options: {
        cmd: "pack",
        cwd: "<%= paths.dist %>/modules"
      },
      "node-red": { options: { args: [`${__dirname}/node-red`] } },
      "@node-red/editor-api": { options: { args: [`${__dirname}/@node-red/editor-api`] } },
      "@node-red/editor-client": { options: { args: [`${__dirname}/@node-red/editor-client`] } },
      "@node-red/nodes": { options: { args: [`${__dirname}/@node-red/nodes`] } },
      "@node-red/registry": { options: { args: [`${__dirname}/@node-red/registry`] } },
      "@node-red/runtime": { options: { args: [`${__dirname}/@node-red/runtime`] } },
      "@node-red/util": { options: { args: [`${__dirname}/@node-red/util`] } }


    },
    mkdir: {
      release: {
        options: {
          create: ["<%= paths.dist %>/modules"]
        },
      },
    },
    compress: {
      release: {
        options: {
          archive: "<%= paths.dist %>/node-red-<%= pkg.version %>.zip"
        },
        expand: true,
        cwd: "",
        src: [
          "**",
          "!@node-red/editor-client/src/**"
        ]
      }
    },
    jsdoc: {
      modules: {
        src: [
          "API.md",
          "node-red/lib/red.js",
          "@node-red/runtime/lib/index.js",
          "@node-red/runtime/lib/api/*.js",
          "@node-red/runtime/lib/events.js",
          "@node-red/runtime/lib/hooks.js",
          "@node-red/util/**/*.js",
          "@node-red/editor-api/lib/index.js",
          "@node-red/editor-api/lib/auth/index.js",
          "@node-red/registry/lib/index.js"
        ],
        options: {
          destination: "docs",
          configure: "./jsdoc.json",
          fred: "hi there"
        }
      },
      _editor: {
        src: [
          "@node-red/editor-client/src/js"
        ],
        options: {
          destination: "@node-red/editor-client/docs",
          configure: "./jsdoc.json"
        }
      }

    },
    jsdoc2md: {
      runtimeAPI: {
        options: {
          separators: true
        },
        src: [
          "@node-red/runtime/lib/index.js",
          "@node-red/runtime/lib/api/*.js",
          "@node-red/runtime/lib/events.js"
        ],
        dest: "@node-red/runtime/docs/api.md"
      },
      nodeREDUtil: {
        options: {
          separators: true
        },
        src: "@node-red/util/**/*.js",
        dest: "@node-red/util/docs/api.md"
      }
    }
  });

  grunt.loadNpmTasks("grunt-simple-mocha");
  grunt.loadNpmTasks("grunt-contrib-jshint");
  grunt.loadNpmTasks("grunt-contrib-concat");
  grunt.loadNpmTasks("grunt-contrib-uglify");
  grunt.loadNpmTasks("grunt-contrib-clean");
  grunt.loadNpmTasks("grunt-contrib-watch");
  grunt.loadNpmTasks("grunt-concurrent");
  grunt.loadNpmTasks("grunt-sass");
  grunt.loadNpmTasks("grunt-contrib-compress");
  grunt.loadNpmTasks("grunt-contrib-copy");
  grunt.loadNpmTasks("grunt-chmod");
  grunt.loadNpmTasks("grunt-jsonlint");
  if (fs.existsSync(path.join("node_modules", "grunt-webdriver"))) {
    grunt.loadNpmTasks("grunt-webdriver");
  }
  grunt.loadNpmTasks("grunt-jsdoc");
  grunt.loadNpmTasks("grunt-jsdoc-to-markdown");
  grunt.loadNpmTasks("grunt-npm-command");
  grunt.loadNpmTasks("grunt-mkdir");
  grunt.loadNpmTasks("grunt-simple-nyc");

  grunt.registerMultiTask("nodemon", "Runs a nodemon monitor of your node.js server.", function () {
    const nodemon = require("nodemon");
    this.async();
    const options = this.options();
    options.script = this.data.script;
    let callback;
    if (options.callback) {
      callback = options.callback;
      delete options.callback;
    } else {
      callback = function (nodemonApp) {
        nodemonApp.on("log", (event) => {
          console.log(event.colour);
        });
      };
    }
    callback(nodemon(options));
  });

  grunt.registerMultiTask("attachCopyright", function () {
    const files = this.data.src;
    const copyright = "/**\n"
      + " * Copyright JS Foundation and other contributors, http://js.foundation\n"
      + " *\n"
      + " * Licensed under the Apache License, Version 2.0 (the \"License\");\n"
      + " * you may not use this file except in compliance with the License.\n"
      + " * You may obtain a copy of the License at\n"
      + " *\n"
      + " * http://www.apache.org/licenses/LICENSE-2.0\n"
      + " *\n"
      + " * Unless required by applicable law or agreed to in writing, software\n"
      + " * distributed under the License is distributed on an \"AS IS\" BASIS,\n"
      + " * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.\n"
      + " * See the License for the specific language governing permissions and\n"
      + " * limitations under the License.\n"
      + " **/\n";

    if (files) {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (!grunt.file.exists(file)) {
          grunt.log.warn(`File ${file} not found`);
          return false;
        }
        let content = grunt.file.read(file);
        if (content.indexOf(copyright) == -1) {
          content = copyright + content;
          if (!grunt.file.write(file, content)) {
            return false;
          }
          grunt.log.writeln(`Attached copyright to ${file}`);
        } else {
          grunt.log.writeln(`Copyright already on ${file}`);
        }
      }
    }
  });

  grunt.registerTask("verifyPackageDependencies", function () {
    const done = this.async();
    const verifyDependencies = require("./scripts/verify-package-dependencies.js");
    verifyDependencies().then((failures) => {
      if (failures.length > 0) {
        failures.forEach((f) => grunt.log.error(f));
        grunt.fail.fatal("Failed to verify package dependencies");
      }
      done();
    });
  });

  grunt.registerTask("verifyUiTestDependencies", () => {
    if (!fs.existsSync(path.join("node_modules", "grunt-webdriver"))) {
      grunt.fail.fatal("You need to install the UI test dependencies first.\nUse the script in \"scripts/install-ui-test-dependencies.sh\"");
      return false;
    }
  });
  grunt.registerTask("generatePublishScript",
    "Generates a script to publish build output to npm",
    function () {
      const done = this.async();
      const generatePublishScript = require("./scripts/generate-publish-script.js");
      generatePublishScript().then((output) => {
        grunt.log.writeln(output);

        const filePath = path.join(grunt.config.get("paths.dist"), "modules", "publish.sh");
        grunt.file.write(filePath, output);

        done();
      });
    });
  grunt.registerTask("setDevEnv",
    "Sets NODE_ENV=development so non-minified assets are used",
    () => {
      process.env.NODE_ENV = "development";
    });

  grunt.registerTask("default",
    "Builds editor content then runs code style checks and unit tests on all components",
    ["build", "verifyPackageDependencies", "jshint:editor", "nyc:all"]);

  grunt.registerTask("no-coverage",
    "Builds editor content then runs code style checks and unit tests on all components without code coverage",
    ["build", "verifyPackageDependencies", "jshint:editor", "simplemocha:all"]);


  grunt.registerTask("test-core",
    "Runs code style check and unit tests on core runtime code",
    ["build", "nyc:core"]);

  grunt.registerTask("test-editor",
    "Runs code style check on editor code",
    ["jshint:editor"]);

  if (!fs.existsSync(path.join("node_modules", "grunt-webdriver"))) {
    grunt.registerTask("test-ui",
      "Builds editor content then runs unit tests on editor ui",
      ["verifyUiTestDependencies"]);
  } else {
    grunt.registerTask("test-ui",
      "Builds editor content then runs unit tests on editor ui",
      ["verifyUiTestDependencies", "build", "jshint:editor", "webdriver:all"]);
  }

  grunt.registerTask("test-nodes",
    "Runs unit tests on core nodes",
    ["build", "nyc:nodes"]);

  grunt.registerTask("build",
    "Builds editor content",
    ["clean:build", "jsonlint", "concat:build", "concat:vendor", "copy:build", "uglify:build", "sass:build", "attachCopyright"]);

  grunt.registerTask("build-dev",
    "Developer mode: build dev version",
    ["clean:build", "concat:build", "concat:vendor", "copy:build", "sass:build", "setDevEnv"]);

  grunt.registerTask("dev",
    "Developer mode: run node-red, watch for source changes and build/restart",
    ["build", "setDevEnv", "concurrent:dev"]);

  grunt.registerTask("release",
    "Create distribution zip file",
    ["build", "verifyPackageDependencies", "clean:release", "mkdir:release", "chmod:release", "compress:release", "pack-modules", "generatePublishScript"]);

  grunt.registerTask("pack-modules",
    "Create module pack files for release",
    ["mkdir:release", "npm-command"]);


  grunt.registerTask("coverage",
    "Run Istanbul code test coverage task",
    ["build", "nyc:all"]);

  grunt.registerTask("docs",
    "Generates API documentation",
    ["jsdoc"]);
};
