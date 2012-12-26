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

    var view = new Thorax.View({
      template: '<p>{{view "Outer.Inner" tag="span"}}</p><div>{{view "Outer.More.Nested" tag="span"}}</div>'
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
        this.childModel = new Backbone.Model({
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
      template: '{{#each views}}{{view this}}{{/each}}',
      views: [
        new Thorax.View({
          template: "a"
        }),
        new Thorax.View({
          template: "b"
        })
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
        template: "{{view child}}"
      });
      parent.render();
      document.body.appendChild(parent.el);
      parent.child.$('.test').trigger('click');
      expect(callCount).to.equal(1);
      parent.render();
      parent.child.$('.test').trigger('click');
      expect(callCount).to.equal(2);
      $(parent.el).remove();
    });
  }

  it("$.fn.view", function() {
    var child = new Thorax.View({
      template: '<div class="child"></div>'
    });
    child.render();
    expect(child.$('div.child').view()).to.equal(child);
    var parent = new Thorax.View({
      template: '<div class="parent">{{view child}}</div>',
      child: child
    });
    parent.render();
    expect(parent.$('div.parent').view()).to.equal(parent);
    expect(parent.$('div.child').view()).to.equal(child);
  });
});
