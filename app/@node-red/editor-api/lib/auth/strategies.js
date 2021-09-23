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

const BearerStrategy = require("passport-http-bearer").Strategy;
const ClientPasswordStrategy = require("passport-oauth2-client-password").Strategy;

const passport = require("passport");
const crypto = require("crypto");
const util = require("util");

const { log } = require("@node-red/util"); // TODO: separate module
const Tokens = require("./tokens");
const Users = require("./users");
const Clients = require("./clients");
const permissions = require("./permissions");


const bearerStrategy = function (accessToken, done) {
  // is this a valid token?
  Tokens.get(accessToken).then((token) => {
    if (token) {
      Users.get(token.user).then((user) => {
        if (user) {
          done(null, user, { scope: token.scope });
        } else {
          log.audit({ event: "auth.invalid-token" });
          done(null, false);
        }
      });
    } else {
      log.audit({ event: "auth.invalid-token" });
      done(null, false);
    }
  });
};
bearerStrategy.BearerStrategy = new BearerStrategy(bearerStrategy);

const clientPasswordStrategy = function (clientId, clientSecret, done) {
  Clients.get(clientId).then((client) => {
    if (client && client.secret == clientSecret) {
      done(null, client);
    } else {
      log.audit({ event: "auth.invalid-client", client: clientId });
      done(null, false);
    }
  });
};
clientPasswordStrategy.ClientPasswordStrategy = new ClientPasswordStrategy(clientPasswordStrategy);

let loginAttempts = [];
const loginSignInWindow = 600000; // 10 minutes


const passwordTokenExchange = function (client, username, password, scope, done) {
  const now = Date.now();
  loginAttempts = loginAttempts.filter((logEntry) => logEntry.time + loginSignInWindow > now);
  loginAttempts.push({ time: now, user: username });
  let attemptCount = 0;
  loginAttempts.forEach((logEntry) => {
    /* istanbul ignore else */
    if (logEntry.user == username) {
      attemptCount++;
    }
  });
  if (attemptCount > 5) {
    log.audit({ event: "auth.login.fail.too-many-attempts", username, client: client.id });
    done(new Error("Too many login attempts. Wait 10 minutes and try again"), false);
    return;
  }

  Users.authenticate(username, password).then((user) => {
    if (user) {
      if (scope === "") {
        scope = user.permissions;
      }
      if (permissions.hasPermission(user.permissions, scope)) {
        loginAttempts = loginAttempts.filter((logEntry) => logEntry.user !== username);
        Tokens.create(username, client.id, scope).then((tokens) => {
          log.audit({
            event: "auth.login", username, client: client.id, scope
          });
          done(null, tokens.accessToken, null, { expires_in: tokens.expires_in });
        });
      } else {
        log.audit({
          event: "auth.login.fail.permissions", username, client: client.id, scope
        });
        done(null, false);
      }
    } else {
      log.audit({
        event: "auth.login.fail.credentials", username, client: client.id, scope
      });
      done(null, false);
    }
  });
};

function AnonymousStrategy() {
  passport.Strategy.call(this);
  this.name = "anon";
}
util.inherits(AnonymousStrategy, passport.Strategy);
AnonymousStrategy.prototype.authenticate = function (req) {
  const self = this;
  Users.default().then((anon) => {
    if (anon) {
      self.success(anon, { scope: anon.permissions });
    } else {
      self.fail(401);
    }
  });
};


function authenticateUserToken(req) {
  return new Promise((resolve, reject) => {
    let token = null;
    const tokenHeader = Users.tokenHeader();
    if (Users.tokenHeader() === null) {
      // No custom user token provided. Fail the request
      reject();
      return;
    } if (Users.tokenHeader() === "authorization") {
      if (req.headers.authorization && req.headers.authorization.split(" ")[0] === "Bearer") {
        token = req.headers.authorization.split(" ")[1];
      }
    } else {
      token = req.headers[Users.tokenHeader()];
    }
    if (token) {
      Users.tokens(token).then((user) => {
        if (user) {
          resolve(user);
        } else {
          reject();
        }
      });
    } else {
      reject();
    }
  });
}


function TokensStrategy() {
  passport.Strategy.call(this);
  this.name = "tokens";
}
util.inherits(TokensStrategy, passport.Strategy);
TokensStrategy.prototype.authenticate = function (req) {
  authenticateUserToken(req).then((user) => {
    this.success(user, { scope: user.permissions });
  }).catch((err) => {
    this.fail(401);
  });
};


module.exports = {
  bearerStrategy,
  clientPasswordStrategy,
  passwordTokenExchange,
  anonymousStrategy: new AnonymousStrategy(),
  tokensStrategy: new TokensStrategy(),
  authenticateUserToken
};
