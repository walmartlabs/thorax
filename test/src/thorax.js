/*global $serverSide */

describe('core', function() {
  Backbone.history || (Backbone.history = new Backbone.History());
  Backbone.history.options = {
    root: '/'
  };
  Backbone.history.root = '/';

  Handlebars.templates.parent = Handlebars.compile('<div>{{view child}}</div>');
  Handlebars.templates.child = Handlebars.compile('<div>{{value}}</div>');
  Handlebars.templates['extension-test.handlebars'] = Handlebars.compile('123');

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
      el: '#test-target'
    });
    view.render();
    expect($('#test-target').html()).to.equal('testing123');
    expect(view.$el.parent()[0]).to.equal($('#test-target-container')[0]);
    $('#test-target-container').remove();
  });

  it("should not attempt to render destroyed views", function() {
    $('body').append('<div id="test-target-container"><div id="test-target"></div></div>');
    var view = new Thorax.View({
      template: function() { return 'testing123'; },
      el: '#test-target'
    });
    view.render();
    expect($('#test-target').html()).to.equal('testing123');
    expect(view.$el.parent()[0]).to.equal($('#test-target-container')[0]);
    view.release();
    expect($('#test-target')).to.be.empty();
    view.render();
    expect($('#test-target')).to.be.empty();
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
      template: Handlebars.compile('{{globalHelper}} {{test}} {{testWithArg "!"}} {{#testWithBlock}}{{key}}{{/testWithBlock}}')
    });
    view.render();
    expect(view.html()).to.equal('- value value! value');

    view = new Thorax.View({
      collection: new Thorax.Collection([{letter: 'a'}]),
      template: Handlebars.compile('{{#collection tag="ul"}}<li>{{globalHelper}} {{test letter}}</li>{{/collection}}'),
      helpers: {
        test: function(letter) {
          return letter + "!";
        }
      }
    });
    view.render();
    expect(view.$('li').html()).to.equal('- a!');
  });

  it("assign template by name", function() {
    var view = new Thorax.View({
      name: 'a',
      template: 'child',
      value: 'test'
    });
    view.render();
    expect(view.$('div').html()).to.equal('test');
  });

  it("template not found handling", function() {
    var view = new Thorax.View();
    expect(function() {
      view.render();
    }).to.throwError();
  });

  it("returns context on render()", function () {
    $('body').append('<div id="test-target-container"><div id="test-target"></div></div>');

    var view = new Thorax.View({
      template: function() { return 'testing123'; },
      el: $('#test-target')[0]
    });
    expect(view.render()).to.equal(view);

    // Nuke the view and test again.
    view.release();
    expect(view.render()).to.equal(view);

    $('#test-target-container').remove();
  });

  it("render() subclassing", function() {
    var result;
    var a = new Thorax.View({
      render: function() {
        return Thorax.View.prototype.render.call(this, '<p>a</p>');
      }
    });
    result = a.render();
    expect(result).to.equal(a);

    var b = new Thorax.View({
      render: function() {
        return Thorax.View.prototype.render.call(this, $('<p>b</p>'));
      }
    });
    result = b.render();
    expect(result).to.equal(b);

    var c = new Thorax.View({
      render: function() {
        var el = $('<p>');
        el.html('c');
        return Thorax.View.prototype.render.call(this, el);
      }
    });
    result = c.render();
    expect(result).to.equal(c);

    var d = new Thorax.View({
      render: function() {
        var view = new Thorax.View({
          render: function() {
            return Thorax.View.prototype.render.call(this, '<p>d</p>');
          }
        });
        view.render();
        return Thorax.View.prototype.render.call(this, view);
      }
    });
    result = d.render();
    expect(result).to.equal(d);

    expect(a._renderCount).to.equal(1, '_renderCount incrimented');
    expect(b._renderCount).to.equal(1, '_renderCount incrimented');
    expect(c._renderCount).to.equal(1, '_renderCount incrimented');
    expect(d._renderCount).to.equal(1, '_renderCount incrimented');
    expect(a.$('p').html()).to.equal('a', 'parent render accepts string');
    expect(b.$('p').html()).to.equal('b', 'parent render accepts dom array');
    expect(c.$('p').html()).to.equal('c', 'parent render accepts dom element');
    expect(d.$('p').html()).to.equal('d', 'parent render accepts view');
  });

  it('should not puke on rendering of rows', function() {
    var count = 0;
    var view = new Thorax.View({
      tagName: 'tr',
      template: function() {
        return '<td>' + (++count) + '</td>';
      }
    });

    // Under IE assigning to innerHTML for a TR that is embedded in a table will fail (and only
    // if it's embedded in a table element)
    var table = $('<table>');
    table.append(view.$el);

    view.render();
    expect(view.$el.text()).to.equal('1');

    view.render();
    expect(view.$el.text()).to.equal('2');
  });

  describe('onException', function() {
    it('should handle DOM exceptions', function() {
      if ($serverSide) {
        return;
      }

      var view = new Thorax.View({
        name: 'foo view',
        events: {
          test: function () {
            throw new Error('view error');
          },
          'click div': function() {
            throw new Error('dom error');
          }
        },
        template: Handlebars.compile('<div></div>')
      });
      view.render();
      document.body.appendChild(view.el);
      this.stub(Thorax, 'onException', function(errorName, err, info) {
        expect(errorName).to.equal('thorax-event');
        expect(info.view).to.equal('foo view');
        expect(info.eventName).to.match(/click/);
      });
      view.$('div').trigger('click');
      expect(Thorax.onException.calledOnce).to.be(true);
      view.$el.remove();
    });
    it('should handle event exceptions', function() {
      var view = new Thorax.View({
        name: 'foo view',
        events: {
          test: function () {
            throw new Error('view error');
          },
          'click div': function() {
            throw new Error('dom error');
          }
        },
        template: Handlebars.compile('<div></div>')
      });
      this.stub(Thorax, 'onException', function(errorName, err, info) {
        expect(errorName).to.equal('thorax-event');
        expect(info.view).to.equal('foo view');
        expect(info.eventName).to.match(/test/);
      });
      view.trigger('test');
    });
  });

  it('should destroy scoped retain on owner destroy', function() {
    var owner = new Thorax.View(),
        view = new Thorax.View(),
        ownerDestroy = this.spy(),
        viewDestroy = this.spy();

    owner.on('destroyed', ownerDestroy);
    view.on('destroyed', viewDestroy);

    view.retain(owner);
    expect(view._referenceCount).to.equal(1);

    owner.release();
    expect(ownerDestroy.callCount).to.equal(1);
    expect(viewDestroy.callCount).to.equal(1);
    expect(view._referenceCount).to.equal(0);
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
        template: Handlebars.compile('{{a}}{{b}}{{c}}')
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
        template: Handlebars.compile('{{key}}')
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
        template: Handlebars.compile('{{a}}{{b}}')
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
        template: Handlebars.compile('{{modifyObject a}}{{modifyObject b}}')
      });
      view.render();
      expect(view.a.mutated).to.be(undefined);
      expect(view.model.attributes.b.mutated).to.be(undefined);
      expect(view.html()).to.equal('ab');
    });

    it("template does not expose template cid", function() {
      var view = new Thorax.View({
        template: Handlebars.compile("{{cid}}")
      });
      view.render();
      expect(view.html()).to.contain('view');
      view = new Thorax.View({
        template: Handlebars.compile("{{@cid}}")
      });
      view.render();
      expect(view.html()).to.contain('t');
    });
  });

  describe('#render', function() {
    it('should support sync', function() {
      var view = new Thorax.View(),
          itRan = 0;
      view.on('before:rendered', function(deferrable) {
        deferrable.exec(function() {
          expect(itRan).to.equal(0);
          itRan++;
        });
      });
      view.on('rendered', function() {
        expect(itRan).to.equal(1);
        itRan++;
      });

      view.render('<div></div>');
      expect(itRan).to.equal(2);
    });
    it('should support async', function(done) {
      this.clock.restore();

      var view = new Thorax.View(),
          itRan = 0;
      view.on('before:rendered', function(deferrable) {
        deferrable.exec(function() {
          expect(itRan).to.equal(0);
          itRan++;
        });
      });
      view.on('rendered', function() {
        expect(itRan).to.equal(1);
        itRan++;
      });

      view.render('<div></div>', function() {
        expect(itRan).to.equal(2);
        done();
      });
      expect(itRan).to.equal(0);
    });
  });

  describe('#html', function() {
    it('should trigger append', function() {
      var view = new Thorax.View(),
          itRan = false;
      view.on('append', function(scope, callback, deferrable) {
        deferrable.exec(function() {
          itRan = true;
        });
      });

      view.html('<div></div>');
      expect(itRan).to.be(true);
    });
    it('should trigger append deferrable', function(done) {
      this.clock.restore();

      var view = new Thorax.View(),
          itRan = false;
      view.on('append', function(scope, callback, deferrable) {
        deferrable.exec(function() {
          itRan = true;
        });
      });

      view.html('<div></div>', function() {
        expect(itRan).to.be(true);
        done();
      });
      expect(itRan).to.be(false);
    });
  });
});
