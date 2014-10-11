#!/usr/bin/env node

var Suites = require('./suite');
var suites = new Suites();

suites.add('View creation', {
  setup: function() {
    var ChildView = Thorax.View.extend({
      events: {
        'baz': function() {}
      }
    });
    ChildView.on({
      model: {
        'bar': function() {}
      },
      'foo': function() {
      },
      'bar': function() {
      },
      'nested click': function() {
      }
    });
    var SubChildView = ChildView.extend({
      events: {
        'baz': function() {}
      }
    });
    SubChildView.on({
      'foo': function() {
      },
      'bar': function() {
      }
    });
  },
  test: function() {
    new SubChildView();
  }
});
suites.add('setModel', {
  setup: function() {
    var View = Thorax.View.extend({
      events: {
        model: {
          foo: function() {}
        }
      }
    });

    var ChildModel = Thorax.Model.extend({});
    var SubChildModel = ChildModel.extend({});

    var view = new View({
    });
  },
  test: function() {
    var model = new SubChildModel()
    view.setModel(model);
    view.setModel(false);
  }
});

suites.add('Collection Render', {
  setup: function() {
    var collection = new Thorax.Collection([{id: 1}, {id: 2}, {id: 3}, {id: 4}, {id: 5}, {id: 6}]);
    var View = Thorax.View.extend({
      template: Handlebars.compile('{{collection}}'),
      itemTemplate: Handlebars.compile('<div>{{id}}</div')
    });
  },
  test: function() {
    var view = new View({collection: collection});
    view.render();
  }
});

suites.add('Layout', {
  setup: function() {
    var layout = new Thorax.LayoutView();

    var ChildView = Thorax.View.extend({});
    ChildView.on({
      'foo': function() {
      },
      'bar': function() {
      },
      'nested click': function() {
      },
      'activated': function() {
      }
    });
  },
  test: function() {
    var childView1 = new ChildView(),
        childView2 = new ChildView();

    layout.setView(childView1);
    layout.setView(childView2);
    layout.setView();
  }
});
suites.add('Render', {
  setup: function() {
    var view = new Thorax.View({
      template: Handlebars.compile('foo<div>{{bar}}</div>'),
      model: new Thorax.Model({foo: 'bar', baz: 'bat'}),

      bar: 'baz'
    });
    view.render();
  },
  test: function() {
    view.render();
  }
});
suites.add('Children rendering', {
  setup: function() {
    var parentTemplate = Handlebars.compile('foo{{view child1}}<div><div><div><div><div><div>{{view child2}}</div></div></div></div></div></div>');
  },
  test: function() {
    var parent = new Thorax.View({
      template: parentTemplate,

      child1: new Thorax.View({template: function() { return 'foo'; }}),
      child2: new Thorax.View({template: function() { return 'foo'; }})
    });

    parent.render();
    parent.release();
  }
});
suites.add('Children destroy', {
  test: function() {
    var parent = new Thorax.View({
      child1: new Thorax.View(),
      child2: new Thorax.View()
    });

    parent._addChild(parent.child1);
    parent._addChild(parent.child2);
    parent.release();
  }
});

suites.add('url helper', {
  test: function() {
    Handlebars.helpers.url('foo', 'bar', 'baz', 'bat', {});
    Handlebars.helpers.url('/foo/bar/baz/bat', {});
  }
});

suites.add('template helper', {
  setup: function() {
    var template = Handlebars.compile('{{template "foo"}}');
    var block = Handlebars.compile('{{#template "foo" foo=true}}bar{{/template}}');
    Handlebars.templates.foo = Handlebars.compile('foo');

    var view = new Thorax.View();
    view.foo = 'bar';
  },
  test: function() {
    view.template = template;
    view.render();

    view.template = block;
    view.render();
  }
});

suites.add('uniqueId', {
  test: function() {
    _.uniqueId();
  }
});
