describe('serverSide', function() {
  var _serverSide = window.$serverSide,
      emit;
  beforeEach(function() {
    window.$serverSide = true;
    window.emit = emit = this.spy();
  });
  afterEach(function() {
    window.$serverSide = _serverSide;
  });

  describe('emit', function() {
    it('should emit on setView for non-server views', function() {
      var view = new Thorax.View(),
          layout = new Thorax.LayoutView();

      layout.setView(view);
      expect(emit.calledOnce).to.be(true);
    });
    it('should defer emit for server-side views', function() {
      var view = new Thorax.View({template: function() { return 'bar'; }}),
          layout = new Thorax.LayoutView();

      layout.setView(view, {serverRender: true});
      expect(emit.called).to.be(false);

      view = new Thorax.View({
        serverRender: true,
        template: function() { return 'bar'; }
      });
      layout.setView(view);
      expect(emit.called).to.be(false);
    });
  });

  describe('events', function() {
    it('should NOP DOM events in server mode', function() {
      var spy = this.spy();
      var view = new Thorax.View({
        events: {
          click: spy
        },
        template: function() {
          return 'foo';
        }
      });
      $('body').append(view.$el);

      // Success under fruit-loops is not throwing above
      // Under other environments, it's not triggering the handler
      view.$el.trigger && view.$el.trigger('click');
      expect(spy.called).to.be(false);

      view.release();
    });
    it('should NOP loading in server mode', function() {
      var start = this.spy(),
          end = this.spy(),
          context = {};

      var handler = Thorax.loadHandler(start, end, context);
      handler();
      this.clock.tick(2000);
      expect(start.called).to.be(false);
      expect(end.called).to.be(false);
    });
    it('should NOP loading in server mode', function() {
      var start = this.spy(),
          end = this.spy(),
          context = {};

      var handler = Thorax.loadHandler(start, end, context);
      handler();
      this.clock.tick(2000);
      expect(start.called).to.be(false);
      expect(end.called).to.be(false);
    });
  });

  describe('rendering', function() {
    it('should track server-side rendering vs. not');
  });

  describe('restore', function() {
    var fixture;
    beforeEach(function() {
      window.$serverSide = false;

      fixture = $('<div>');
      $('body').append(fixture);
    });
    afterEach(function() {
      fixture.remove();
    });

    it('should restore views explicitly', function() {
      var el = $('<div class="foo-view" data-view-server="true">bar</div>');
      fixture.append(el);

      var view = new Thorax.View({
        el: '.foo-view'
      });
      expect(view.el).to.equal(el[0]);
      expect(view._renderCount).to.equal(1);
      expect(el.html()).to.equal('bar');

      view = new Thorax.View({
        el: function() {
          return '.foo-view';
        }
      });
      expect(view.el).to.equal(el[0]);
      expect(view._renderCount).to.equal(1);
      expect(el.html()).to.equal('bar');
    });
    it('should re-render non-server elements on restore', function() {
      var el = $('<div class="foo-view">bar</div>');
      fixture.append(el);

      var view = new Thorax.View({
        el: '.foo-view',
        template: function() {
          return 'bat';
        }
      });
      expect(view.el).to.equal(el[0]);
      expect(view._renderCount).to.equal(1);
      expect(el.html()).to.equal('bat');
    });

    it('should restore views with a passed el', function() {
      var el = $('<div class="foo-view" data-view-server="true">bar</div>');
      fixture.append(el);

      var view = new Thorax.View({});
      view.restore(el);

      expect(view.el).to.equal(el[0]);
      expect(view._renderCount).to.equal(1);
      expect(el.html()).to.equal('bar');
    });

    it('should update view attributes on restore', function() {
      var el = $('<div class="foo-view" data-view-cid="1234" data-view-server="true">bar</div>');
      fixture.append(el);

      var spy = this.spy();
      var view = new Thorax.View({
        events: {
          click: spy
        }
      });
      view.restore(el);

      expect(view.$el.attr('data-view-cid')).to.equal(view.cid);
    });

    if (!$serverSide) {
      it('should restore DOM events', function() {
        var el = $('<div class="foo-view" data-view-server="true">bar</div>');
        fixture.append(el);

        var spy = this.spy();
        var view = new Thorax.View({
          events: {
            click: spy
          }
        });
        view.restore(el);

        el.trigger('click');
        expect(spy.calledOnce).to.be(true);
      });
    }

    describe('view helper', function() {
      describe('registry', function() {
        it('should restore views instantiated through the registry');
        it('should include view args when instantiating view');
        it('should invalidate views with complex args');
      });
      it('should restore named references');
      it('should restore pathed named references');
      it('should restore named references within iterators');
      it('should handle block view helpers'); // {{#view foo}}shit{{/view}}
    });
    describe('collection views', function() {
      it('should restore inline views');
      it('should restore referenced views');
      it('should restore renderItem views');
      it('should restore over non-default collection name');
    });
    it('should restore helper views');

    it('should replace and log on restore of rendered view');
  });
});
