/*global $serverSide:true */

describe('layout', function() {
  var _serverSide = window.$serverSide,
      _fruitLoops = window.FruitLoops;
  beforeEach(function() {
    window.FruitLoops = {
      emit: this.spy()
    };
  });
  afterEach(function() {
    $serverSide = _serverSide;
    window.FruitLoops = _fruitLoops;
  });

  function bindCounter(view) {
    var counter = {};
    view.bind('all', function(eventName) {
      // For activated, ensure that we actually have DOM content
      if (eventName === 'activated') {
        expect(this.html().length).to.be.greaterThan(0);
      }

      counter[eventName] = (counter[eventName] || 0) + 1;
    });
    return counter;
  }

  describe('view lifecycle', function() {
    var a,
        aEventCounter,
        b,
        bEventCounter,
        layout;

    beforeEach(function() {
      layout = new Thorax.LayoutView();

      a = new Thorax.View({
        render: function(output, callback) {
          Thorax.View.prototype.render.call(this, 'a', callback);
        }
      });
      aEventCounter = bindCounter(a);

      b = new Thorax.View({
        render: function(output, callback) {
          Thorax.View.prototype.render.call(this, 'b', callback);
        }
      });
      bEventCounter = bindCounter(b);
    });

    it('should process', function() {
      $serverSide = false;
      expect(layout.getView()).to.not.be.ok();

      layout.setView(a, {async: false});
      expect(layout.getView()).to.equal(a, 'layout sets view');
      expect(layout.$('[data-view-cid]').length).to.be.above(0, 'layout updates HTML');

      b.render();
      layout.setView(b, {async: false});
      expect(layout.getView()).to.equal(b, 'layout sets view');

      //lifecycle checks
      expect(aEventCounter).to.eql({
        'before:rendered': 1,
        rendered: 1,
        'before:append': 1,
        append: 1,
        activated: 1,
        ready: 1,
        deactivated: 1,
        destroyed: 1
      });

      expect(bEventCounter).to.eql({
        'before:rendered': 1,
        rendered: 1,
        'before:append': 1,
        append: 1,
        activated: 1,
        ready: 1
      });

      layout.setView(false);
      expect(layout.getView()).to.not.be.ok();
      expect(bEventCounter).to.eql({
        'before:rendered': 1,
        rendered: 1,
        'before:append': 1,
        append: 1,
        activated: 1,
        ready: 1,
        deactivated: 1,
        destroyed: 1
      });
    });

    it('should process server-side', function(done) {
      $serverSide = true;
      expect(layout.getView()).to.not.be.ok();

      layout.once('change:view:end', function() {
        expect(layout.getView()).to.equal(a, 'layout sets view');
        expect(layout.$('[data-view-cid]')).to.not.be.empty();
        expect(aEventCounter).to.eql({
          'before:rendered': 1,
          rendered: 1,
          'before:append': 1,
          append: 1,
          activated: 1,
          ready: 1
        });

        layout.setView(b, {async: false});
        expect(layout.getView()).to.equal(b, 'layout sets view');
        expect(layout.$('[data-view-cid]')).to.be.empty();
        expect(window.FruitLoops.emit.calledOnce).to.be.ok();

        //lifecycle checks
        expect(aEventCounter).to.eql({
          'before:rendered': 1,
          rendered: 1,
          'before:append': 1,
          append: 1,
          activated: 1,
          ready: 1,
          deactivated: 1,
          destroyed: 1
        });

        expect(bEventCounter).to.eql({});

        layout.setView(false);
        expect(layout.getView()).to.not.be.ok();
        expect(bEventCounter).to.eql({
          deactivated: 1,
          destroyed: 1
        });

        done();
      });
      layout.setView(a, {serverRender: true});
      expect(layout.getView()).to.be(undefined);

      this.clock.tick(1000);
    });
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
      template: Handlebars.compile("{{view this.layout}}"),
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
      template: function() {},
      events: {
        destroyed: function() {
          ++callCounts.child;
        }
      }
    }), {async: false});
    parent.release();
    expect(callCounts.parent).to.equal(1);
    expect(callCounts.layout).to.equal(1);
    expect(callCounts.child).to.equal(1);
  });

  it("Layout will not destroy view if retained", function() {
    var aSpy = this.spy(),
        bSpy = this.spy();
    var a = new Thorax.View({
      name: 'a',
      events: {
        destroyed: aSpy
      },
      template: Handlebars.compile("")
    });
    var b = new Thorax.View({
      name: 'b',
      events: {
        destroyed: bSpy
      },
      template: Handlebars.compile("")
    });
    var layout = new Thorax.LayoutView();
    layout.setView(a, {async: false});
    b.retain();
    layout.setView(b, {async: false});
    layout.setView(false);
    expect(aSpy.callCount).to.equal(1);
    expect(bSpy.callCount).to.equal(0);
    b.release();
    expect(bSpy.callCount).to.equal(1);
  });

  it("Layout can set view el", function() {
    $('body').append('<div id="test-target-container"><div id="test-target"></div></div>');
    var view = new Thorax.LayoutView({
      el: $('#test-target')[0]
    });
    view.render();
    expect(view.$el.parent()[0]).to.equal($('#test-target-container')[0]);
    $('#test-target-container').remove();
  });

  it('layouts with templates and {{layout-element}}', function() {
    var layoutWithTemplate = new Thorax.LayoutView({
      template: Handlebars.compile('<div class="outer">{{layout-element}}</div>')
    });
    layoutWithTemplate.setView(new Thorax.View({
      serverRender: true,
      template: Handlebars.compile('<div class="inner"></div>')
    }), {async: false});
    expect($(layoutWithTemplate.el).attr('data-layout-cid')).to.not.be.ok();
    expect(layoutWithTemplate.$('[data-layout-cid]').length).to.equal(1);
    expect(layoutWithTemplate.$('.outer').length).to.equal(1);
    expect(layoutWithTemplate.$('.inner').length).to.equal(1);
  });

  it('should fail if missing layout-element', function() {
    var layoutWithTemplateWithoutLayoutTag = new Thorax.LayoutView({
      template: Handlebars.compile('<div class="outer"></div>')
    });
    expect(function() {
      layoutWithTemplateWithoutLayoutTag.setView(new Thorax.View({
        template: Handlebars.compile('<div class="inner"></div>')
      }));
    }).to.throwError();
  });

  it("layout-element used outside of a LayoutView with throw", function() {
    var view = new Thorax.View({
      template: Handlebars.compile('{{layout-element}}')
    });
    expect(_.bind(view.render, view)).to.throwError();
  });

  it("transition option can be passed to setView", function(done) {
    this.clock.restore();

    var layout = new Thorax.LayoutView();
    var a = new Thorax.View({
      serverRender: true,
      template: function() {
        return '<span>a</span>';
      }
    });
    var b = new Thorax.View({
      serverRender: true,
      template: function() {
        return '<span>b</span>';
      }
    });
    layout.setView(a, {
      serverRender: true,
      transition: function(newView, oldView, append, remove) {
        append();
        remove();

        expect(layout.$('span').html()).to.equal('a');
        layout.setView(b, {
          serverRender: true,
          transition: function(newView, oldView, append, remove) {
            append();
            remove();

            expect(layout.$('span').html()).to.equal('b');
            done();
          }
        });
      }
    });
  });

  it('setView should not throw even if old view is destroyed', function() {
    var layout = new Thorax.LayoutView();
    var a = new Thorax.View({
      serverRender: true,
      template: function() {
        return '<span>a</span>';
      }
    });
    var b = new Thorax.View({
      serverRender: true,
      template: function() {
        return '<span>b</span>';
      }
    });
    layout.setView(a, {async: false});
    expect(layout.$('span').html()).to.equal('a');
    a.release();
    layout.setView(b, {async: false});
    expect(layout.$('span').html()).to.equal('b');
  });

});
