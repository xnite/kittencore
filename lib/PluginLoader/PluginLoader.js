var glob = require('glob');
exports.init = function (options = {}) {
    exports.plugin_dir = (options.plugin_dir || process.cwd() + "/plugins/");
    exports.app = options.app;
    exports.config = options.config;
    if (!exports.app) {
        throw "`app` not set!";
    }
    if (!exports.config) {
        throw "`config` not set!";
    }
}

exports.load = function (callback) {
    var app = exports.app;
    var config = exports.config;
    var plugin_dir = exports.plugin_dir;
    glob(plugin_dir + "*", {}, function (err, files) {
        app.core.logger.debug("Discovered " + files.length + " plugins in " + plugin_dir);
        if (err) {
            return callback(err);
        }
        if (!files) {
            return callback("No plugins found!");
        }
        var plugins = {};
        files.forEach(function (file) {
            var tmp = require(file + "/package.json");
            plugins[tmp.name] = require(file + "/" + tmp.main);
            plugins[tmp.name].init({app: app, config: config});
            app.core.logger.debug("Loaded plugin: " + tmp.name + "; Loaded from: " + file + "/" + tmp.main);
        });
        if (!callback) {
            return;
        }
        return callback(null, plugins);
    });
}