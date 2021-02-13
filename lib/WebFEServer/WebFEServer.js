var Sqrl = require("squirrelly")
var express = require('express');
var fs = require('fs');
var tidy = require('htmltidy2').tidy;
var session = require('express-session')

exports.init = function(options, callback)
{
    exports.config = {
        listener: {
            address: (options.config.listen_address || '127.0.0.1'),
            port: (options.config.listen_port || 8001)
        },
        secret: options.config.session.secret,
        secure_cookies: options.config.session.secure_cookies,
        engine: (options.config.engine || 'KittenCore')
    }
    exports.app = options.app;

    var app = exports.app;
    var config = exports.config;

    exports.Theme = require(process.cwd() + "/themes/" + (exports.config.theme||'default') + "/index.js");
    exports.Theme.load({ app: app, config: config})

    Sqrl.filters.define("default", function(str1, str2){
        if(!str1)
        {
            return str2;
        }
        return str1;
    });

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
            app.core.logger.info("WebFEServer started on port: " + config.listener.port);
            if(callback)
            {
                callback(null, "WebFEServer started")
            }
        });
    }
    return exports.init_use();
}

exports.bindAssets = function(assetsDirectory, webPath)
{
    return exports.app.webServer.use((webPath||'/assets'), express.static(assetsDirectory));
}

exports.init_use = function()
{
    if(exports.app.webServer)
    {
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
            res.HTMLReply = function(error, replyData)
            {
                res.setHeader('content-type', "text/html");
                if(error)
                {
                    res.status((error.status_code||500));
                    return res.end(JSON.stringify(error, null, 4));
                }
                Sqrl.templates.define('content', Sqrl.compile(replyData.content));
                var page = {
                    title: replyData.title,
                    description: replyData.description
                };
                res.status(replyData.status_code||200);
                return tidy(Sqrl.render(fs.readFileSync( process.cwd() + "/themes/" + (exports.config.theme||'default') + "/layouts/" + (replyData.layout||exports.Theme.defaults.layout) + ".html").toString(), { app: exports.app, config: exports.config, page: (replyData.it||{}), User: (req.session.User||null), Session: (req.session||null) }), { hideComments: true, indent: true }, function(err, html){
                    if(err)
                    {
                        return res.end(err);
                    }
                    return res.end(html);
                });
            }
            next();
        })
    }
}

exports.createPage = function (page, callback) {
    var version = page.getVersion();
    switch(version)
    {
        case "WebPage_v1":
            var path = page.getPath();
            var method = page.getMethod();
            var meta = {
                title: page.getTitle(),
                description: page.getDescription()
            }
            var includes = {
                head_scripts: page.getHeaderScripts(),
                foot_scripts: page.getFooterScripts(),
                head_styles: page.getHeaderStyles(),
                foot_styles: page.getFooterStyles()
            }
            var cb = page.getCallback();
            if (!path) {
                if (!callback) {
                    throw "No path provided";
                }
                callback("No path provided");
            }
            var required_permissions = page.getPermissionRequirements();
            exports.app.webServer[(method || 'get')]("/" + path, function(req,res){
                if(!required_permissions || required_permissions.length <= 0)
                {
                    return res.HTMLReply(null, { content: page.getContent(), it: { title: page.getTitle(), description: page.getDescription(), includes: includes }});
                }
                if(required_permissions.length >= 1 && (!req.session || !req.session.User))
                {
                    return res.HTMLReply(null, { status_code: 401, content: "You are forbidden from accessing this page. Please make sure that you are logged in and have the correct authorization.", it: { title: "Forbidden!", description: "This page is forbidden!", includes: includes }});
                }
                var theUser = req.session.User;
                var Permissions = exports.app.core.Permissions;
                function run(index)
                {
                    Permissions.checkUserPermissions(theUser.username, required_permissions[index], function(err, result){
                        var thePerm = required_permissions[index];
                        if(result)
                        {
                            return res.HTMLReply(null, { content: page.getContent(), it: { title: page.getTitle(), description: page.getDescription(), includes: includes }});
                        }
                        if(!thePerm)
                        {
                            return res.HTMLReply(null, { status_code: 401, content: "You are forbidden from accessing this page. Please make sure that you are logged in and have the correct authorization.", it: { title: "Forbidden!", description: "This page is forbidden!", includes: includes }});
                        }
                        return run((index+1));
                    });
                }
                run(0);
            });
            break;
        default:
            if(!callback)
            {
                throw "No or invalid version specified. Are you extending the correct class?";
            }
            return callback("No or invalid version specified. Are you extending the correct class?");
    }
}

exports.registerInclude = function(options = {}, callback)
{
    if(!options.name)
    {
        return callback("Give your partial a name");
    }
    if(!options.html)
    {
        return callback("Provide html content for your partial");
    }
    Sqrl.templates.define(options.name, Sqrl.compile(options.html));
    if(callback)
    {
        return callback(null, "Created partial named: " + options.name);
    }
    return true;
}

exports.init_plugins = function (options = {}, callback) {
    if (!options.plugins && (!exports.app || !exports.app.plugins)) {
        if (!callback) {
            throw "Can't load WebFEServer plugins because the app is missing!";
        }
        return callback("Can't load WebFEServer plugins because the app is missing!");
    }
    var plugins = (options.plugins || exports.app.plugins);
    Object.keys(plugins).forEach(function (keyName) {
        var plugin = plugins[keyName];
        if (plugin && plugin.WebFEServer && plugin.WebFEServer.pages) {
            plugin.WebFEServer.pages.forEach(function (pageClass) {
                var page = new pageClass({app: exports.app, config: exports.config});
                exports.createPage(page, function(err, res){
                    if(err)
                    {
                        return exports.app.core.logger.error(err);
                    }
                    return exports.app.core.logger.debug(res);
                });
            });
            callback(null, "Loaded " + Object.keys(plugin.WebFEServer.pages).length + " pages.");
        }
    });
}