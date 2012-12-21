describe('layout', function() {
  it("LayoutView", function() {
    var a = new Thorax.View({
      render: function() {
        Thorax.View.prototype.render.call(this, 'a');
      }
    });
    var aEventCounter = {};
    a.bind('all', function(eventName) {
      aEventCounter[eventName] || (aEventCounter[eventName] = 0);
      ++aEventCounter[eventName];
    });

    var b = new Thorax.View({
      render: function() {
        Thorax.View.prototype.render.call(this, 'b');
      }
    });
    var bEventCounter = {};
    b.bind('all', function(eventName) {
      bEventCounter[eventName] || (bEventCounter[eventName] = 0);
      ++bEventCounter[eventName];
    });

    var layout = new Thorax.LayoutView();

    expect(layout.getView()).to.not.exist;

    layout.setView(a, {destroy: true});
    expect(layout.getView()).to.equal(a, 'layout sets view');
    expect(layout.$('[data-view-cid]').length).to.be.above(0, 'layout updates HTML');

    b.render();
    layout.setView(b, {destroy: true});
    expect(layout.getView()).to.equal(b, 'layout sets view');

    //lifecycle checks
    expect(aEventCounter.rendered).to.equal(1, 'lifecycle event: rendered');
    expect(aEventCounter.activated).to.equal(1, 'lifecycle event: activated');
    expect(aEventCounter.ready).to.equal(1, 'lifecycle event: ready');
    expect(aEventCounter.deactivated).to.equal(1, 'lifecycle event: deactivated');
    expect(aEventCounter.destroyed).to.equal(1, 'lifecycle event: destroyed');

    expect(bEventCounter.rendered).to.equal(1, 'lifecycle event: rendered');
    expect(bEventCounter.activated).to.equal(1, 'lifecycle event: activated');
    expect(bEventCounter.ready).to.equal(1, 'lifecycle event: ready');
    expect(bEventCounter.deactivated).to.not.be.ok;
    expect(bEventCounter.destroyed).to.not.be.ok;

    layout.setView(false);
    expect(layout.getView()).to.not.exist;
    expect(bEventCounter.rendered).to.equal(1, 'lifecycle event: rendered');
    expect(bEventCounter.activated).to.equal(1, 'lifecycle event: activated');
    expect(bEventCounter.ready).to.equal(1, 'lifecycle event: ready');
    expect(bEventCounter.deactivated).to.equal(1, 'lifecycle event: deactivated');
    expect(bEventCounter.destroyed).to.equal(1, 'lifecycle event: destroyed');
  });

  it("LayoutView destroy will destroy child view", function() {
    var callCounts = {
      parent: 0,
      layout: 0,
      child: 0
    };
    var parent = new Thorax.View({
      events: {
        destroyed: function() {
          ++callCounts.parent;
        }
      },
      template: "{{view this.layout}}",
      layout: new Thorax.LayoutView({
        events: {
          destroyed: function() {
            ++callCounts.layout;
          }
        }
      })
    });
    parent.render();
    parent.layout.setView(new Thorax.View({
      template: "",
      events: {
        destroyed: function() {
          ++callCounts.child;
        }
      }
    }));
    parent.destroy();
    expect(callCounts.parent).to.equal(1);
    expect(callCounts.layout).to.equal(1);
    expect(callCounts.child).to.equal(1);
  });

  it("Layout can set view el", function() {
    $('body').append('<div id="test-target-container"><div id="test-target"></div></div>');
    var view = new Thorax.LayoutView({
      el: $('#test-target')[0]
    });
    view.render();
    expect(view.el.parentNode).to.equal($('#test-target-container')[0]);
    $('#test-target-container').remove();
  });

  it('layouts with templates and {{layout}}', function() {
    var layoutWithTemplate = new Thorax.LayoutView({
      template: '<div class="outer">{{layout}}</div>'
    });
    layoutWithTemplate.setView(new Thorax.View({
      template: '<div class="inner"></div>'
    }));
    expect($(layoutWithTemplate.el).attr('data-layout-cid')).to.not.exist;
    expect(layoutWithTemplate.$('[data-layout-cid]').length).to.equal(1);
    expect(layoutWithTemplate.$('.outer').length).to.equal(1);
    expect(layoutWithTemplate.$('.inner').length).to.equal(1);
    var layoutWithTemplateWithoutLayoutTag = new Thorax.LayoutView({
      template: '<div class="outer"></div>'
    });
    expect(function() {
      layoutWithTemplateWithoutLayoutTag.setView(new Thorax.View({
        template: '<div class="inner"></div>'
      }));
    }).to['throw']();
  });

});
