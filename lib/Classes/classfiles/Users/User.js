exports.Users;
exports.cache = {};
class User {
    constructor(options = {})
    {
        if(!options.UsersLib)
        {
            throw "Must provide UsersLib";
        }
        if(!options.logger)
        {
            throw "No logger defined";
        }
        if(!options.username)
        {
            throw "username not defined";
        }
        this.username = options.username;
        /*this.username = "test";
        this.email = "test@example.com";
        this.password = "Test!123";*/
        exports.logger = options.logger;
        exports.Users = options.UsersLib;
        exports.Users.getUserByName(options.username, function(err, data)
        {
            if(err)
            {
                exports.logger.error(err);
                return false;
            }
            exports.logger.debug("UserData for "+data.username+":\t" + exports.cache[data.username.toLowerCase()]);
            exports.cache[data.username.toLowerCase()] = data;
            return true;
        });
    }

    getCache(username)
    {
        var cache = exports.cache[(username||this.username).toLowerCase()];
        exports.logger.debug("getCache() for " + username + ": " + cache);
        return cache;
    }

    getUsername()
    {
        return (this.getCache().username||null);
    }

    getEmail()
    {
        return (this.getCache().email||null);
    }

    modifyPassword(new_password)
    {
        var cache = this.getCache(this.username);
        var modpw = this.modifyPassword;
        if(!cache) {
            return this.refresh(this.username, function(){
                return modpw(new_password);
            })
        }
        exports.logger.debug("UserCache for " + this.username + ":\t" + cache);
        cache.password = new_password;
        //this.updateUser(username, cache);
    }

    verifyCredentials(password)
    {
        if(!this.cache || !this.cache.password)
        {
            return this.refresh(this.username, function(){
                this.verifyCredentials(password);
            });
        }
        if(password == this.cache.password)
        {
            return true;
        }
        return false;
    }

    refresh(username, callback)
    {
        var dataUsername = this.username;
        exports.Users.getUserByName(username, function(err, data)
        {
            if(err)
            {
                return false;
            }
            dataUsername = data.username;
            if(!callback)
            {
                return callback();
            }
            return true;
        });
    }

}

exports.getClass = function()
{
    return User;
}