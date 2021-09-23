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

const should = require("should");
const templateNode = require("nr-test-utils").require("@node-red/nodes/core/function/80-template.js");
const Context = require("nr-test-utils").require("@node-red/runtime/lib/nodes/context");
const helper = require("node-red-node-test-helper");

describe("template node", () => {
  before((done) => {
    helper.startServer(done);
  });

  after((done) => {
    helper.stopServer(done);
  });

  beforeEach((done) => {
    done();
  });

  function initContext(done) {
    Context.init({
      contextStorage: {
        memory0: { // do not use (for excluding effect fallback)
          module: "memory"
        },
        memory1: {
          module: "memory"
        },
        memory2: {
          module: "memory"
        }
      }
    });
    Context.load().then(() => {
      done();
    });
  }

  afterEach(() => {
    helper.unload().then(() => Context.clean({ allNodes: {} })).then(() => Context.close());
  });


  it("should modify payload using node-configured template", (done) => {
    const flow = [{
      id: "n1", type: "template", field: "payload", template: "payload={{payload}}", wires: [["n2"]]
    }, { id: "n2", type: "helper" }];
    helper.load(templateNode, flow, () => {
      const n1 = helper.getNode("n1");
      const n2 = helper.getNode("n2");
      n2.on("input", (msg) => {
        try {
          msg.should.have.property("topic", "bar");
          msg.should.have.property("payload", "payload=foo");
          msg.should.have.property("template", "this should be ignored as the node has its own template {{payload}}");
          done();
        } catch (err) {
          done(err);
        }
      });
      n1.receive({ payload: "foo", topic: "bar", template: "this should be ignored as the node has its own template {{payload}}" });
    });
  });

  it("should modify the configured property using msg.template", (done) => {
    const flow = [{
      id: "n1", type: "template", field: "randomProperty", template: "", wires: [["n2"]]
    }, { id: "n2", type: "helper" }];
    helper.load(templateNode, flow, () => {
      const n1 = helper.getNode("n1");
      const n2 = helper.getNode("n2");
      n2.on("input", (msg) => {
        msg.should.have.property("topic", "bar");
        msg.should.have.property("payload", "foo");
        msg.should.have.property("template", "payload={{payload}}");
        msg.should.have.property("randomProperty", "payload=foo");
        done();
      });
      n1.receive({ payload: "foo", topic: "bar", template: "payload={{payload}}" });
    });
  });

  it("should be able to overwrite msg.template using the template from msg.template", (done) => {
    const flow = [{
      id: "n1", type: "template", field: "payload", template: "", wires: [["n2"]]
    }, { id: "n2", type: "helper" }];
    helper.load(templateNode, flow, () => {
      const n1 = helper.getNode("n1");
      const n2 = helper.getNode("n2");
      n2.on("input", (msg) => {
        msg.should.have.property("topic", "bar");
        msg.should.have.property("payload", "topic=bar");
        msg.should.have.property("template", "topic={{topic}}");
        done();
      });
      n1.receive({ payload: "foo", topic: "bar", template: "topic={{topic}}" });
    });
  });

  it("should modify payload from msg.template", (done) => {
    const flow = [{
      id: "n1", type: "template", field: "payload", template: "", wires: [["n2"]]
    }, { id: "n2", type: "helper" }];
    helper.load(templateNode, flow, () => {
      const n1 = helper.getNode("n1");
      const n2 = helper.getNode("n2");
      const received = [];
      n2.on("input", (msg) => {
        try {
          received.push(msg);
          if (received.length === 3) {
            received[0].should.have.property("topic", "bar");
            received[0].should.have.property("payload", "topic=bar");
            received[0].should.have.property("template", "topic={{topic}}");

            received[1].should.have.property("topic", "another bar");
            received[1].should.have.property("payload", "topic=another bar");
            received[1].should.have.property("template", "topic={{topic}}");

            received[2].should.have.property("topic", "bar");
            received[2].should.have.property("payload", "payload=foo");
            received[2].should.have.property("template", "payload={{payload}}");
            done();
          }
        } catch (err) {
          done(err);
        }
      });
      n1.receive({ payload: "foo", topic: "bar", template: "topic={{topic}}" });
      n1.receive({ payload: "foo", topic: "another bar", template: "topic={{topic}}" });
      n1.receive({ payload: "foo", topic: "bar", template: "payload={{payload}}" });
    });
  });

  it("should modify payload from flow context", (done) => {
    const flow = [{
      id: "n1", z: "t1", type: "template", field: "payload", template: "payload={{flow.value}}", wires: [["n2"]]
    }, { id: "n2", z: "t1", type: "helper" }];
    helper.load(templateNode, flow, () => {
      const n1 = helper.getNode("n1");
      const n2 = helper.getNode("n2");
      n1.context().flow.set("value", "foo");
      n2.on("input", (msg) => {
        msg.should.have.property("topic", "bar");
        msg.should.have.property("payload", "payload=foo");
        done();
      });
      n1.receive({ payload: "foo", topic: "bar" });
    });
  });

  it("should modify payload from persistable flow context", (done) => {
    const flow = [{
      id: "n1", z: "t1", type: "template", field: "payload", template: "payload={{flow[memory1].value}}", wires: [["n2"]]
    }, { id: "n2", z: "t1", type: "helper" }];
    helper.load(templateNode, flow, () => {
      initContext(() => {
        const n1 = helper.getNode("n1");
        const n2 = helper.getNode("n2");
        n2.on("input", (msg) => {
          msg.should.have.property("topic", "bar");
          msg.should.have.property("payload", "payload=foo");
          done();
        });
        n1.context().flow.set("value", "foo", "memory1", (err) => {
          n1.receive({ payload: "foo", topic: "bar" });
        });
      });
    });
  });

  it("should handle nested context tags - property not set", (done) => {
    // This comes from the Coursera Node-RED course and is a good example of
    // multiple conditional tags
    const template = "{{#flow.time}}time={{flow.time}}{{/flow.time}}{{^flow.time}}!time{{/flow.time}}{{#flow.random}}random={{flow.random}}randomtime={{flow.randomtime}}{{/flow.random}}{{^flow.random}}!random{{/flow.random}}";
    const flow = [{
      id: "n1", z: "t1", type: "template", field: "payload", template, wires: [["n2"]]
    }, { id: "n2", z: "t1", type: "helper" }];
    helper.load(templateNode, flow, () => {
      initContext(() => {
        const n1 = helper.getNode("n1");
        const n2 = helper.getNode("n2");
        n2.on("input", (msg) => {
          try {
            msg.should.have.property("topic", "bar");
            msg.should.have.property("payload", "!time!random");
            done();
          } catch (err) {
            done(err);
          }
        });
        n1.receive({ payload: "foo", topic: "bar" });
      });
    });
  });
  it("should handle nested context tags - property set", (done) => {
    // This comes from the Coursera Node-RED course and is a good example of
    // multiple conditional tags
    const template = "{{#flow.time}}time={{flow.time}}{{/flow.time}}{{^flow.time}}!time{{/flow.time}}{{#flow.random}}random={{flow.random}}randomtime={{flow.randomtime}}{{/flow.random}}{{^flow.random}}!random{{/flow.random}}";
    const flow = [{
      id: "n1", z: "t1", type: "template", field: "payload", template, wires: [["n2"]]
    }, { id: "n2", z: "t1", type: "helper" }];
    helper.load(templateNode, flow, () => {
      initContext(() => {
        const n1 = helper.getNode("n1");
        const n2 = helper.getNode("n2");
        n2.on("input", (msg) => {
          try {
            msg.should.have.property("topic", "bar");
            msg.should.have.property("payload", "time=123random=456randomtime=789");
            done();
          } catch (err) {
            done(err);
          }
        });
        n1.context().flow.set(["time", "random", "randomtime"], ["123", "456", "789"], (err) => {
          n1.receive({ payload: "foo", topic: "bar" });
        });
      });
    });
  });

  it("should modify payload from two persistable flow context", (done) => {
    const flow = [{
      id: "n1", z: "t1", type: "template", field: "payload", template: "payload={{flow[memory1].value}}/{{flow[memory2].value}}", wires: [["n2"]]
    }, { id: "n2", z: "t1", type: "helper" }];
    helper.load(templateNode, flow, () => {
      initContext(() => {
        const n1 = helper.getNode("n1");
        const n2 = helper.getNode("n2");
        n2.on("input", (msg) => {
          msg.should.have.property("topic", "bar");
          msg.should.have.property("payload", "payload=foo/bar");
          done();
        });
        n1.context().flow.set("value", "foo", "memory1", (err) => {
          n1.context().flow.set("value", "bar", "memory2", (err) => {
            n1.receive({ payload: "foo", topic: "bar" });
          });
        });
      });
    });
  });

  it("should modify payload from global context", (done) => {
    const flow = [{
      id: "n1", z: "t1", type: "template", field: "payload", template: "payload={{global.value}}", wires: [["n2"]]
    }, { id: "n2", z: "t1", type: "helper" }];
    helper.load(templateNode, flow, () => {
      const n1 = helper.getNode("n1");
      const n2 = helper.getNode("n2");
      n1.context().global.set("value", "foo");
      n2.on("input", (msg) => {
        msg.should.have.property("topic", "bar");
        msg.should.have.property("payload", "payload=foo");
        done();
      });
      n1.receive({ payload: "foo", topic: "bar" });
    });
  });

  it("should modify payload from persistable global context", (done) => {
    const flow = [{
      id: "n1", z: "t1", type: "template", field: "payload", template: "payload={{global[memory1].value}}", wires: [["n2"]]
    }, { id: "n2", z: "t1", type: "helper" }];
    helper.load(templateNode, flow, () => {
      initContext(() => {
        const n1 = helper.getNode("n1");
        const n2 = helper.getNode("n2");
        n2.on("input", (msg) => {
          msg.should.have.property("topic", "bar");
          msg.should.have.property("payload", "payload=foo");
          done();
        });
        n1.context().global.set("value", "foo", "memory1", (err) => {
          n1.receive({ payload: "foo", topic: "bar" });
        });
      });
    });
  });

  it("should modify payload from two persistable global context", (done) => {
    const flow = [{
      id: "n1", z: "t1", type: "template", field: "payload", template: "payload={{global[memory1].value}}/{{global[memory2].value}}", wires: [["n2"]]
    }, { id: "n2", z: "t1", type: "helper" }];
    helper.load(templateNode, flow, () => {
      initContext(() => {
        const n1 = helper.getNode("n1");
        const n2 = helper.getNode("n2");
        n2.on("input", (msg) => {
          msg.should.have.property("topic", "bar");
          msg.should.have.property("payload", "payload=foo/bar");
          done();
        });
        n1.context().global.set("value", "foo", "memory1", (err) => {
          n1.context().global.set("value", "bar", "memory2", (err) => {
            n1.receive({ payload: "foo", topic: "bar" });
          });
        });
      });
    });
  });

  it("should modify payload from persistable flow & global context", (done) => {
    const flow = [{
      id: "n1", z: "t1", type: "template", field: "payload", template: "payload={{flow[memory1].value}}/{{global[memory1].value}}", wires: [["n2"]]
    }, { id: "n2", z: "t1", type: "helper" }];
    helper.load(templateNode, flow, () => {
      initContext(() => {
        const n1 = helper.getNode("n1");
        const n2 = helper.getNode("n2");
        n2.on("input", (msg) => {
          msg.should.have.property("topic", "bar");
          msg.should.have.property("payload", "payload=foo/bar");
          done();
        });
        n1.context().flow.set("value", "foo", "memory1", (err) => {
          n1.context().global.set("value", "bar", "memory1", (err) => {
            n1.receive({ payload: "foo", topic: "bar" });
          });
        });
      });
    });
  });

  it("should handle missing node context", (done) => {
    // this is artificial test because in flow there is missing z property (probably never happen in real usage)
    const flow = [{
      id: "n1", type: "template", field: "payload", template: "payload={{flow.value}},{{global.value}}", wires: [["n2"]]
    }, { id: "n2", type: "helper" }];
    helper.load(templateNode, flow, () => {
      const n1 = helper.getNode("n1");
      const n2 = helper.getNode("n2");
      n2.on("input", (msg) => {
        msg.should.have.property("topic", "bar");
        msg.should.have.property("payload", "payload=,");
        done();
      });
      n1.receive({ payload: "foo", topic: "bar" });
    });
  });

  it("should handle escape characters in Mustache format and JSON output mode", (done) => {
    const flow = [{
      id: "n1", type: "template", field: "payload", syntax: "mustache", template: "{\"data\":\"{{payload}}\"}", output: "json", wires: [["n2"]]
    }, { id: "n2", type: "helper" }];
    helper.load(templateNode, flow, () => {
      const n1 = helper.getNode("n1");
      const n2 = helper.getNode("n2");
      n2.on("input", (msg) => {
        msg.payload.should.have.property("data", "line\t1\nline\\2\r\nline\b3\f");
        done();
      });
      n1.receive({ payload: "line\t1\nline\\2\r\nline\b3\f" });
    });
  });

  it("should modify payload in plain text mode", (done) => {
    const flow = [{
      id: "n1", type: "template", field: "payload", syntax: "plain", template: "payload={{payload}}", wires: [["n2"]]
    }, { id: "n2", type: "helper" }];
    helper.load(templateNode, flow, () => {
      const n1 = helper.getNode("n1");
      const n2 = helper.getNode("n2");
      n2.on("input", (msg) => {
        msg.should.have.property("topic", "bar");
        msg.should.have.property("payload", "payload={{payload}}");
        done();
      });
      n1.receive({ payload: "foo", topic: "bar" });
    });
  });

  it("should modify flow context", (done) => {
    const flow = [{
      id: "n1", z: "t1", type: "template", field: "payload", fieldType: "flow", template: "payload={{payload}}", wires: [["n2"]]
    }, { id: "n2", z: "t1", type: "helper" }];
    helper.load(templateNode, flow, () => {
      const n1 = helper.getNode("n1");
      const n2 = helper.getNode("n2");
      n2.on("input", (msg) => {
        // mesage is intact
        msg.should.have.property("topic", "bar");
        msg.should.have.property("payload", "foo");
        // result is in flow context
        n2.context().flow.get("payload").should.equal("payload=foo");
        done();
      });
      n1.receive({ payload: "foo", topic: "bar" });
    });
  });

  it("should modify persistable flow context", (done) => {
    const flow = [{
      id: "n1", z: "t1", type: "template", field: "#:(memory1)::payload", fieldType: "flow", template: "payload={{payload}}", wires: [["n2"]]
    }, { id: "n2", z: "t1", type: "helper" }];
    helper.load(templateNode, flow, () => {
      initContext(() => {
        const n1 = helper.getNode("n1");
        const n2 = helper.getNode("n2");
        n2.on("input", (msg) => {
          // mesage is intact
          msg.should.have.property("topic", "bar");
          msg.should.have.property("payload", "foo");
          // result is in flow context
          n2.context().flow.get("payload", "memory1", (err, val) => {
            val.should.equal("payload=foo");
            done();
          });
        });
        n1.receive({ payload: "foo", topic: "bar" });
      });
    });
  });

  it("should modify global context", (done) => {
    const flow = [{
      id: "n1", z: "t1", type: "template", field: "payload", fieldType: "global", template: "payload={{payload}}", wires: [["n2"]]
    }, { id: "n2", z: "t1", type: "helper" }];
    helper.load(templateNode, flow, () => {
      const n1 = helper.getNode("n1");
      const n2 = helper.getNode("n2");
      n2.on("input", (msg) => {
        // mesage is intact
        msg.should.have.property("topic", "bar");
        msg.should.have.property("payload", "foo");
        // result is in global context
        n2.context().global.get("payload").should.equal("payload=foo");
        done();
      });
      n1.receive({ payload: "foo", topic: "bar" });
    });
  });

  it("should modify persistable global context", (done) => {
    const flow = [{
      id: "n1", z: "t1", type: "template", field: "#:(memory1)::payload", fieldType: "global", template: "payload={{payload}}", wires: [["n2"]]
    }, { id: "n2", z: "t1", type: "helper" }];
    helper.load(templateNode, flow, () => {
      initContext(() => {
        const n1 = helper.getNode("n1");
        const n2 = helper.getNode("n2");
        n2.on("input", (msg) => {
          // mesage is intact
          msg.should.have.property("topic", "bar");
          msg.should.have.property("payload", "foo");
          // result is in global context
          n2.context().global.get("payload", "memory1", (err, val) => {
            val.should.equal("payload=foo");
            done();
          });
        });
        n1.receive({ payload: "foo", topic: "bar" });
      });
    });
  });

  it("should handle if the field isn't set", (done) => {
    const flow = [{
      id: "n1", type: "template", template: "payload={{payload}}", wires: [["n2"]]
    }, { id: "n2", type: "helper" }];
    helper.load(templateNode, flow, () => {
      const n1 = helper.getNode("n1");
      const n2 = helper.getNode("n2");
      n2.on("input", (msg) => {
        msg.should.have.property("topic", "bar");
        msg.should.have.property("payload", "payload=foo");
        done();
      });
      n1.receive({ payload: "foo", topic: "bar" });
    });
  });

  it("should handle deeper objects", (done) => {
    const flow = [{
      id: "n1", type: "template", field: "topic.foo.bar", template: "payload={{payload.doh.rei.me}}", wires: [["n2"]]
    }, { id: "n2", type: "helper" }];
    helper.load(templateNode, flow, () => {
      const n1 = helper.getNode("n1");
      const n2 = helper.getNode("n2");
      n2.on("input", (msg) => {
        msg.should.have.property("topic");
        msg.topic.should.have.property("foo");
        msg.topic.foo.should.have.a.property("bar", "payload=foo");
        done();
      });
      n1.receive({ payload: { doh: { rei: { me: "foo" } } } });
    });
  });

  it("should handle block contexts objects", (done) => {
    const flow = [{
      id: "n1", type: "template", template: "A{{#payload.A}}{{payload.A}}{{.}}{{/payload.A}}B", wires: [["n2"]]
    }, { id: "n2", type: "helper" }];
    helper.load(templateNode, flow, () => {
      const n1 = helper.getNode("n1");
      const n2 = helper.getNode("n2");
      n2.on("input", (msg) => {
        msg.should.have.property("payload", "AabcabcB");
        done();
      });
      n1.receive({ payload: { A: "abc" } });
    });
  });

  it("should raise error if passed bad template", (done) => {
    const flow = [{
      id: "n1", type: "template", field: "payload", template: "payload={{payload", wires: [["n2"]]
    }, { id: "n2", type: "helper" }];
    helper.load(templateNode, flow, () => {
      const n1 = helper.getNode("n1");
      const n2 = helper.getNode("n2");
      setTimeout(() => {
        const logEvents = helper.log().args.filter((evt) => evt[0].type === "template");
        logEvents.should.have.length(1);
        logEvents[0][0].should.have.a.property("msg");
        logEvents[0][0].msg.toString().should.startWith("Unclosed tag at ");
        done();
      }, 25);
      n1.receive({ payload: "foo" });
    });
  });
});
