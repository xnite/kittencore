class Permission {
    constructor(options = {})
    {

    }

    getNode()
    {
        return "permission.node";
    }

    getDescription()
    {
        return "A permission";
    }

    getVersion() {
        return Object.getPrototypeOf(this.constructor).name;
    }

}

exports.getClass = function()
{
    return Permission;
}