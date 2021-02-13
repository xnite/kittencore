var mysql = require('mysql');
exports.connect = function(options = {}, callback)
{
    try
    {
        exports.pool  = mysql.createPool({
            connectionLimit : 100,
            host            : options.hostname,
            user            : options.username,
            password        : options.password,
            database        : options.database
        });
    } catch(ex) {
        return callback(ex);
    }
    return callback(null, true);
}