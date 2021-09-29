const { Logger } = require("@dojot/microservice-sdk");

const axios = require("axios");

const { castFlowsToDojot, castDojotToFlows } = require("./utils");


/**
 * Class representing a DojotHandler
 * @class
 */
class DojotHandler {
  /**
  * Creates a MQTTClient
  *
  * @param {String} configs.user User to login in Dojot
  * @param {String} configs.password Password to login in Dojot
  * @param {String} configs.flow.url Flow service URL
  * @param {String} configs.auth.url Auth service URL
  *
  * @constructor
  */
  constructor(configs) {
    this.tenant = configs.tenant;
    this.logger = new Logger("flowbroker-ui:DojotHandler");
    this.configs = configs;
    this.user = configs.user;
    this.password = configs.password;
  }

  /**
   * Inits the DojotHandler, requesting a valid Token for the
   *  passed user/pass.
   */
  async init() {
    try {
      this.logger.info("Requesting Token to Dojot.");
      const res = await axios.post(this.configs.auth.url,
        { username: this.user, passwd: this.password },
        { accept: "application/json" });
      this.token = res.data.jwt;
      this.logger.debug(`Token was created. Using ${this.token}`);

      this.config = {
        accept: "application/json",
        headers: { Authorization: `Bearer ${this.token}` },
      };
    } catch (err) {
      this.logger.error(`init DojotHandler - Requesting error: ${err.toString()}`);
    }
  }

  /**
   * Gets the flows from Dojot.
   *
   */
  getFlows() {
    this.logger.info("Requesting Flows from Dojot.");
    return new Promise((resolve, reject) => {
      // create and return a promise
      axios.get(this.configs.flow.url, this.config)
        .then((response) => {
          const dataReceived = castDojotToFlows(response.data.flows);
          this.logger.info("Flows received.");
          resolve(dataReceived);
        })
        .catch((err) => {
          this.logger.error(`getFlows DojotHandler - Requesting error: ${err.toString()}`);
          reject(err.toString());
        });
    });
  }


  /**
   * Save flows to Dojot.
   *
   * @param {array{object}} flows A list of Dojot flows
   */
  saveFlows(flows) {
    this.logger.info("Saving Flows to Dojot...");
    // create and return a promise
    const getAllFlows = castFlowsToDojot(flows);
    const promisesFlows = [];
    getAllFlows.forEach((flow) => {
      // remove the "should be deleted" flows
      if (flow.shouldBeDeleted) {
        promisesFlows.push(this.removeFlow(flow));
        return;
      }

      if (flow.isNew) {
        promisesFlows.push(this.saveFlow(flow));
      } else {
        promisesFlows.push(this.updateFlow(flow));
      }
    });
    return Promise.all(promisesFlows);
  }

  /**
 * Remove an flow from Dojot.
 *
 * @param {object} flow The flow to be removed.
 */
  removeFlow(flow) {
    return axios.delete(`${this.configs.flow.url}/${flow.id}`,
      this.config)
      .then(() => {
        this.logger.info(`Flow ${flow.name} successfully removed from Dojot.`);
      })
      .catch((err) => {
        this.logger.error(`removeFlow DojotHandler - Requesting error: ${err.toString()}`);
      });
  }

  /**
   * Save flow to Dojot.
   *
   * @param {object} flow A flow to be saved in Dojot
   */
  saveFlow(flow) {
    return axios.post(this.configs.flow.url,
      flow,
      this.config)
      .then(() => {
        this.logger.info(`Flow ${flow.name} successfully saved to Dojot.`);
      })
      .catch((err) => {
        this.logger.error(`saveFlow DojotHandler - Requesting error: ${err.toString()}`);
      });
  }

  /**
 * Update flow in Dojot.
 *
 * @param {object} flow A flow to be updated in Dojot
 */
  updateFlow(flow) {
    return axios.put(`${this.configs.flow.url}/${flow.id}`,
      flow,
      this.config)
      .then(() => {
        this.logger.info(`Flow ${flow.name} successfully updated in Dojot.`);
      })
      .catch((err) => {
        this.logger.error(`updateFlow DojotHandler - Requesting error: ${err.toString()}`);
      });
  }
}


module.exports = DojotHandler;
