const { Logger } = require("@dojot/microservice-sdk");

const axios = require("axios");

const { castFlowsToDojot, castDojotToFlows } = require("./utils");

const { removeFlow, saveFlow, updateFlow } = require("../../services/flows.service");

/**
 * Class representing a DojotHandler.
 * Used to save and load flows of a specified tenant.
 * @class
 */
class DojotHandler {
  /**
   * Creates a MQTTClient
   *
   * @param {String} configs.flow.user User to login in Dojot
   * @param {String} configs.flow.password Password to login in Dojot
   * @param {String} configs.flow.url Flow service URL
   * @param {String} configs.auth.url Auth service URL
   *
   * @constructor
   */
  constructor(configs, tenantName) {
    this.tenant = tenantName;
    this.logger = new Logger("flowbroker-ui:DojotHandler");
    this.configs = configs;
    this.user = `${configs.flow.userRadix}_${tenantName}`;
    this.password = configs.flow.password;
    // this. auxiliarStorage is used as a helper for the
    // tenant-specific storage, storing the previus state of the flows
    // received from Dojot
    this.auxiliarStorage = {};
  }

  /**
   * Inits the DojotHandler, requesting a valid Token for the
   *  passed user/pass.
   *
   *  @throws Will throw an error if cannot retrieve a Default Token
   */
  async init() {
    try {
      this.logger.info("Requesting Default User Token to Dojot.", {
        rid: `tenant/${this.tenant}`,
      });
      const res = await axios.post(
        this.configs.auth.url,
        { username: this.user, passwd: this.password },
        { accept: "application/json" },
      );
      this.logger.debug(`Token was received. Using ${res.data.jwt}`, {
        rid: `tenant/${this.tenant}`,
      });

      this.defaultHeader = {
        accept: "application/json",
        headers: { Authorization: `Bearer ${res.data.jwt}` },
      };
    } catch (err) {
      this.logger.error(`init - Requesting error: ${err.toString()}`);
    }
  }

  /**
   * Gets the flows from Dojot.
   * We need to return the data as a promise following the Storage Interface.
   */
  getFlows() {
    this.logger.info("Requesting Flows from Dojot.", {
      rid: `tenant/${this.tenant}`,
    });
    return new Promise((resolve, reject) => {
      axios
        .get(this.configs.flow.url, this.defaultHeader)
        .then((response) => {
          const dataReceived = castDojotToFlows(this.auxiliarStorage, response.data.flows);

          this.logger.info(
            `Received ${dataReceived.filter((data) => data.type === "tab").length} flows. `,
            {
              rid: `tenant/${this.tenant}`,
            },
          );
          resolve(dataReceived);
        })
        .catch((err) => {
          this.logger.error(`getFlows - Requesting error: ${err.toString()}`, {
            rid: `tenant/${this.tenant}`,
          });
          reject(err.toString());
        });
    });
  }

  /**
   * Saves flows in Dojot.
   * To attempt it, we should uses the JWT Token sent by the requester.
   *
   * @param {array{object}} flows A list of Dojot flows
   * @return {array{object}} After resolves all promises, return this array.
   */
  saveFlows(flows, user) {
    this.logger.info(`Saving Flows to Dojot with Token: ${user.token}`, {
      rid: `tenant/${this.tenant}`,
    });
    // 1. Create an object complaince with Dojot endpoints
    const dojotFlows = castFlowsToDojot(this.auxiliarStorage, flows);
    const promisesFlows = [];

    // 2. Create configuration to be used with the Requester Token
    const headers = {
      accept: "application/json",
      headers: { Authorization: `Bearer ${user.token}` },
    };

    dojotFlows.forEach((flow) => {
      // Some flows should be deleted...
      if (flow.shouldBeDeleted) {
        promisesFlows.push(removeFlow(flow, headers, this.tenant));
        return;
      }
      if (flow.isNew) {
        // ... others created...
        promisesFlows.push(saveFlow(flow, headers, this.tenant));
      } else {
        // ... or updated.
        promisesFlows.push(updateFlow(flow, headers, this.tenant));
      }
    });
    return Promise.all(promisesFlows);
  }
}

module.exports = DojotHandler;
