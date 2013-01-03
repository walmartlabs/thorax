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
    var view = new (Thorax.View.extend({
      template: function() { return 'testing123'; },
      el: $('#test-target')[0]
    }));
    view.render();
    expect($('#test-target-container > #test-target')[0].innerHTML).to.equal('testing123');
    expect(view.el.parentNode).to.equal($('#test-target-container')[0]);
    $('#test-target-container').remove();
  });

  it("template function can be specified", function() {
    var childReturningString = new (Thorax.View.extend({
      template: function(data, options) {
        expect(options.data.cid).to.match(/^t/);
        return 'template';
      }
    }));
    childReturningString.render();
    expect(childReturningString.html()).to.equal('template');
    var childReturningElement = new (Thorax.View.extend({
      template: function() {
        return $('<p>template</p>')[0];
      }
    }));
    childReturningElement.render();
    expect(childReturningElement.$('p').html()).to.equal('template');
    var childReturning$ = new (Thorax.View.extend({
      template: function() {
        return $('<p>template</p>');
      }
    }));
    childReturning$.render();
    expect(childReturning$.$('p').html()).to.equal('template');
  });

  it("template yield", function() {
    Thorax.templates['yield-child'] = '<span>{{yield}}</span>';
    Thorax.templates['yield-parent'] = '<p>{{#template "yield-child"}}content{{/template}}</p>';
    var view = new (Thorax.View.extend({
      name: 'yield-parent'
    }));
    view.render();
    expect(view.$('p > span').html()).to.equal('content');
  });

  it("element helper", function() {
    var a = document.createElement('li');
    a.innerHTML = 'one';
    var view = new (Thorax.View.extend({
      template: '<ul>{{element a tag="li"}}{{element b tag="li"}}{{element c}}{{element d}}</ul>',
    }));
    view.set({
      a: a,
      b: function() {
        var li = document.createElement('li');
        li.innerHTML = 'two';
        return li;
      },
      c: function() {
        return $('<li>three</li><li>four</li>');
      },
      d: $('<li>five</li>')
    });
    view.render();
    expect(view.$('li')[0].innerHTML).to.equal('one');
    expect(view.$('li')[1].innerHTML).to.equal('two');
    expect(view.$('li')[2].innerHTML).to.equal('three');
    expect(view.$('li')[3].innerHTML).to.equal('four');
    expect(view.$('li')[4].innerHTML).to.equal('five');
    view.html('');
    expect(view.$('li').length).to.equal(0);
    view.render();
    expect(view.$('li')[0].innerHTML).to.equal('one');
    expect(view.$('li')[1].innerHTML).to.equal('two');
    expect(view.$('li')[2].innerHTML).to.equal('three');
    expect(view.$('li')[3].innerHTML).to.equal('four');
    expect(view.$('li')[4].innerHTML).to.equal('five');
  });

  it("should allow local helpers to be declared", function() {
    // register a global helper to ensure that it isn't overwritten
    Handlebars.registerHelper('globalHelper', function() {
      return '-';
    });

    var view = new (Thorax.View.extend({
      helpers: {
        test: function() {
          return this.get('key');
        },
        testWithArg: function(arg) {
          return this.get('key') + arg;
        },
        testWithBlock: function(options) {
          return options.fn(options.context);
        }
      },
      template: '{{globalHelper}} {{test}} {{testWithArg "!"}} {{#testWithBlock}}{{key}}{{/testWithBlock}}'
    }));
    view.set('key', 'value');
    view.render();
    expect(view.html()).to.equal('- value value! value');

    view = new (Thorax.View.extend({
      template: '{{#collection tag="ul"}}<li>{{globalHelper}} {{test letter}}</li>{{/collection}}',
      helpers: {
        test: function(letter) {
          return letter + "!";
        }
      }
    }));
    view.set('collection', new Thorax.Collection([{letter: 'a'}]));
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
    var a = new (Thorax.View.extend({
      render: function() {
        Thorax.View.prototype.render.call(this, '<p>a</p>');
      }
    }));
    a.render();

    var b = new (Thorax.View.extend({
      render: function() {
        Thorax.View.prototype.render.call(this, $('<p>b</p>'));
      }
    }));
    b.render();

    var c = new (Thorax.View.extend({
      render: function() {
        var el = document.createElement('p');
        el.innerHTML = 'c';
        Thorax.View.prototype.render.call(this, el);
      }
    }));
    c.render();

    var d = new (Thorax.View.extend({
      render: function() {
        var view = new (Thorax.View.extend({
          render: function() {
            Thorax.View.prototype.render.call(this, '<p>d</p>');
          }
        }));
        view.render();
        Thorax.View.prototype.render.call(this, view);
      }
    }));
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
    var view = new (Thorax.View.extend({
      events: {
        test: function () {
          throw new Error('view error');
        },
        'click div': function() {
          throw new Error('dom error');
        }
      },
      template: '<div></div>'
    }));
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
