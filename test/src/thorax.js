describe('core', function() {
  Backbone.history = new Backbone.History();
  Backbone.history.start();

  Thorax.templates.parent = '<div>{{view child}}</div>';
  Thorax.templates.child = '<div>{{value}}</div>';
  Thorax.templates['extension-test.handlebars'] = '123';

  it("registry", function() {
    var ViewClass = Thorax.View.extend({name: 'a-name'}, {});
    expect(ViewClass.prototype.name).to.equal('a-name', 'sets a name attribute on view class');
    expect((new ViewClass()).name).to.equal('a-name', 'sets a name attribute on view instance');
    var viewClassB = ViewClass.extend({
      name: 'b-name',
      key: 'value'
    });
    expect(viewClassB.prototype.key).to.equal('value', 'can accept a class as a value');
    ViewClass.extend({
      name: 'b-name',
      key: 'value2'
    });
    expect(Thorax.Views['b-name'].prototype.key).to.equal('value2', 'will overwrite a previous class when passed a new one');
    Thorax.View.extend({
      name: 'a-name',
      key: 'value'
    });
    expect(Thorax.Views['a-name'].prototype.key).to.equal('value', 'registry will extend an existing class prototype');
  });

  it("context may be an object", function() {
    var view = new (Thorax.View.extend({
      context: {
        a: 'a',
        b: 'b',
        c: function() {
          return 'c';
        }
      },
      template: '{{a}}{{b}}{{c}}'
    }))();
    view.render();
    expect(view.html()).to.equal('abc');
  });

  it("can set view el", function() {
    $('body').append('<div id="test-target-container"><div id="test-target"></div></div>');
    var view = new Thorax.View({
      template: function() { return 'testing123'; },
      el: $('#test-target')[0]
    });
    view.render();
    expect($('#test-target-container > #test-target')[0].innerHTML).to.equal('testing123');
    expect(view.el.parentNode).to.equal($('#test-target-container')[0]);
    $('#test-target-container').remove();
  });

  it("template function can be specified", function() {
    var childReturningString = new Thorax.View({
      template: function(data, options) {
        expect(options.data.cid).to.match(/^t/);
        return 'template';
      }
    });
    childReturningString.render();
    expect(childReturningString.html()).to.equal('template');
    var childReturningElement = new Thorax.View({
      template: function() {
        return $('<p>template</p>')[0];
      }
    });
    childReturningElement.render();
    expect(childReturningElement.$('p').html()).to.equal('template');
    var childReturning$ = new Thorax.View({
      template: function() {
        return $('<p>template</p>');
      }
    });
    childReturning$.render();
    expect(childReturning$.$('p').html()).to.equal('template');
  });

  it("template yield", function() {
    Thorax.templates['yield-child'] = '<span>{{yield}}</span>';
    Thorax.templates['yield-parent'] = '<p>{{#template "yield-child"}}content{{/template}}</p>';
    var view = new Thorax.View({
      name: 'yield-parent'
    });
    view.render();
    expect(view.$('p > span').html()).to.equal('content');
  });

  it("local view functions are called in template scope", function() {
    var child = new Thorax.View({
      template: '{{key}}',
      key: function() {
        return 'value';
      }
    });
    child.render();
    expect(child.html()).to.equal('value');
  });

  it("template not found handling", function() {
    var view = new Thorax.View();
    expect(function() {
      view.render();
    }).to.throw();
  });

  it("render() subclassing", function() {
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

    expect(a._renderCount).to.equal(1, '_renderCount incrimented');
    expect(b._renderCount).to.equal(1, '_renderCount incrimented');
    expect(c._renderCount).to.equal(1, '_renderCount incrimented');
    expect(d._renderCount).to.equal(1, '_renderCount incrimented');
    expect(a.$('p').html()).to.equal('a', 'parent render accepts string');
    expect(b.$('p').html()).to.equal('b', 'parent render accepts dom array');
    expect(c.$('p').html()).to.equal('c', 'parent render accepts dom element');
    expect(d.$('p').html()).to.equal('d', 'parent render accepts view');
  });

  it("template passed to constructor and view block", function() {
    var view = new Thorax.View({
      template: '<p>{{key}}</p>',
      key: 'value'
    });
    view.render();
    expect(view.$('p').html()).to.equal('value');

    var view = new (Thorax.View.extend({
      template: '<p>{{key}}</p>',
      key: 'value'
    }))();
    view.render();
    expect(view.$('p').html()).to.equal('value');

    var Child = Thorax.View.extend({
      template: '<div class="child-a">{{key}}</div>',
      key: 'value'
    });

    var a = new Child();
    var b = new Child();

    var parent = new Thorax.View({
      template: '<div class="parent">{{#view b}}<div class="child-b">{{key}}</div>{{/view}}{{view a}}</div>',
      a: a,
      b: b
    });
    parent.render();
    expect(parent.$('.child-a').html()).to.equal('value');
    expect(parent.$('.child-b').html()).to.equal('value');

    //ensure that override does not persist to view itself
    b.render();
    expect(b.$('.child-a').html()).to.equal('value');

    //test nesting
    var outer = new Thorax.View({
      template: '<div class="a">{{#view inner}}<div class="b">{{#view child}}<div class="c">value</div>{{/view}}</div>{{/view}}</div>',
      inner: new Thorax.View({
        child: new Thorax.View()
      })
    });
    outer.render();
    expect(outer.$('.c').html()).to.equal('value');
  });

  it("nestable scope of view helper", function() {
    Handlebars.registerViewHelper('test', function(viewHelper) {
      expect(view.cid).to.equal(viewHelper.parent.cid);
    });
    var view = new Thorax.View({
      name: 'outer',
      template: '{{#test}}{{#test}}{{#test}}{{key}}{{/test}}{{/test}}{{/test}}',
      key: 'value'
    });
    view.render();
    expect(view.$('[data-view-helper]')[2].innerHTML).to.equal('value');
    delete Handlebars.helpers.test;
  });

  it("onException", function() {
    var oldOnException = Thorax.onException;
    var view = new Thorax.View({
      events: {
        test: function () {
          throw new Error('view error');
        },
        'click div': function() {
          throw new Error('dom error');
        }
      },
      template: '<div></div>'
    });
    view.render();
    document.body.appendChild(view.el);
    Thorax.onException = function(errorName) {
      expect(errorName.match(/click/)).to.exist;
    };
    view.$('div').trigger('click');
    Thorax.onException = function(errorName) {
      expect(errorName.match(/test/)).to.exist;
    };
    view.trigger('test');
    Thorax.onException = oldOnException;
    view.$el.remove();
  });
});
