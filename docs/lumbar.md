Thorax Lumbar Plugin
====================

Lumbar allows you to build module based Backbone applications and is included in the [Thorax for Node download](https://github.com/downloads/walmartlabs/thorax/thorax-node.zip). For more information see the [http://walmartlabs.github.com/lumbar] documentation.

## Module methods

Each Lumbar module assumes you will have one router per module, which will have a `module` variable automatically available inside of it. 

### router *module.router(protoProps)*

Declare a router class definition for the module. Routes to match the methods are defined in the `lumbar.json` file. From the Thorax for node `js/routers/hello-world.js` file:

    module.router({
      index: function() {
        var klass = Application.view('hello-world/index');
        var view = new klass();
        Application.setView(view);
      }
    });

A specific `Thorax.Router` or `Thorax.ViewController` instance may also be passed:

    module.router(new Thorax.ViewController({
      index: function() {
        var klass = Application.view('hello-world/index');
        var view = new klass();
        this.setView(view);
      }
    }));
