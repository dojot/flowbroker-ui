const { Logger } = require("@dojot/microservice-sdk");

const logger = new Logger("flowbroker-ui:main-storage");

let _instance = {};
const _flowsData = {};
const _wsConns = {};

class MainStorage {
  static isTenantConnected(tenantpath) {
    return _wsConns[tenantpath];
  }

  static setConnected(tenantpath) {
    logger.debug(`Websocket emits connection to client: ${tenantpath}`);
    _wsConns[tenantpath] = true;
  }

  static setClosed(tenantpath) {
    logger.debug("Connection with client was closed.");
    _wsConns[tenantpath] = false;
  }

  static newTenant(name) {
    const tenant = {
      storage: "",
      runtime: "",
      httpServer: "",
      setting: "",
      redInstance: "",
    };
    _instance[name] = tenant;
  }

  static getStorage() {
    logger.debug("MainStorage's instance was requested.");
    if (!_instance) {
      _instance = {};
    }
    return _instance;
  }

  static getFlowsData(tenant) {
    return _flowsData[tenant];
  }

  static setFlowsData(tenant, attr, value) {
    if (!_flowsData[tenant]) {
      _flowsData[tenant] = {};
    }
    _flowsData[tenant][attr] = value;
  }

  get webSocketServer() {
    return this._webSocketServer;
  }

  set webSocketServer(_ws) {
    logger.debug("The webSocketServer was added.");
    this._webSocketServer = _ws;
  }

  static getByTenant(tenant, prop) {
    logger.debug(`getByTenant - ${tenant}:${prop}`);
    if (_instance) {
      return _instance[tenant][prop];
    }
    return null;
  }

  static setByTenant(tenant, prop, value) {
    console.log(`Setting for ${tenant} prop ${prop} value ${value}`);
    _instance[tenant][prop] = value;
  }

  /*
    Handle RED instances
  */
  static setInstance(tenant, redInstance) {
    _instance[tenant].redInstance = redInstance;
  }
}

module.exports = MainStorage;
