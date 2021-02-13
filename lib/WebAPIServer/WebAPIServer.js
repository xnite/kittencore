var express = require('express');
var Sqrl = require("squirrelly")
var bodyParser = require('body-parser')
var session = require('express-session')

exports.init = function (options = {}, callback) {
    exports.config = {
        listener: {
            address: (options.config.listen_address || '127.0.0.1'),
            port: (options.config.listen_port || 8000)
        },
        secret: options.config.session.secret,
        secure_cookies: options.config.session.secure_cookies,
        engine: (options.config.engine || 'KittenCore')
    }
    exports.app = options.app;
    var app = exports.app;
    var config = exports.config;

    if(!exports.app.webServer)
    {
        exports.app.webServer = new express();
        exports.app.webServer.use(function(req,res,next){
            req.app = exports.app;
            req.config = options.full_config;
            next();
        });
        return exports.app.webServer.listen(exports.config.listener.port, function () {
            exports.init_use();
            app.core.logger.info("WebAPIServer started on port: " + config.listener.port);
            if(callback)
            {
                return callback(null, "WebAPIServer started");
            }
            return;
        });
    }
    return exports.init_use();
}

exports.init_use = function()
{
    if(exports.app.webServer)
    {
        exports.app.webServer.use(bodyParser.urlencoded({limit: "100mb"}));
        exports.app.webServer.set('trust proxy', 1);
        exports.app.webServer.use(session({
            secret: exports.config.secret,
            resave: true,
            saveUninitialized: true,
            cookie: { secure: exports.config.secure_cookies }
        }));

        exports.app.webServer.use(function(req,res,next){
            res.setHeader('X-Powered-By', exports.config.engine);
            res.setHeader('engine', exports.config.engine);
            res.JSONReply = function(error, replyData)
            {
                res.setHeader('content-type', "application/json");
                if(error)
                {
                    res.status((error.status_code||500));
                    return res.end(JSON.stringify(error, null, 4));
                }
                return res.end(JSON.stringify((replyData.output||replyData), null, 4));
            }
            next();
        })
    }
}

exports.createEndpoint = function (endpoint, callback) {
    var version = endpoint.getVersion();
    switch(version)
    {
        case "WebAPIEndpoint_v1":
            var path = endpoint.getPath();
            var method = endpoint.getMethod();
            var cb = endpoint.getCallback({app: exports.app, config: exports.config});
            if (!path) {
                if (!callback) {
                    throw "No path provided";
                }
                callback("No path provided");
            }
            exports.app.webServer[(method || 'all')]("/api/v1/" + path, cb);
            break;
        default:
            if(!callback)
            {
                throw "No or invalid version specified. Are you extending the correct class?";
            }
            return callback("No or invalid version specified. Are you extending the correct class?");
    }
}

exports.init_plugins = function (options = {}, callback) {
    if (!options.plugins && (!exports.app || !exports.app.plugins)) {
        if (!callback) {
            throw "Can't load WebAPIServer plugins because the app is missing!";
        }
        return callback("Can't load WebAPIServer plugins because the app is missing!");
    }
    var plugins = (options.plugins || exports.app.plugins);
    Object.keys(plugins).forEach(function (keyName) {
        var plugin = plugins[keyName];
        if (plugin && plugin.WebAPIServer && plugin.WebAPIServer.hooks) {
            plugin.WebAPIServer.hooks.forEach(function (hookClass) {
                var hook = new hookClass({app: exports.app, config: exports.config});
                exports.createEndpoint(hook, function(err, res){
                    if(err)
                    {
                        return exports.app.core.logger.error(err);
                    }
                    return exports.app.core.logger.debug(res);
                });
            });
            callback(null, "Loaded " + Object.keys(plugin.WebAPIServer.hooks).length + " hooks.");
        }
    });
}