var mongo = require('mongodb');
var MongoClient = require('mongodb').MongoClient;
var bcrypt = require('bcrypt');
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

exports.init = function(options = {}, callback)
{
    exports.app = options.app;
    exports.config = options.config;
    exports.logger = options.app.core.logger;
    var Permissions = options.app.core.Permissions;
    getDB(exports.config.dataSources.users, function(err, dbc){
        if(err)
        {
            throw err;
        }
        exports.collection = dbc;
        Permissions.init({app: options.app, config: options.config}, function(err, res){
            if(err || !res)
            {
                return callback(err||"Permissions came back empty!");
            }
            return callback();
        });
    });
}

exports.getUserByName = function(username, callback)
{
    if (!exports.collection) {
        exports.logger.debug("Didn't have collection, getting collection.");
        return getDB(exports.config.dataSources.users, function(err, dbc){
            if(err)
            {
                throw err;
            }
            exports.collection = dbc;
            return exports.getUserByName(username, callback);
        });
    }
    exports.logger.debug("Looking for user: " + username);
    exports.collection.findOne({ username: username }, function(err, result){
        if(err || !result)
        {
            return callback((err||'No user by that name found'));
        }
        exports.logger.debug("Found user with profile data: " + result);
        exports.cache[result.username.toLowerCase()] = result;
        return callback(null, result);
    });
}

exports.getUserByEmail = function(email, callback)
{
        if (!exports.collection) {
        exports.logger.debug("Didn't have collection, getting collection.");
        return getDB(exports.config.dataSources.users, function(err, dbc){
            if(err)
            {
                throw err;
            }
            exports.collection = dbc;
            return exports.getUserByEmail(email, callback);
        });
    }
    exports.logger.debug("Looking for user with email: " + email);
    exports.collection.findOne({ email: email }, function(err, result){
        if(err || !result)
        {
            return callback((err||'No user found with that email'));
        }
        exports.logger.debug("Found user with profile data: " + result);
        exports.cache[result.username.toLowerCase()] = result;
        return callback(null, result);
    });
}

exports.getCache = function(username, callback) {
    var cache = exports.cache[username.toLowerCase()];
    if(!cache)
    {
        exports.getUserByName(username, function(err, res){
            if(err || !res)
            {
                return callback((err||"Could not locate " + username + " in the database"));
            }
            return exports.getCache(username, callback);
        });
    }
    return callback(null, cache);
}

exports.updateUser = function(username, data, callback)
{
    exports.collection.replaceOne({ _id: data._id }, data, function(err, res){
        if(err)
        {
            return callback(err);
        }
        return callback(null, res);
    });
}

exports.createUser = function(userData, callback)
{
    if(!userData.username||!userData.password||!userData.email)
    {
        return callback("missing key data");
    }
    bcrypt.hash(userData.password, 12, function(err, hash){
        if(err || !hash)
        {
            return callback(err||"Did not get a hash");
        }
        userData.password = hash;
        exports.collection.insertOne(userData, function(err, res){
            if(err||!res)
            {
                return callback(err||'Failed to insert new user into the database. Error unknown');
            }
            return callback(null, res);
        });
    })
}

exports.verifyPassword = function(username, password, callback)
{
    exports.getCache(username, function(err, cache){
        if(err || !cache)
        {
            return callback((err||"Could not find that user!"));
        }
        bcrypt.compare(password, cache.password, function(err, result){
            if(err || !result)
            {
                return callback((err||"Failed to authenticate"));
            }
            return callback(null, true);
        });
    })
}

exports.modifyPassword = function(username, new_password, callback)
{
    exports.getCache(username, function(err, cache){
        if(err || !cache)
        {
            return callback((err||"Could not find that user!"));
        }
        bcrypt.hash(new_password, 12, function(err, hash){
            if(err || !hash)
            {
                return callback((err|"No hash created"));
            }
            cache.password = hash;
            exports.updateUser(username, cache, function(err, res){
                if(err)
                {
                    return callback(err);
                }
                return callback(null, "Password for " + username + " updated.");
            });
        });
    })
}