const { Logger, ConfigManager, ServiceStateManager } = require("@dojot/microservice-sdk");

const { unflatten } = require("flat");

const userConfigFile = process.env.FLOWUI_USER_CONFIG_FILE || "production.conf";
ConfigManager.loadSettings("FLOWBROKER-UI", userConfigFile);

const config = unflatten(ConfigManager.getConfig("FLOWBROKER-UI"));


Logger.setTransport("console", {
  level: config.logger.console.level.toLowerCase(),
});
if (config.logger.file.enable) {
  Logger.setTransport("file", {
    level: config.logger.file.level.toLowerCase(),
    filename: config.logger.file.name,
    dirname: config.logger.file.dir,
    maxFiles: config.logger.file.max,
    maxSize: config.logger.file.size,
  });
}
Logger.setVerbose(config.logger.verbose);


/*
  Creating services
  Roadmap: uses DI Pattern
*/
const logger = new Logger("flowbroker-ui:App");

const stateManager = new ServiceStateManager({
  lightship: {
    port: config.server.healthcheck.port,
    shutdownDelay: config.server.shutdown.delay,
    gracefulShutdownTimeout: config.server.shutdown.gracefultimeoutms,
    shutdownHandlerTimeout: config.server.shutdown.handlertimeoutms,
  },
});


/*

Node-RED boostrapping code below
*/
const http = require("http");
const https = require("https");
const express = require("express");
const crypto = require("crypto");

try { bcrypt = require("bcrypt"); } catch (e) { bcrypt = require("bcryptjs"); }
const nopt = require("nopt");
const path = require("path");
const fs = require("fs-extra");

const settings = require("./config/red-settings");

const RED = require("./app/modules/RED/lib-red");

settings.settingsFile = "./config/red-settings.js";


let server;
const app = express();

let flowFile;

const knownOpts = {
  help: Boolean,
  port: Number,
  settings: [path],
  title: String,
  userDir: [path],
  verbose: Boolean,
  safe: Boolean,
  define: [String, Array]
};
const shortHands = {
  "?": ["--help"],
  p: ["--port"],
  s: ["--settings"],
  // As we want to reserve -t for now, adding a shorthand to help so it
  // doesn't get treated as --title
  t: ["--help"],
  u: ["--userDir"],
  v: ["--verbose"],
  D: ["--define"]
};
nopt.invalidHandler = function (k, v, t) {
  // TODO: console.log(k,v,t);
};

const parsedArgs = nopt(knownOpts, shortHands, process.argv, 2);

if (parsedArgs.help) {
  console.log(`Node-RED v${RED.version()}`);
  console.log("Usage: node-red [-v] [-?] [--settings settings.js] [--userDir DIR]");
  console.log("                [--port PORT] [--title TITLE] [--safe] [flows.json]");
  console.log("       node-red admin <command> [args] [-?] [--userDir DIR] [--json]");
  console.log("");
  console.log("Options:");
  console.log("  -p, --port     PORT  port to listen on");
  console.log("  -s, --settings FILE  use specified settings file");
  console.log("      --title    TITLE process window title");
  console.log("  -u, --userDir  DIR   use specified user directory");
  console.log("  -v, --verbose        enable verbose output");
  console.log("      --safe           enable safe mode");
  console.log("  -D, --define   X=Y   overwrite value in settings file");
  console.log("  -?, --help           show this help");
  console.log("  admin <command>      run an admin command");
  console.log("");
  console.log("Documentation can be found at http://nodered.org");
  process.exit();
}

if (parsedArgs.argv.remain.length > 0) {
  flowFile = parsedArgs.argv.remain[0];
}

process.env.NODE_RED_HOME = process.env.NODE_RED_HOME || __dirname;


