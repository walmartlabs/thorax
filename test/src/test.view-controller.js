$(function() {
  QUnit.module("Thorax ViewController");

  test("Layout", function() {
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

    var layout = new Thorax.LayoutView;

    ok(!layout.getView(), 'layout does not start with a view');
  
    layout.setView(a, {destroy: true});
    equal(layout.getView(), a, 'layout sets view');
    ok(layout.$('[data-view-cid]').length, 'layout updates HTML')
  
    b.render();
    layout.setView(b, {destroy: true});
    equal(layout.getView(), b, 'layout sets view');
  
    //lifecycle checks
    equal(aEventCounter.rendered, 1, 'lifecycle event: rendered');
    equal(aEventCounter.activated, 1, 'lifecycle event: activated');
    equal(aEventCounter.ready, 1, 'lifecycle event: ready');
    equal(aEventCounter.deactivated, 1, 'lifecycle event: deactivated');
    equal(aEventCounter.destroyed, 1, 'lifecycle event: destroyed');
  
    equal(bEventCounter.rendered, 1, 'lifecycle event: rendered');
    equal(bEventCounter.activated, 1, 'lifecycle event: activated');
    equal(bEventCounter.ready, 1, 'lifecycle event: ready');
    ok(!bEventCounter.deactivated, 'lifecycle event: deactivated');
    ok(!bEventCounter.destroyed, 'lifecycle event: destroyed');

    layout.setView(false);
    ok(!layout.getView(), 'layout can set to empty view');
    equal(bEventCounter.rendered, 1, 'lifecycle event: rendered');
    equal(bEventCounter.activated, 1, 'lifecycle event: activated');
    equal(bEventCounter.ready, 1, 'lifecycle event: ready');
    equal(bEventCounter.deactivated, 1, 'lifecycle event: deactivated');
    equal(bEventCounter.destroyed, 1, 'lifecycle event: destroyed');
  });

  test("Layout can set view el", function() {
    $('body').append('<div id="test-target-container"><div id="test-target"></div></div>');
    var view = new Thorax.LayoutView({
      el: $('#test-target')[0]
    });
    view.render();
    equal(view.el.parentNode, $('#test-target-container')[0]);
    $('#test-target-container').remove();
  });

  test('layouts with templates and {{layout}}', function() {
    var layoutWithTemplate = new Thorax.LayoutView({
      template: '<div class="outer">{{layout}}</div>'
    });
    layoutWithTemplate.setView(new Thorax.View({
      template: '<div class="inner"></div>'
    }));
    ok(!$(layoutWithTemplate.el).attr('data-layout-cid'));
    equal(layoutWithTemplate.$('[data-layout-cid]').length, 1);
    equal(layoutWithTemplate.$('.outer').length, 1);
    equal(layoutWithTemplate.$('.inner').length, 1);
    var layoutWithTemplateWithoutLayoutTag = new Thorax.LayoutView({
      template: '<div class="outer"></div>'
    });
    raises(function() {
      layoutWithTemplateWithoutLayoutTag.setView(new Thorax.View({
        template: '<div class="inner"></div>'
      }));
    });
  });

  test('ViewController', function() {
    var viewControllerA = new Thorax.ViewController({
      className: 'view-controller-a'
    });
    var testView = new Thorax.View({
      template: '',
      events: {
        ready: function() {
          ok(this.$el.parents('.view-controller-a').length, 'ViewController sets itself as the view on the parent before the route is called');
        }
      }
    })
    var viewControllerB = new Thorax.ViewController({
      parent: viewControllerA,
      routes: {
        "test": "test"
      },
      test: function() {
        this.setView(testView);
      }
    });
    var callCount = 0;
    viewControllerB.on('route', function(name) {
      ++callCount;
      equal(name, 'test');
    });
    viewControllerB.navigate('test', {trigger: true});
    equal(callCount, 1, 'route event triggered');
    
    var c = new Thorax.ViewController({
      routes: {
        'one': 'one',
        'two': 'two'
      },
      one: function() {
        this.setView(new Thorax.View({template:'<div class="one">one</div>'}))
      },
      two: function() {
        this.setView(new Thorax.View({template:'<div class="two">two</div>'}))
      },
      template: '<div class="outer">{{layout}}</div>'
    });
    c.render();
    Backbone.history.navigate('one', {trigger: true});
    equal(c.$('.outer').length, 1);
    equal(c.$('.one').length, 1);
    equal(c.$('.two').length, 0);
    Backbone.history.navigate('two', {trigger: true});
    equal(c.$('.one').length, 0);
    equal(c.$('.two').length, 1);
  });

});