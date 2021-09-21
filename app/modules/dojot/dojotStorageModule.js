const { Logger, ConfigManager } = require("@dojot/microservice-sdk");

const { unflatten } = require("flat");

const DojotHandler = require("./DojotHandler");

const config = unflatten(ConfigManager.getConfig("FLOWBROKER-UI"));

/**
 * This module bind the Node-Red's storage schema to Dojot
 * @class
 */
const storageModule = {

  init() {
    if (config.dojot == null || config.dojot.tenant == null) {
      throw new Error("Dojot storage module required parameters are not defined.");
    }
    this.logger = new Logger("flowbroker-ui:storageModule");
    this.dojotHandler = new DojotHandler(config.dojot);
    this.logger.info("Initialized.");
  },
  /**
 * request flows from DojotHandler
 * @returns {Promise.<array>} a list of installed flows on Dojot
 *
 */
  getFlows: function async() {
    return (async () => {
      await this.dojotHandler.init();
      return this.dojotHandler.getFlows();
    })();
  },

  saveFlows(flows) {
    return this.dojotHandler.saveFlows(flows);
  },

  getCredentials() {
    return new Promise((resolve) => {
      resolve({});
    });
  },

  saveCredentials() {
    return Promise.resolve();
  },

  getSettings() {
    return [];
  },
  saveSettings() {
    return [];
  },
  getSessions() {
    return [];
  },
  saveSessions() {
    return [];
  },

  getLibraryEntry() {
    return [];
  },

  saveLibraryEntry() {
    return [];
  }
};

module.exports = storageModule;
