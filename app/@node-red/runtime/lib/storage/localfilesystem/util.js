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

const fs = require("fs-extra");
const fspath = require("path");

const { log } = require("@node-red/util");

function parseJSON(data) {
  if (data.charCodeAt(0) === 0xfeff) {
    data = data.slice(1);
  }
  return JSON.parse(data);
}
function readFile(path, backupPath, emptyResponse, type) {
  return new Promise((resolve) => {
    fs.readFile(path, "utf8", (err, data) => {
      if (!err) {
        if (data.length === 0) {
          log.warn(log._("storage.localfilesystem.empty", { type }));
          try {
            const backupStat = fs.statSync(backupPath);
            if (backupStat.size === 0) {
              // Empty flows, empty backup - return empty flow
              return resolve(emptyResponse);
            }
            // Empty flows, restore backup
            log.warn(log._("storage.localfilesystem.restore", { path: backupPath, type }));
            fs.copy(backupPath, path, (backupCopyErr) => {
              if (backupCopyErr) {
                // Restore backup failed
                log.warn(
                  log._("storage.localfilesystem.restore-fail", {
                    message: backupCopyErr.toString(),
                    type,
                  }),
                );
                resolve([]);
              } else {
                // Loop back in to load the restored backup
                resolve(readFile(path, backupPath, emptyResponse, type));
              }
            });
            return;
          } catch (backupStatErr) {
            // Empty flow file, no back-up file
            return resolve(emptyResponse);
          }
        }
        try {
          return resolve(parseJSON(data));
        } catch (parseErr) {
          log.warn(log._("storage.localfilesystem.invalid", { type }));
          return resolve(emptyResponse);
        }
      } else {
        if (type === "flow") {
          log.info(log._("storage.localfilesystem.create", { type }));
        }
        resolve(emptyResponse);
      }
    });
  });
}

module.exports = {
  /**
   * Write content to a file using UTF8 encoding.
   * This forces a fsync before completing to ensure
   * the write hits disk.
   */
  writeFile(path, content, backupPath) {
    let backupPromise;
    if (backupPath && fs.existsSync(path)) {
      backupPromise = fs.copy(path, backupPath);
    } else {
      backupPromise = Promise.resolve();
    }

    const dirname = fspath.dirname(path);
    const tempFile = `${path}.$$$`;

    return backupPromise
      .then(() => {
        if (backupPath) {
          log.trace(`utils.writeFile - copied ${path} TO ${backupPath}`);
        }
        return fs.ensureDir(dirname);
      })
      .then(
        () =>
          new Promise((resolve, reject) => {
            const stream = fs.createWriteStream(tempFile);
            stream.on("open", (fd) => {
              stream.write(content, "utf8", () => {
                fs.fsync(fd, (err) => {
                  if (err) {
                    log.warn(
                      log._("storage.localfilesystem.fsync-fail", {
                        path: tempFile,
                        message: err.toString(),
                      }),
                    );
                  }
                  stream.end(resolve);
                });
              });
            });
            stream.on("error", (err) => {
              log.warn(
                log._("storage.localfilesystem.fsync-fail", {
                  path: tempFile,
                  message: err.toString(),
                }),
              );
              reject(err);
            });
          }),
      )
      .then(() => {
        log.trace(`utils.writeFile - written content to ${tempFile}`);
        return new Promise((resolve, reject) => {
          fs.rename(tempFile, path, (err) => {
            if (err) {
              log.warn(
                log._("storage.localfilesystem.fsync-fail", {
                  path,
                  message: err.toString(),
                }),
              );
              return reject(err);
            }
            log.trace(`utils.writeFile - renamed ${tempFile} to ${path}`);
            resolve();
          });
        });
      });
  },
  readFile,

  parseJSON,
};
