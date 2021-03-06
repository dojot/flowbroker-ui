/* === This is a file from Node-Red being used as-is. === */
/**
 * Copyright JS Foundation and other contributors, http://js.foundation
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * */

/**
 * @mixin @node-red/runtime_context
 */

let runtime;

const { util } = require("@node-red/util");

function exportContextStore(scope, ctx, store, result, callback) {
  ctx.keys(store, (err, keys) => {
    if (err) {
      return callback(err);
    }
    result[store] = {};
    let c = keys.length;
    if (c === 0) {
      callback(null);
    } else {
      keys.forEach((key) => {
        ctx.get(key, store, (err, v) => {
          if (err) {
            return callback(err);
          }
          if (
            scope !== "global" ||
            store === runtime.nodes.listContextStores().default ||
            !runtime.settings.hasOwnProperty("functionGlobalContext") ||
            !runtime.settings.functionGlobalContext.hasOwnProperty(key) ||
            runtime.settings.functionGlobalContext[key] !== v
          ) {
            result[store][key] = util.encodeObject({ msg: v });
          }
          c--;
          if (c === 0) {
            callback(null);
          }
        });
      });
    }
  });
}

const api = (module.exports = {
  init(_runtime) {
    runtime = _runtime;
  },
  /**
   * Gets the info of an individual node set
   * @param {Object} opts
   * @param {User} opts.user - the user calling the api
   * @param {String} opts.scope - the scope of the context
   * @param {String} opts.id - the id of the context
   * @param {String} opts.store - the context store
   * @param {String} opts.key - the context key
   * @param {Object} opts.req - the request to log (optional)
   * @return {Promise} - the node information
   * @memberof @node-red/runtime_context
   */
  async getValue(opts) {
    return new Promise((resolve, reject) => {
      const { scope } = opts;
      const { id } = opts;
      let { store } = opts;
      const { key } = opts;

      const availableStores = runtime.nodes.listContextStores();
      // { default: 'default', stores: [ 'default', 'file' ] }
      if (store && availableStores.stores.indexOf(store) === -1) {
        runtime.log.audit(
          {
            event: "context.get",
            scope,
            id,
            store,
            key,
            error: "not_found",
          },
          opts.req,
        );
        const err = new Error();
        err.code = "not_found";
        err.status = 404;
        return reject(err);
      }
      let ctx;
      if (scope === "global") {
        ctx = runtime.nodes.getContext("global");
      } else if (scope === "flow") {
        ctx = runtime.nodes.getContext(id);
      } else if (scope === "node") {
        const node = runtime.nodes.getNode(id);
        if (node) {
          ctx = node.context();
        }
      }
      if (ctx) {
        if (key) {
          store = store || availableStores.default;
          ctx.get(key, store, (err, v) => {
            const encoded = util.encodeObject({ msg: v });
            if (store !== availableStores.default) {
              encoded.store = store;
            }
            runtime.log.audit(
              {
                event: "context.get",
                scope,
                id,
                store,
                key,
              },
              opts.req,
            );
            resolve(encoded);
          });
        } else {
          let stores;
          if (!store) {
            stores = availableStores.stores;
          } else {
            stores = [store];
          }

          const result = {};
          let c = stores.length;
          let errorReported = false;
          stores.forEach((store) => {
            exportContextStore(scope, ctx, store, result, (err) => {
              if (err) {
                // TODO: proper error reporting
                if (!errorReported) {
                  errorReported = true;
                  runtime.log.audit(
                    {
                      event: "context.get",
                      scope,
                      id,
                      store,
                      key,
                      error: "unexpected_error",
                    },
                    opts.req,
                  );
                  var err = new Error();
                  err.code = "unexpected_error";
                  err.status = 400;
                  return reject(err);
                }

                return;
              }
              c--;
              if (c === 0) {
                if (!errorReported) {
                  runtime.log.audit(
                    {
                      event: "context.get",
                      scope,
                      id,
                      store,
                      key,
                    },
                    opts.req,
                  );
                  resolve(result);
                }
              }
            });
          });
        }
      } else {
        runtime.log.audit(
          {
            event: "context.get",
            scope,
            id,
            store,
            key,
          },
          opts.req,
        );
        resolve({});
      }
    });
  },

  /**
   * Gets the info of an individual node set
   * @param {Object} opts
   * @param {User} opts.user - the user calling the api
   * @param {String} opts.scope - the scope of the context
   * @param {String} opts.id - the id of the context
   * @param {String} opts.store - the context store
   * @param {String} opts.key - the context key
   * @param {Object} opts.req - the request to log (optional)
   * @return {Promise} - the node information
   * @memberof @node-red/runtime_context
   */
  async delete(opts) {
    return new Promise((resolve, reject) => {
      const { scope } = opts;
      const { id } = opts;
      let { store } = opts;
      const { key } = opts;

      const availableStores = runtime.nodes.listContextStores();
      // { default: 'default', stores: [ 'default', 'file' ] }
      if (store && availableStores.stores.indexOf(store) === -1) {
        runtime.log.audit(
          {
            event: "context.get",
            scope,
            id,
            store,
            key,
            error: "not_found",
          },
          opts.req,
        );
        var err = new Error();
        err.code = "not_found";
        err.status = 404;
        return reject(err);
      }
      let ctx;
      if (scope === "global") {
        ctx = runtime.nodes.getContext("global");
      } else if (scope === "flow") {
        ctx = runtime.nodes.getContext(id);
      } else if (scope === "node") {
        const node = runtime.nodes.getNode(id);
        if (node) {
          ctx = node.context();
        }
      }
      if (ctx) {
        if (key) {
          store = store || availableStores.default;
          ctx.set(key, undefined, store, (err) => {
            runtime.log.audit(
              {
                event: "context.delete",
                scope,
                id,
                store,
                key,
              },
              opts.req,
            );
            resolve();
          });
        } else {
          // TODO: support deleting whole context
          runtime.log.audit(
            {
              event: "context.get",
              scope,
              id,
              store,
              key,
              error: "not_found",
            },
            opts.req,
          );
          var err = new Error();
          err.code = "not_found";
          err.status = 404;
          return reject(err);
          // var stores;
          // if (!store) {
          //     stores = availableStores.stores;
          // } else {
          //     stores = [store];
          // }
          //
          // var result = {};
          // var c = stores.length;
          // var errorReported = false;
          // stores.forEach(function(store) {
          //     exportContextStore(scope,ctx,store,result,function(err) {
          //         if (err) {
          //             // TODO: proper error reporting
          //             if (!errorReported) {
          //                 errorReported = true;
          //                 runtime.log.audit({event: "context.delete",scope:scope,id:id,store:store,key:key,error:"unexpected_error"});
          //                 var err = new Error();
          //                 err.code = "unexpected_error";
          //                 err.status = 400;
          //                 return reject(err);
          //             }
          //
          //             return;
          //         }
          //         c--;
          //         if (c === 0) {
          //             if (!errorReported) {
          //                 runtime.log.audit({event: "context.get",scope:scope,id:id,store:store,key:key});
          //                 resolve(result);
          //             }
          //         }
          //     });
          // })
        }
      } else {
        runtime.log.audit(
          {
            event: "context.delete",
            scope,
            id,
            store,
            key,
          },
          opts.req,
        );
        resolve();
      }
    });
  },
});