if (parsedArgs.define) {
  const defs = parsedArgs.define;
  try {
    while (defs.length > 0) {
      const def = defs.shift();
      const match = /^(([^=]+)=(.+)|@(.*))$/.exec(def);
      if (match) {
        if (!match[4]) {
          let val = match[3];
          try {
            val = JSON.parse(match[3]);
          } catch (err) {
            // Leave it as a string
          }
          RED.util.setObjectProperty(settings, match[2], val, true);
        } else {
          const obj = fs.readJsonSync(match[4]);
          for (const k in obj) {
            if (obj.hasOwnProperty(k)) {
              RED.util.setObjectProperty(settings, k, obj[k], true);
            }
          }
        }
      } else {
        throw new Error(`Invalid syntax: '${def}'`);
      }
    }
  } catch (e) {
    logger.error(`Error processing -D option: ${e.message}`);
    process.exit();
  }
}

if (parsedArgs.verbose) {
  settings.verbose = true;
}
if (parsedArgs.safe || (process.env.NODE_RED_ENABLE_SAFE_MODE && !/^false$/i.test(process.env.NODE_RED_ENABLE_SAFE_MODE))) {
  settings.safeMode = true;
}

const defaultServerSettings = {
  "x-powered-by": false
};
const serverSettings = { ...defaultServerSettings, ...settings.httpServerOptions || {} };
for (const eOption in serverSettings) {
  app.set(eOption, serverSettings[eOption]);
}

/* Update EditorTheme variables */
const editorClientDir = path.dirname(require.resolve("./app/@node-red/editor-client"));
settings.editorTheme.header.image = `${editorClientDir}/public/${settings.editorTheme.header.image}`;
settings.editorTheme.page.css = [`${editorClientDir}/public/${settings.editorTheme.page.css[0]}`];
settings.editorTheme.page.scripts = [`${editorClientDir}/public/${settings.editorTheme.page.scripts[0]}`];


// Delay logging of (translated) messages until the RED object has been initialized
const delayedLogItems = [];

/*  Enabling HTTPS based on setting file
*/
let startupHttps = settings.https;
if (typeof startupHttps === "function") {
  // Get the result of the function, because createServer doesn't accept functions as input
  startupHttps = startupHttps();
}
const httpsPromise = Promise.resolve(startupHttps);


