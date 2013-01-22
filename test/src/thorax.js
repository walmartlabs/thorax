describe('core', function() {
  Backbone.history || (Backbone.history = new Backbone.History());
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

  it("should allow local helpers to be declared", function() {
    // register a global helper to ensure that it isn't overwritten
    Handlebars.registerHelper('globalHelper', function() {
      return '-';
    });

    var view = new Thorax.View({
      helpers: {
        test: function() {
          return this.key;
        },
        testWithArg: function(arg) {
          return this.key + arg;
        },
        testWithBlock: function(options) {
          return options.fn(options.context);
        }
      },
      key: 'value',
      template: '{{globalHelper}} {{test}} {{testWithArg "!"}} {{#testWithBlock}}{{key}}{{/testWithBlock}}'
    });
    view.render();
    expect(view.html()).to.equal('- value value! value');

    view = new Thorax.View({
      collection: new Thorax.Collection([{letter: 'a'}]),
      template: '{{#collection tag="ul"}}<li>{{globalHelper}} {{test letter}}</li>{{/collection}}',
      helpers: {
        test: function(letter) {
          return letter + "!";
        }
      }
    });
    view.render();
    expect(view.$('li').html()).to.equal('- a!');
  });

  it("template not found handling", function() {
    var view = new Thorax.View();
    expect(function() {
      view.render();
    }).to['throw']();
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

  describe('context', function() {
    it("may be an object", function() {
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

    it("can return undefined", function() {
      var view = new Thorax.View({
        key: 'value',
        context: function() {
          return;
        },
        template: '{{key}}'
      });
      view.render();
      expect(view.html()).to.equal('value');
    });

    it("function is additive", function() {
      var view = new Thorax.View({
        a: 'a',
        context: function() {
          return {
            b: 'b'
          };
        },
        template: '{{a}}{{b}}'
      });
      view.render();
      expect(view.html()).to.equal('ab');
    });

    it("template helpers will not mutate view or model attributes", function() {
      Handlebars.registerHelper('modifyObject', function(obj) {
        obj.mutated = true;
        return obj;
      });
      var view = new Thorax.View({
        a: 'a',
        model: new Thorax.Model({
          b: 'b'
        }),
        template: '{{modifyObject a}}{{modifyObject b}}'
      });
      expect(view.a.mutated).to.be['undefined'];
      expect(view.model.attributes.b.mutated).to.be['undefined'];
      expect(view.html()).to.equal('ab');
    });
  });
});
