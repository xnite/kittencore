var minimatch = require("minimatch");
var mongo = require('mongodb');
var MongoClient = require('mongodb').MongoClient;
var bcrypt = require('bcrypt');
var allPermissions = {};

exports.cache = {};
function getDB(dbOptions = {}, callback)
{
    if (!callback) {
        throw "No callback provided";
    }
    switch(dbOptions.driver)
    {
        case "mongodb":
            MongoClient.connect("mongodb+srv://" + dbOptions.username + ":" + dbOptions.password +"@"+ dbOptions.hostname+"/"+dbOptions.database + "?ssl=" + (dbOptions.ssl||'false'), {useUnifiedTopology: true}, function (err, db) {
                if( err )
                {
                    throw err;
                }
                return callback(null, db.db(dbOptions.database).collection(dbOptions.collection));
            });
            break;
        default:
            return callback("Invalid, or no, users database driver specified!");
    }
}

exports.registerPermission = function(permission, callback)
{
    allPermissions[permission.getNode()] = permission;
}

exports.getPermission = function(permission, callback)
{
    var thePerm = allPermissions[permission];
    if(!thePerm)
    {
        if(callback)
        {
            return callback("No such permission");
        }
        return;
    }
    if(callback)
    {
        return callback(null, thePerm);
    }
    return thePerm;
}

exports.getPermissionsList = function(callback)
{
    if(!allPermissions)
    {
        if(callback)
        {
            return callback("Permissions cannot be found");
        }
        return;
    }
    if(callback)
    {
        return callback(null, allPermissions);
    }
    return allPermissions;
}

exports.init = function(options = {}, callback)
{
    exports.app = options.app;
    exports.config = options.config;
    exports.logger = options.app.core.logger;
    getDB(exports.config.dataSources.groups, function(err, dbc){
        if(err)
        {
            throw err;
        }
        exports.groupsCollection = dbc;
        return callback();
    });
    /*getDB(exports.config.dataSources.permissions, function(err, dbc){
        if(err)
        {
            throw err;
        }
        exports.permissionsCollection = dbc;
        return callback();
    });*/
}

exports.compareUserPermissions = function(username, permission, callback)
{
    var Users = exports.app.core.Users.collection;
    Users.findOne({ username: username }, function(err, res){
        if(err)
        {
            return callback(err);
        }
        var fin = false;
        if(!res.permissions)
        {
            return callback(null, false);
        }
        res.permissions.some(function(item, index){
            if(minimatch(permission, item))
            {
                fin = true;
                callback(null, true);
                return true;
            }
            return false;
        });
        if(!fin)
        {
            return callback(null, false);
        }
    });
}

exports.compareGroupPermissions = function(group, permission, callback)
{
    exports.groupsCollection.findOne({ username: username }, function(err, res){
        if(err)
        {
            return callback(err);
        }
        var fin = false;
        res.permissions.some(function(item, index){
            if(minimatch(permission, item))
            {
                fin = true;
                callback(null, true);
                return true;
            }
            return false;
        });
        if(!fin)
        {
            return callback(null, false);
        }
    });
}

exports.getUserGroups = function(username, callback)
{

}

exports.checkUserPermissions = function(username, permission, callback)
{
    var fin = false;
    exports.compareUserPermissions(username, permission, function(err, res){
        if(err || !res)
        {
            return callback(err||username + " does not have the permission: " + permission);
        }
        return callback(null, true);
    });
}