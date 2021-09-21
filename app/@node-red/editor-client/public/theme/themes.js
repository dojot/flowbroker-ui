module.exports = function () {
  RED.plugins.registerPlugin("midnight-red", {
    type: "node-red-theme",
    css: [
      "themes.min.css",
    ]
  });
};
