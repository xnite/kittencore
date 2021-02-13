class WebPage_v1 {
    constructor(options = {})
    {
        if(!options.app)
        {
            throw "app not defined";
        }
        if(!options.config)
        {
            throw "config not defined";
        }
        this.app = options.app;
        this.config = options.config;
    }

    getHeaderScripts()
    {
        return [];
    }

    getFooterScripts()
    {
        return [];
    }

    getHeaderStyles()
    {
        return [];
    }

    getFooterStyles()
    {
        return [];
    }

    getPath()
    {
        return "hello/world";
    }

    getMethod()
    {
        return "get";
    }

    getCallback()
    {
        return function(req,res) {
            res.reply(null, { message: "Hello world!" });
        }
    }

    getPermissionRequirements()
    {
        return [];
    }

    getVersion() {
        return Object.getPrototypeOf(this.constructor).name;
    }

}

exports.getClass = function()
{
    return WebPage_v1;
}