describe('serverSide', function() {
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
  });
});
