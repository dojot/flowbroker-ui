const importFresh = require("import-fresh");

const { v4: uuidv4 } = require("uuid");

const RED = importFresh("./modules/RED/lib-red");

const cloneDeep = require("lodash.clonedeep");

/**
 * A Factory to build Node-RED Applications
 */
class RedFactory {
  constructor(stateManager, logger) {
    this.stateManager = stateManager;
    this.logger = logger;
  }

  /* Create a new Node-RED Application
   */
  create(tenant) {
    let redInstance = null;
    try {
      // Creating a new instance
      // redInstance = cloneDeep(RED);
      redInstance = Object.assign(RED, {});

      // Setting static configuration
      const instanceId = uuidv4();
      redInstance.instanceId = instanceId;
      redInstance.tenant = tenant;

      this.stateManager.registerService(`RED-instance-${tenant}`);
    } catch (err) {
      this.logger.error("Failed to start server:");
      this.logger.error(err.stack || err);
      process.exit(1);
    }
    return redInstance;
  }
}

module.exports = { RedFactory };