/*
  Creating HTTP Service
*/
httpsPromise.then((startupHttps) => {
  if (startupHttps) {
    server = https.createServer(startupHttps, (req, res) => {
      app(req, res);
    });

    // Emitted when the server has been bound after calling server.listen().
    server.on("listening", () => {
      logger.info("Server ready to accept connections!");
      logger.info(server.address());
      stateManager.signalReady("server");
    });

    // Emitted when the server closes. If connections exist,
    // this event is not emitted until all connections are ended.
    server.on("close", () => {
      stateManager.signalNotReady("server");
    });

    // Emitted when an error occurs. Unlike net.Socket, the 'close' event will not
    // be emitted directly following this event unless server.close() is manually called.
    server.on("error", (err) => {
      logger.error("Server experienced an error:", err);
      if (err.code === "EADDRINUSE") {
        throw err;
      }
    });


    if (settings.httpsRefreshInterval) {
      let httpsRefreshInterval = parseFloat(settings.httpsRefreshInterval) || 12;
      if (httpsRefreshInterval > 596) {
        // Max value based on (2^31-1)ms - the max that setInterval can accept
        httpsRefreshInterval = 596;
      }
      // Check whether setSecureContext is available (Node.js 11+)
      if (server.setSecureContext) {
        // Check whether `http` is a callable function
        if (typeof settings.https === "function") {
          delayedLogItems.push({ type: "info", id: "server.https.refresh-interval", params: { interval: httpsRefreshInterval } });
          setInterval(() => {
            try {
              // Get the result of the function, because
              // createServer doesn't accept functions as input
              Promise.resolve(settings.https()).then((refreshedHttps) => {
                if (refreshedHttps) {
                  // The key/cert needs to be updated in the NodeJs http(s) server, when no key/cert is yet available or when the key/cert has changed.
                  // Note that the refreshed key/cert can be supplied as a string or a buffer.
                  const updateKey = (server.key == undefined || (Buffer.isBuffer(server.key) && !server.key.equals(refreshedHttps.key)) || (typeof server.key === "string" && server.key != refreshedHttps.key));
                  const updateCert = (server.cert == undefined || (Buffer.isBuffer(server.cert) && !server.cert.equals(refreshedHttps.cert)) || (typeof server.cert === "string" && server.cert != refreshedHttps.cert));

                  // Only update the credentials in the server when key or cert has changed
                  if (updateKey || updateCert) {
                    server.setSecureContext(refreshedHttps);
                    logger.info(RED.log._("server.https.settings-refreshed"));
                  }
                }
              }).catch((err) => {
                logger.error(RED.log._("server.https.refresh-failed", { message: err }));
              });
            } catch (err) {
              logger.error(RED.log._("server.https.refresh-failed", { message: err }));
            }
          }, httpsRefreshInterval * 60 * 60 * 1000);
        } else {
          delayedLogItems.push({ type: "warn", id: "server.https.function-required" });
        }
      } else {
        delayedLogItems.push({ type: "warn", id: "server.https.nodejs-version" });
      }
    }
  } else {
    server = http.createServer((req, res) => { app(req, res); });
  }
  server.setMaxListeners(0);

  function formatRoot(root) {
    if (root[0] != "/") {
      root = `/${root}`;
    }
    if (root.slice(-1) != "/") {
      root += "/";
    }
    return root;
  }

  if (settings.httpRoot === false) {
    settings.httpAdminRoot = false;
    settings.httpNodeRoot = false;
  } else {
    settings.disableEditor = settings.disableEditor || false;
  }

  // settings.httpAdminRoot
  settings.httpAdminRoot = formatRoot(settings.httpAdminRoot || settings.httpRoot || "/");
  settings.httpAdminAuth = settings.httpAdminAuth || settings.httpAuth;

  if (settings.httpNodeRoot !== false) {
    settings.httpNodeRoot = formatRoot(settings.httpNodeRoot || settings.httpRoot || "/");
    settings.httpNodeAuth = settings.httpNodeAuth || settings.httpAuth;
  }

  /* Override settings config using the dojot configuration file schema.
  */
  settings.uiPort = config.flowui.port;
  settings.uiHost = config.flowui.host;
  if (flowFile) {
    settings.flowFile = flowFile;
  }
  if (parsedArgs.userDir) {
    settings.userDir = parsedArgs.userDir;
  }

  try {
    // initializes the Node-RED
    logger.info("Initializing Node-RED.");
    RED.init(server, settings);
  } catch (err) {
    logger.error("Failed to start server:");
    if (err.stack) {
      logger.error(err.stack);
    } else {
      logger.error(err);
    }
    process.exit(1);
  }

  function basicAuthMiddleware(user, pass) {
    const basicAuth = require("basic-auth");
    let checkPassword;
    let localCachedPassword;
    if (pass.length === "32") {
      // Assume its a legacy md5 password
      checkPassword = function (p) {
        return crypto.createHash("md5").update(p, "utf8").digest("hex") === pass;
      };
    } else {
      checkPassword = function (p) {
        return bcrypt.compareSync(p, pass);
      };
    }

    const checkPasswordAndCache = function (p) {
      // For BasicAuth routes we know the password cannot change without
      // a restart of Node-RED. This means we can cache the provided crypted
      // version to save recalculating each time.
      if (localCachedPassword === p) {
        return true;
      }
      const result = checkPassword(p);
      if (result) {
        localCachedPassword = p;
      }
      return result;
    };

    return function (req, res, next) {
      if (req.method === "OPTIONS") {
        return next();
      }
      const requestUser = basicAuth(req);
      if (!requestUser || requestUser.name !== user || !checkPasswordAndCache(requestUser.pass)) {
        res.set("WWW-Authenticate", "Basic realm=\"Authorization Required\"");
        return res.sendStatus(401);
      }
      next();
    };
  }

  /* Setting routes to Express */
  if (settings.httpAdminRoot !== false && settings.httpAdminAuth) {
    logger.info(RED.log._("server.httpadminauth-deprecated"));
    app.use(settings.httpAdminRoot,
      basicAuthMiddleware(settings.httpAdminAuth.user, settings.httpAdminAuth.pass));
  }

  // Setting /nodered endpoint
  app.use(settings.httpAdminRoot, RED.httpAdmin);

  if (settings.httpNodeRoot !== false && settings.httpNodeAuth) {
    app.use(settings.httpNodeRoot,
      basicAuthMiddleware(settings.httpNodeAuth.user, settings.httpNodeAuth.pass));
  }
  if (settings.httpNodeRoot !== false) {
    app.use(settings.httpNodeRoot, RED.httpNode);
  }
  if (settings.httpStatic) {
    settings.httpStaticAuth = settings.httpStaticAuth || settings.httpAuth;
    if (settings.httpStaticAuth) {
      app.use("/", basicAuthMiddleware(settings.httpStaticAuth.user, settings.httpStaticAuth.pass));
    }
    app.use("/", express.static(settings.httpStatic));
  }

  function getListenPath() {
    let port = settings.serverPort;
    if (port === undefined) {
      port = settings.uiPort;
    }

    let listenPath = `http${settings.https ? "s" : ""}://${settings.uiHost === "::" ? "localhost" : (settings.uiHost === "0.0.0.0" ? "127.0.0.1" : settings.uiHost)
      }:${port}`;
    if (settings.httpAdminRoot !== false) {
      listenPath += settings.httpAdminRoot;
    } else if (settings.httpStatic) {
      listenPath += "/";
    }
    return listenPath;
  }

  RED.start().then(() => {
    if (settings.httpAdminRoot !== false
      || settings.httpNodeRoot !== false
      || settings.httpStatic) {
      server.on("error", (err) => {
        if (err.errno === "EADDRINUSE") {
          logger.error(RED.log._("server.unable-to-listen", { listenpath: getListenPath() }));
          logger.error(RED.log._("server.port-in-use"));
        } else {
          logger.error(RED.log._("server.uncaught-exception"));
          if (err.stack) {
            logger.error(err.stack);
          } else {
            logger.error(err);
          }
        }
        process.exit(1);
      });

      // Log all the delayed messages, since they can be translated at this point
      delayedLogItems.forEach((delayedLogItem, index) => {
        RED.log[delayedLogItem.type](RED.log._(delayedLogItem.id, delayedLogItem.params || {}));
      });

      server.listen(settings.uiPort, settings.uiHost, () => {
        if (settings.httpAdminRoot === false) {
          logger.info(RED.log._("server.admin-ui-disabled"));
        }
        settings.serverPort = server.address().port;
        process.title = parsedArgs.title || "node-red";
        logger.info(RED.log._("server.now-running", { listenpath: getListenPath() }));
      });
    } else {
      logger.info(RED.log._("server.headless-mode"));
    }
  }).catch((err) => {
    logger.error(RED.log._("server.failed-to-start"));
    if (err.stack) {
      logger.error(err.stack);
    } else {
      logger.error(err);
    }
  });

  process.on("unhandledRejection", async (reason) => {
    // The 'unhandledRejection' event is emitted whenever a Promise is rejected and
    // no error handler is attached to the promise within a turn of the event loop.
    logger.error(`Unhandled Rejection at: ${reason.stack || reason}.`);

    process.kill(process.pid, "SIGTERM");
  });


  process.on("uncaughtException", async (ex) => {
    // The 'uncaughtException' event is emitted when an uncaught JavaScript
    // exception bubbles all the way back to the event loop.
    logger.error(`uncaughtException: Unhandled Exception at: ${ex.stack || ex}. Bailing out!!`);

    process.kill(process.pid, "SIGTERM");
  });

  let stopping = false;
  function exitWhenStopped() {
    if (!stopping) {
      stopping = true;
      RED.stop().then(() => {
        process.exit();
      });
    }
  }

  process.on("SIGINT", exitWhenStopped);
  process.on("SIGTERM", exitWhenStopped);
  process.on("SIGHUP", exitWhenStopped);
  process.on("SIGUSR2", exitWhenStopped); // for nodemon restart
}).catch((err) => {
  logger.error("Failed to get https settings:");
  logger.error(err.stack || err);
});
