describe('view helper', function() {
  it("throws an error when template compiled without data", function() {
    expect(function() {
      Handlebars.helpers.view({}, {});
    }).to['throw']();
  });

  it('should use the registry to lookup view clases', function() {
    //test nested
    Thorax.Views.Outer = {
      Inner: Thorax.View.extend({
        template: function() { return 'inner'; }
      }),
      More: {
        Nested: Thorax.View.extend({
          template: function() { return 'nested'; }
        })
      }
    };

    var view = new (Thorax.View.extend({
      template: '<p>{{view "Outer.Inner" tag="span"}}</p><div>{{view "Outer.More.Nested" tag="span"}}</div>'
    }));
    view.render();
    expect(view.$('p > span').html()).to.equal('inner', 'test nested registryGet');
    expect(view.$('div > span').html()).to.equal('nested', 'test nested registryGet');

    view = new (Thorax.View.extend({
      name: 'extension-test'
    }));
    view.render();
    expect(view.html()).to.equal('123');
  });

  it("fail silently when no view initialized", function() {
    var parent = new Thorax.View({
      template: "{{view child}}"
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
      }
    });
    var parent = new Parent();
    var childModel = new Thorax.Model({
      value: 'a'
    });
    parent.set('childModel', childModel);
    parent.set('child', new Thorax.Views.child({
      model: childModel
    }));
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
    parent.set('model', parent.childModel);
    parent.get('model').set({value: 'c'});
    expect(parentRenderedCount).to.equal(4);
    expect(childRenderedCount).to.equal(3);
  });

  it("child views within #each", function() {
    var parent = new (Thorax.View.extend({
      template: '{{#each views}}{{view this}}{{/each}}',
    }));
    parent.set({
      views: [
        new (Thorax.View.extend({
          template: "a"
        })),
        new (Thorax.View.extend({
          template: "b"
        }))
      ]
    });
    parent.render();
    expect(parent.$('div').get(0).innerHTML).to.equal('a');
    expect(parent.$('div').get(1).innerHTML).to.equal('b');
  });

  // TODO: The bug and test to ensure it is fixed is limited to jQuery
  // The test fails on PhantomJS running the zepto tests for unknown
  // reasons. The test passes on Zepto when run directly in a browser.
  // It is disabled for now as it does not affect Zepto.
  if (typeof jQuery !== 'undefined' && $ === jQuery) {
    it("child view re-render will keep dom events intact", function() {
      var callCount = 0;
      var parent = new (Thorax.View.extend({
        name: 'parent-event-dom-test',
        template: "{{view child}}"
      }));
      var child = new (Thorax.View.extend({
        name: 'child-event-dom-test',
        events: {
          'click .test': function() {
            ++callCount;
          }
        },
        template: function() { return '<div class="test"></div>'; }
      }));
      parent.set({
        child: child
      });
      parent.render();
      document.body.appendChild(parent.el);
      child.$('.test').trigger('click');
      expect(callCount).to.equal(1);
      parent.render();
      child.$('.test').trigger('click');
      expect(callCount).to.equal(2);
      $(parent.el).remove();
    });
  }

  it("view block", function() {
    var Child = Thorax.View.extend({
      template: '<div class="child-a">{{key}}</div>',
    });

    var a = new Child();
    var b = new Child();

    a.set('key', 'value');
    b.set('key', 'value');

    var parent = new (Thorax.View.extend({
      template: '<div class="parent">{{#view b}}<div class="child-b">{{key}}</div>{{/view}}{{view a}}</div>',
    }));
    parent.set('a', a);
    parent.set('b', b);
    parent.render();
    expect(parent.$('.child-a').html()).to.equal('value');
    expect(parent.$('.child-b').html()).to.equal('value');

    //ensure that override does not persist to view itself
    b.render();
    expect(b.$('.child-a').html()).to.equal('value');

    //test nesting
    var outer = new (Thorax.View.extend({
      template: '<div class="a">{{#view inner}}<div class="b">{{#view child}}<div class="c">value</div>{{/view}}</div>{{/view}}</div>',
    }));
    var inner = new Thorax.View();
    inner.set('child', new Thorax.View());
    outer.set('inner', inner);
    outer.render();
    expect(outer.$('.c').html()).to.equal('value');
  });
  
  it("view helper auto generated", function() {
    var parent = new (Thorax.View.extend({
      template: '{{child}}'
    }));
    parent.set('child', new (Thorax.View.extend({
      template: '{{key}}'
    })));
    parent.get('child').set('key', 'value');
    parent.render();
    expect(parent.$('div').html()).to.equal('value');
  });

  it("nestable scope of view helper", function() {
    var view;
    Handlebars.registerViewHelper('test', function(viewHelper) {
      expect(view.cid).to.equal(viewHelper.parent.cid);
    });
    view = new (Thorax.View.extend({
      name: 'outer',
      template: '{{#test}}{{#test}}{{#test}}{{key}}{{/test}}{{/test}}{{/test}}',
    }));
    view.set('key', 'value')
    view.render();
    expect(view.$('[data-view-helper]').eq(2).html()).to.equal('value');
    delete Handlebars.helpers.test;
  });

  it("$.fn.view", function() {
    var child = new (Thorax.View.extend({
      template: '<div class="child"></div>'
    }));
    child.render();
    expect(child.$('div.child').view()).to.equal(child);
    var parent = new (Thorax.View.extend({
      template: '<div class="parent">{{view child}}</div>',
    }));
    parent.set('child', child);
    parent.render();
    expect(parent.$('div.parent').view()).to.equal(parent);
    expect(parent.$('div.child').view()).to.equal(child);
  });
});
