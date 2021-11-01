const { Logger, ConfigManager } = require("@dojot/microservice-sdk");

const { unflatten } = require("flat");

const logger = new Logger("flowbroker-ui:main-storage");

const DojotHandler = require("../modules/dojot/DojotHandler");

const config = unflatten(ConfigManager.getConfig("FLOWBROKER-UI"));

let _tenants = {};
const _flowsData = {};
const _wsConns = {};

class MainStorage {
  /**
   * The methods belows are used when WebSocket emmited the connection
   * request for a goiven tenant.
   *
   * @param {string} tenantpath Unique ID for the tenant channel
   */
  static isTenantConnected(tenantpath) {
    return _wsConns[tenantpath];
  }

  static setConnected(tenantpath) {
    logger.debug(`Websocket emits connection to client: ${tenantpath}`);
    _wsConns[tenantpath] = true;
  }

  static closeConnection(tenantpath) {
    logger.debug("Connection with client was closed.");
    _wsConns[tenantpath] = false;
  }

  get webSocketServer() {
    return this._webSocketServer;
  }

  set webSocketServer(_ws) {
    logger.debug("The webSocketServer was added.");
    this._webSocketServer = _ws;
  }

  /**
   * Storing the RED instance by tenant
   *
   *  @param {String} tenantName alias for the referral tenant
   *  @param {node-Red} instance instance of a Node-RED application
   */
  static setInstance(tenantName, instance) {
    _tenants[tenantName].redInstance = instance;
  }

  /**
   * Get a list of Tenants
   *
   * @returns {Array<String>} List of all Tenants instantiated.
   */
  static getTenants() {
    return Object.keys(_tenants);
  }

  static newTenant(tenantName) {
    // @TODO this could be a class

    // Dojot Handler is responsible for handling Dojot requests.
    const newTenant = {
      storage: "",
      runtime: "",
      httpServer: "",
      setting: "",
      redInstance: "",
      dojotHandler: new DojotHandler(config.dojot, tenantName),
    };
    _tenants[tenantName] = newTenant;
  }

  /**
   * Generic methods to get a property from the given tenant.
   *
   * @returns {Object} Reffered object for this tenant
   */
  static getByTenant(tenantName, prop) {
    logger.debug(`Getting ${prop} for tenant:${tenantName}`);
    if (_tenants) {
      return _tenants[tenantName][prop];
    }
    return null;
  }

  static setByTenant(tenantName, prop, value) {
    logger.debug(`Setting for ${tenantName} prop ${prop} value ${value}`);
    _tenants[tenantName][prop] = value;
  }

  static getStorage() {
    logger.debug("MainStorage's instance was requested.");
    if (!_tenants) {
      _tenants = {};
    }
    return _tenants;
  }
}

module.exports = MainStorage;
