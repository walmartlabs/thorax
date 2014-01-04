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

      view.$el.trigger('click');
      expect(spy.called).to.be(false);
    });
  });
});
