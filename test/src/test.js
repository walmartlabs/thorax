$(function() {
  QUnit.module('Thorax Core');

  Backbone.history = new Backbone.History();
  Backbone.history.start();

  Thorax.template('parent', '<div>{{view child}}</div>');
  Thorax.template('child', '<div>{{value}}</div>');

  test("registry", function() {
    raises(function() {
      Thorax.view('a-name');
    }, 'throws error when view does not exist');
    var viewClass = Thorax.view('a-name', {}, {});
    equal(viewClass.prototype.name, 'a-name', 'sets a name attribute on view class');
    equal((new viewClass).name, 'a-name', 'sets a name attribute on view instance');
    var viewClassB = Thorax.view('b-name', viewClass.extend({
      key: 'value'
    }));
    equal(viewClassB.prototype.key, 'value', 'can accept a class as a value');
    Thorax.view('b-name', viewClass.extend({
      key: 'value2'
    }));
    equal(Thorax.view('b-name').prototype.key, 'value2', 'will overwrite a previous class when passed a new one');
    Thorax.view('a-name', {
      key: 'value'
    });
    equal(Thorax.view('a-name').prototype.key, 'value', 'registry will extend an existing class prototype');

    Thorax.template('test-a', '<p>{{key}}</p>');
    Thorax.template('test-b', Handlebars.compile('<p>{{key}}</p>'));

    equal(Thorax.template('test-a')({key:'value'}), '<p>value</p>', 'will compile a string to a template');
    equal(Thorax.template('test-b')({key:'value'}), '<p>value</p>', 'will accept a template function');

    var instance = new Thorax.View();
    Thorax.view('singleton', instance);
    equal(Thorax.view('singleton'), instance, 'can set singleton');

    //view instance get's name, bad practice, but more predictable
    instance = Thorax.view('test-singleton', new Thorax.View());
    equal(instance.name, 'test-singleton', 'view instance is assigned a name when passed to registry');
  });


  test("shouldFetch", function() {
    var options = {fetch: true};
    var a = new (Thorax.Model.extend());
    ok(!Thorax.Util.shouldFetch(a, options));

    var b = new (Thorax.Model.extend({urlRoot: '/'}));
    ok(!!Thorax.Util.shouldFetch(b, options));

    var c = new (Thorax.Model.extend({urlRoot: '/'}));
    c.set({key: 'value'});
    ok(!Thorax.Util.shouldFetch(c, options));

    var d = new (Thorax.Collection.extend());
    ok(!Thorax.Util.shouldFetch(d, options));

    var e = new (Thorax.Collection.extend({url: '/'}));
    ok(!!Thorax.Util.shouldFetch(e, options));
  });

  test("context may be an object", function() {
    var view = new (Thorax.View.extend({
      context: {
        a: 'a',
        b: 'b',
        c: function() {
          return 'c'
        }
      },
      template: '{{a}}{{b}}{{c}}'
    }));
    view.render();
    equal(view.html(), 'abc');
  });

  test("child views", function() {
    var childRenderedCount = 0,
        parentRenderedCount = 0;
    var Child = Thorax.view('child', {
      initialize: function() {
        this.on('rendered', function() {
          ++childRenderedCount;
        });
      }
    });
    var Parent = Thorax.view('parent', {
      initialize: function() {
        this.on('rendered', function() {
          ++parentRenderedCount;
        });
        this.childModel = new Backbone.Model({
          value: 'a'
        });
        this.child = new (Thorax.view('child'))({
          model: this.childModel
        });
      }
    });
    var parent = new Parent();
    parent.render();
    equal(parent.$('[data-view-name="child"] > div').html(), 'a', 'view embedded');
    equal(parentRenderedCount, 1);
    equal(childRenderedCount, 1);
  
    parent.render();
    equal(parent.$('[data-view-name="child"] > div').html(), 'a', 'view embedded');
    equal(parentRenderedCount, 2, 're-render of parent does not render child');
    equal(childRenderedCount, 1, 're-render of parent does not render child');
  
    parent.childModel.set({value: 'b'});
    equal(parent.$('[data-view-name="child"] > div').html(), 'b', 'view embedded');
    equal(parentRenderedCount, 2, 're-render of child does not parent child');
    equal(childRenderedCount, 2, 're-render of child does not render parent');
  
    //ensure recursion does not happen when child view has the same model
    //as parent
    parent.setModel(parent.childModel);
    parent.model.set({value: 'c'});
    equal(parentRenderedCount, 4);
    equal(childRenderedCount, 3);
  });
  
  test("template function can be specified", function() {
    var childReturningString = new Thorax.View({
      template: function(data) {
        ok(data.cid && data.cid.match(/^t/));
        return 'template';
      }
    });
    childReturningString.render();
    equal(childReturningString.html(), 'template');
    var childReturningElement = new Thorax.View({
      template: function(data) {
        return $('<p>template</p>')[0];
      }
    });
    childReturningElement.render();
    equal(childReturningElement.$('p').html(), 'template');
    var childReturning$ = new Thorax.View({
      template: function(data) {
        return $('<p>template</p>');
      }
    });
    childReturning$.render();
    equal(childReturning$.$('p').html(), 'template');
  });

  test("super helper", function() {
    var parent, child;
    var t = Thorax.template('super-named-test', '<div class="parent"></div>');
    parent = Thorax.view('super-named-test', {});
    child = new (parent.extend({
      template: '<div class="child"></div>{{super}}'
    }));
    child.render();
    equal(child.$('.parent').length, 1);
    equal(child.$('.child').length, 1);

    parent = Thorax.view('super-test', {
      template: '<div class="parent"></div>'
    });
    child = new (parent.extend({
      template: '<div class="child"></div>{{super}}'
    }));
    child.render();
    equal(child.$('.parent').length, 1);
    equal(child.$('.child').length, 1);
  });

  test("element helper", function() {
    var a = document.createElement('li');
    a.innerHTML = 'one';
    var view = new Thorax.View({
      template: '<ul>{{element a tag="li"}}{{element b tag="li"}}{{element c}}{{element d}}</ul>',
      a: a,
      b: function() {
        var li = document.createElement('li');
        li.innerHTML = 'two';
        return li;
      },
      c: function() {
        return $('<li>three</li><li>four</li>')
      },
      d: $('<li>five</li>')
    });
    view.render();
    equal(view.$('li')[0].innerHTML, 'one');
    equal(view.$('li')[1].innerHTML, 'two');
    equal(view.$('li')[2].innerHTML, 'three');
    equal(view.$('li')[3].innerHTML, 'four');
    equal(view.$('li')[4].innerHTML, 'five');
    view.html('');
    equal(view.$('li').length, 0);
    view.render();
    equal(view.$('li')[0].innerHTML, 'one');
    equal(view.$('li')[1].innerHTML, 'two');
    equal(view.$('li')[2].innerHTML, 'three');
    equal(view.$('li')[3].innerHTML, 'four');
    equal(view.$('li')[4].innerHTML, 'five');
  });

  test("local view functions are called in template scope", function() {
    var child = new Thorax.View({
      template: '{{key "value"}}',
      key: function(value) {
        return value;
      }
    });
    child.render();
    equal('value', child.html());
  });

  test("template not found handling", function() {
    var view = new Thorax.View();
    raises(function() {
      view.render();
    });
  });

  test("render() subclassing", function() {
    var a = new Thorax.View({
      render: function() {
        Thorax.View.prototype.render.call(this, '<p>a</p>');
      }
    });
    a.render();

    var b = new Thorax.View({
      render: function() {
        Thorax.View.prototype.render.call(this, $('<p>b</p>'));
      }
    });
    b.render();

    var c = new Thorax.View({
      render: function() {
        var el = document.createElement('p');
        el.innerHTML = 'c';
        Thorax.View.prototype.render.call(this, el);
      }
    });
    c.render();

    var d = new Thorax.View({
      render: function() {
        var view = new Thorax.View({
          render: function() {
            Thorax.View.prototype.render.call(this, '<p>d</p>');
          }
        });
        view.render();
        Thorax.View.prototype.render.call(this, view);
      }
    });
    d.render();

    equal(a._renderCount, 1, '_renderCount incrimented');
    equal(b._renderCount, 1, '_renderCount incrimented');
    equal(c._renderCount, 1, '_renderCount incrimented');
    equal(d._renderCount, 1, '_renderCount incrimented');
    equal(a.$('p').html(), 'a', 'parent render accepts string');
    equal(b.$('p').html(), 'b', 'parent render accepts dom array');
    equal(c.$('p').html(), 'c', 'parent render accepts dom element');
    equal(d.$('p').html(), 'd', 'parent render accepts view');
  });

  test("template passed to constructor and view block", function() {
    var view = new Thorax.View({
      template: '<p>{{key}}</p>',
      key: 'value'
    });
    view.render();
    equal(view.$('p').html(), 'value');

    var view = new (Thorax.View.extend({
      template: '<p>{{key}}</p>',
      key: 'value'
    }));
    view.render();
    equal(view.$('p').html(), 'value');

    var Child = Thorax.View.extend({
      template: '<div class="child-a">{{key}}</div>',
      key: 'value'
    });

    var a = new Child;
    var b = new Child;

    var parent = new Thorax.View({
      template: '<div class="parent">{{#view b}}<div class="child-b">{{key}}</div>{{/view}}{{view a}}</div>',
      a: a,
      b: b
    });
    parent.render();
    equal(parent.$('.child-a').html(), 'value');
    equal(parent.$('.child-b').html(), 'value');

    //ensure that override does not persist to view itself
    b.render();
    equal(b.$('.child-a').html(), 'value');

    //test nesting
    var outer = new Thorax.View({
      template: '<div class="a">{{#view inner}}<div class="b">{{#view child}}<div class="c">value</div>{{/view}}</div>{{/view}}</div>',
      inner: new Thorax.View({
        child: new Thorax.View
      })
    });
    outer.render();
    equal(outer.$('.c').html(), 'value');
  });

  test("nestable scope of view helper", function() {
    Handlebars.registerViewHelper('test', function(viewHelper) {
      equal(view.cid, viewHelper.parent.cid);
    });
    var view = new Thorax.View({
      name: 'outer',
      template: '{{#test}}{{#test}}{{#test}}{{key}}{{/test}}{{/test}}{{/test}}',
      key: 'value'
    });
    view.render();
    equal(view.$('[data-view-helper]')[2].innerHTML, 'value');
  });

  test("$.fn.view", function() {
    var child = new Thorax.View({
      template: '<div class="child"></div>'
    });
    child.render();
    equal(child.$('div.child').view(), child);
    var parent = new Thorax.View({
      template: '<div class="parent">{{view child}}</div>',
      child: child
    });
    parent.render();
    equal(parent.$('div.parent').view(), parent);
    equal(parent.$('div.child').view(), child);
  });

});
