var winston = require('winston');
exports.logger = winston.createLogger({ format: winston.format.simple() });
exports.validator = require('validator');
exports.MySQL = require('./lib/MySQL/mysql.js');
exports.Classes = require('./lib/Classes/Classes.js');
exports.WebAPIServer = require('./lib/WebAPIServer/WebAPIServer.js');
exports.WebFEServer = require('./lib/WebFEServer/WebFEServer.js');
exports.PluginLoader = require('./lib/PluginLoader/PluginLoader.js');
exports.Users = require("./lib/Users/Users.js");
exports.Permissions = require('./lib/Permissions/Permissions.js');