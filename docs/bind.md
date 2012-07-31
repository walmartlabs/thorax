Thorax Bind Plugin
==================

## View Helpers

### bind *{{#bind "methodName"}}*

Standalone usage:

    new Thorax.View({
      template: '{{bind "counter"}}',
      i: 0,
      counter: function(i) {
        if (arguments.length === 1) {
          this.i = i;
        }
        return this.i;
      }
    });

Fine grain render control with a model:

    var view = new Thorax.View({
      template: '<div>{{bind "key" tag="span"}}</div>'
    });
    var model = new Backbone.Model({
      key: 'value'
    });
    view.setModel(model, {
      render: false,
      watch: ['key']
    });
    view.render();
    //will not re-render
    model.set({anotherKey: 'value'});
    //will only update the generated span
    model.set({key: 'new value'});
    
### bindAttr *{{bindAttr attrName="methodName"}}*
