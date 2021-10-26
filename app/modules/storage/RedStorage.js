const { Logger } = require("@dojot/microservice-sdk");

const logger = new Logger("flowbroker-ui:main-storage");

class RedStorage {
  constructor(tenant) {
    logger.debug(`Creating RedStorage for tenant ${tenant}`);
    this._tenant = tenant;
    this._setting = "";
  }

  get tenant() {
    return this._tenant;
  }

  set tenant(val) {
    this._tenant = val;
  }
}

module.exports = RedStorage;
