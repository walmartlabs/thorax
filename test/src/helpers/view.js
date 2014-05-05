describe('view helper', function() {
  it("throws an error when template compiled without data", function() {
    expect(function() {
      Handlebars.helpers.view({}, {});
    }).to.throwError();
  });

  it("throws an error when any hash arguments are passed on an instance", function() {
    var view = new Thorax.View({
      instance: new Thorax.View({
        template: Handlebars.compile('')
      }),
      template: Handlebars.compile('{{view instance tag="span" key="value"}}')
    });
    expect(function() {
      view.render();
    }).to.throwError();
  });

  it("should allow hash arguments when a view class name is passed", function() {
    Thorax.View.extend({
      tagName: 'p',
      name: 'HashArgsClassTest',
      template: Handlebars.compile('<span>{{key}}</span>')
    });
    var view = new Thorax.View({
      template: Handlebars.compile('<div>{{view "HashArgsClassTest" key="value"}}</div>')
    });
    view.render();
    expect(view.$('span').html()).to.equal('value');
  });

  it('should use the registry to lookup view clases', function() {
    //test nested
    Thorax.Views.Outer = {
      Inner: Thorax.View.extend({
        tagName: 'span',
        template: function() { return 'inner'; }
      }),
      More: {
        Nested: Thorax.View.extend({
          tagName: 'span',
          template: function() { return 'nested'; }
        })
      }
    };

    var view = new Thorax.View({
      template: Handlebars.compile('<p>{{view "Outer.Inner"}}</p><div>{{view "Outer.More.Nested"}}</div>')
    });
    view.render();
    expect(view.$('p > span').html()).to.equal('inner', 'test nested registryGet');
    expect(view.$('div > span').html()).to.equal('nested', 'test nested registryGet');

    view = new Thorax.View({
      name: 'extension-test'
    });
    view.render();
    expect(view.html()).to.equal('123');
  });

  it("fail silently when no view initialized", function() {
    var parent = new Thorax.View({
      template: Handlebars.compile("{{view child}}")
    });
    parent.render();
    expect(parent.$el.html()).to.equal('');
  });

  it("child views", function() {
    var childRenderedCount = 0,
        parentRenderedCount = 0;
    Thorax.View.extend({
      name: 'child',
      initialize: function() {
        this.on('rendered', function() {
          ++childRenderedCount;
        });
      }
    });
    var Parent = Thorax.View.extend({
      name: 'parent',
      initialize: function() {
        this.on('rendered', function() {
          ++parentRenderedCount;
        });
        this.childModel = new Thorax.Model({
          value: 'a'
        });
        this.child = new Thorax.Views.child({
          model: this.childModel
        });
      }
    });
    var parent = new Parent();
    parent.render();
    expect(parent.$('[data-view-name="child"] > div').html()).to.equal('a', 'view embedded');
    expect(parentRenderedCount).to.equal(1);
    expect(childRenderedCount).to.equal(1);

    parent.render();
    expect(parent.$('[data-view-name="child"] > div').html()).to.equal('a', 'view embedded');
    expect(parentRenderedCount).to.equal(2, 're-render of parent does not render child');
    expect(childRenderedCount).to.equal(1, 're-render of parent does not render child');

    parent.childModel.set({value: 'b'});
    expect(parent.$('[data-view-name="child"] > div').html()).to.equal('b', 'view embedded');
    expect(parentRenderedCount).to.equal(2, 're-render of child does not parent child');
    expect(childRenderedCount).to.equal(2, 're-render of child does not render parent');

    //ensure recursion does not happen when child view has the same model
    //as parent
    parent.setModel(parent.childModel);
    parent.model.set({value: 'c'});
    expect(parentRenderedCount).to.equal(4);
    expect(childRenderedCount).to.equal(3);
  });

  it("child views within #each", function() {
    var parent = new Thorax.View({
      template: Handlebars.compile('{{#each views}}{{view this}}{{/each}}'),
      views: [
        new Thorax.View({
          template: Handlebars.compile("a")
        }),
        new Thorax.View({
          template: Handlebars.compile("b")
        })
      ]
    });
    parent.render();
    expect(parent.$el.text().replace(/\r\n/g, '')).to.equal('ab');
  });

  it('child views within #each with mutation', function() {
    var parent = new Thorax.View({
      template: Handlebars.compile('{{#each views}}{{view this}}{{/each}}'),
      views: [
        new Thorax.View({
          template: Handlebars.compile('a')
        }),
        new Thorax.View({
          template: Handlebars.compile('b')
        }),
        new Thorax.View({
          template: Handlebars.compile('c')
        })
      ]
    });
    parent.render();
    expect(parent.$el.text().replace(/\r\n/g, '')).to.equal('abc');

    parent.views.splice(1, 1);
    parent.render();
    expect(parent.$el.text().replace(/\r\n/g, '')).to.equal('ac');
  });

  it("template passed to constructor and view block", function() {
    var view = new Thorax.View({
      template: Handlebars.compile('<p>{{key}}</p>'),
      key: 'value'
    });
    view.render();
    expect(view.$('p').html()).to.equal('value');

    var view = new (Thorax.View.extend({
      template: Handlebars.compile('<p>{{key}}</p>'),
      key: 'value'
    }))();
    view.render();
    expect(view.$('p').html()).to.equal('value');

    var Child = Thorax.View.extend({
      template: Handlebars.compile('<div class="child-a">{{key}}</div>'),
      key: 'value'
    });

    var a = new Child();
    var b = new Child();

    var parent = new Thorax.View({
      template: Handlebars.compile('<div class="parent">{{#view b}}<div class="child-b">{{key}}</div>{{/view}}{{view a}}</div>'),
      a: a,
      b: b
    });
    parent.render();
    expect(parent.$('.child-a').length).to.equal(1);
    expect(parent.$('.child-a').html()).to.equal('value');
    expect(parent.$('.child-b').length).to.equal(1);
    expect(parent.$('.child-b').html()).to.equal('value');

    //ensure that override does not persist to view itself
    b.render();
    expect(b.$('.child-a').html()).to.equal('value');

    //test nesting
    var outer = new Thorax.View({
      template: Handlebars.compile('<div class="a">{{#view inner}}<div class="b">{{#view child}}<div class="c">value</div>{{/view}}</div>{{/view}}</div>'),
      inner: new Thorax.View({
        child: new Thorax.View()
      })
    });
    outer.render();
    expect(outer.$('.c').html()).to.equal('value');
  });

  it("child view re-render will keep dom events intact", function() {
    if ($serverSide) {
      return;
    }

    var callCount = 0;
    var parent = new Thorax.View({
      name: 'parent-event-dom-test',
      child: new Thorax.View({
        name: 'child-event-dom-test',
        events: {
          'click .test': function() {
            ++callCount;
          }
        },
        template: function() { return '<div class="test"></div>'; }
      }),
      template: Handlebars.compile("{{view child}}")
    });
    parent.render();
    $('body').append(parent.el);
    parent.child.$('.test').trigger('click');
    expect(callCount).to.equal(1);
    parent.render();
    parent.child.$('.test').trigger('click');
    expect(callCount).to.equal(2);
    parent.$el.remove();
  });

  it("$.fn.view", function() {
    var child = new Thorax.View({
      template: Handlebars.compile('<div class="child"></div>')
    });
    var parent = new Thorax.View({
      template: Handlebars.compile('<div class="parent">{{view child}}</div>'),
      child: child
    });
    parent.render();
    parent.retain();

    expect(child.$('div.child').view()).to.equal(child);
    expect(parent.$('div.parent').view()).to.equal(parent);
    expect(parent.$('div.child').view()).to.equal(child);
  });

  it("multiple views initialized by name will not be re-rendered", function() {
    var spy = this.spy(function() {
      return Thorax.View.prototype.initialize.apply(this, arguments);
    });
    Thorax.View.extend({
      name: 'named-view',
      template: Handlebars.compile('inner'),
      initialize: spy
    });
    var view = new Thorax.View({
      template: Handlebars.compile('{{view "named-view"}}{{view "named-view"}}')
    });
    view.render();
    var firstCids = _.keys(view.children);
    expect(spy.callCount).to.equal(2);
    expect(view.$('div').eq(0).html()).to.equal('inner');
    expect(view.$('div').eq(1).html()).to.equal('inner');

    view.render();
    expect(spy.callCount).to.equal(2);
    expect(view.$('div').eq(0).html()).to.equal('inner');
    expect(view.$('div').eq(1).html()).to.equal('inner');

    var secondCids = _.keys(view.children);
    expect(firstCids.length).to.equal(secondCids.length);
    expect(firstCids[0]).to.equal(secondCids[0]);
    expect(firstCids[1]).to.equal(secondCids[1]);
  });

  it("views embedded with view helper do not incorrectly set parent", function() {
    var view = new Thorax.View({
      child: new Thorax.View({
        template: Handlebars.compile('{{#collection}}{{/collection}}')
      }),
      template: Handlebars.compile('{{view child}}'),
      collection: new Thorax.Collection()
    });
    view.render();
    var collectionView = _.find(view.child.children, function(child) {
      return child._helperName === 'collection';
    });
    expect(collectionView.parent).to.equal(view.child);

    // ensure overrides do not modify either
    view = new Thorax.View({
      child: new Thorax.View({
        template: function() {}
      }),
      template: Handlebars.compile('{{#view child}}{{#collection}}{{/collection}}{{/view}}'),
      collection: new Thorax.Collection()
    });
    view.render();
    emptyView = _.find(view.child.children, function(child) {
      return child._helperName === 'collection';
    });
    expect(emptyView.parent).to.equal(view.child);
  });

  it('ensure manually initialized child view is not destroyed if it goes out of scope in template', function() {
    var child = new Thorax.View({
      template: Handlebars.compile('<span>content</span>')
    });
    child.retain();

    var parent = new Thorax.View({
      child: child,
      showChild: true,
      template: Handlebars.compile('{{#showChild}}{{view child}}{{/showChild}}')
    });
    parent.render();
    expect(parent.$('span').length).to.equal(1);

    parent.showChild = false;
    parent.render();
    expect(parent.$('span').length).to.equal(0);

    parent.showChild = true;
    parent.render();
    expect(parent.$('span').length).to.equal(1);
  });

  it('ensure automatically initialized child view is destroyed if it goes out of scope in template', function() {
    var spy = this.spy();
    var ScopedChildTestView = Thorax.View.extend({
      name: 'scoped-child-test',
      events: {
        rendered: spy
      },
      template: Handlebars.compile('<span>content</span>')
    });
    var parent = new Thorax.View({
      showChild: true,
      template: Handlebars.compile('{{#showChild}}{{view "scoped-child-test"}}{{/showChild}}')
    });
    parent.render();
    expect(parent.$('span').length).to.equal(1);
    expect(spy.callCount).to.equal(1);

    parent.showChild = false;
    parent.render();
    expect(parent.$('span').length).to.equal(0);

    parent.showChild = true;
    parent.render();
    expect(parent.$('span').length).to.equal(1);
    // should be a new instance
    expect(spy.callCount).to.equal(2);
  });
});
