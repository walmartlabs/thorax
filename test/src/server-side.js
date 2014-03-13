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
});
