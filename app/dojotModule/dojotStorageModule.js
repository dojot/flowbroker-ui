const { Logger } = require("@dojot/microservice-sdk");

const DojotHandler = require("./DojotHandler");


/**
 * This module bind the Node-Red's storage schema to Dojot
 * @class
 */
const storageModule = {

  init(_settings) {
    if (_settings.storageModuleOptions == null || _settings.storageModuleOptions.tenant == null) {
      throw new Error("Dojot storage module required parameters are not defined.");
    }
    this.logger = new Logger("flowbroker-ui:storageModule");
    this.dojotHandler = new DojotHandler(_settings.storageModuleOptions);


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
    return new Promise((resolve, reject) => {
      resolve({});
    });
  },

  saveCredentials(credentials) {
    return Promise.resolve();
  },

  getSettings() {
    return [];
  },
  saveSettings(settings) {
    return [];
  },
  getSessions() {
    return [];
  },
  saveSessions(sessions) {
    return [];
  },

  getLibraryEntry(type, path) {
    return [];
  },

  saveLibraryEntry(type, path, meta, body) {
    return [];
  }
};

module.exports = storageModule;
