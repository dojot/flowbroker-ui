const { Logger } = require("@dojot/microservice-sdk");

const logger = new Logger("flowbroker-ui:runtime-storage");

class runtimeCreator {
  constructor(getVersion, adminApi, adminApp, nodeApp, server, started) {
    this.version = getVersion;
    this.adminApi = adminApi;
    this.adminApp = adminApp;
    this.nodeApp = nodeApp;
    this.server = server;
    this.started = started;
    this.libs = {};
  }

  get adminApi() {
    return this.adminApi;
  }

  get adminApp() {
    return this.adminApp;
  }

  get nodeApp() {
    return this.nodeApp;
  }

  get server() {
    return this.server;
  }

  isStarted() {
    return this.started;
  }
  /*
  version,
  log,
  i18n,
  events,
  settings,
  storage,
  hooks,
  nodes,
  plugins,
  flows,
  instanceId,
  tenant,
  library,
  exec,
  util,
  */
}

module.exports = runtimeCreator;
