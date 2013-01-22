describe('helper-view', function() {
  var spy,
      view;
  beforeEach(function() {
    spy = this.spy(function(viewHelper) {
      //expect(view.cid).to.equal(viewHelper.parent.cid);
      return viewHelper;
    });
    Handlebars.registerViewHelper('test', spy);
  });
  afterEach(function() {
    delete Handlebars.helpers.test;
  });

  it('should nest helper view instances', function() {
    view = new Thorax.View({
      name: 'outer',
      template: '{{#test}}{{#test}}{{#test}}{{key}}{{/test}}{{/test}}{{/test}}',
      key: 'value'
    });
    view.render();
    expect(view.$('[data-view-helper]')[2].innerHTML).to.equal('value');
  });
  it('should allow an empty template', function() {
    view = new Thorax.View({
      template: '{{test}}'
    });
    view.render();
    expect(spy.callCount).to.equal(1);
  });
  it('should render multiple identical calls', function() {
    view = new Thorax.View({
      template: '{{test a=1}}{{test a=1}}{{#test a=1}}{{/test}}'
    });
    view.render();
    expect(spy.callCount).to.equal(3);
    expect(_.keys(view.children).length).to.equal(3);
  });

  describe('container render', function() {
    it('should preserve itself in the DOM', function() {
      view = new Thorax.View({
        template: '{{#test}}{{/test}}'
      });
      view.render();
      expect(spy.callCount).to.equal(1);
      expect(_.keys(view.children).length).to.equal(1);
      var firstKey = _.keys(view.children)[0];
      view.render();
      expect(spy.callCount).to.equal(1);
      expect(_.keys(view.children).length).to.equal(1);
      var newFirstKey = _.keys(view.children)[0];
      expect(firstKey).to.equal(newFirstKey);
    });
    it('should rerender if an input parameter changes', function() {
      view = new Thorax.View({
        template: '{{#test key}}{{/test}}',
        key: 1
      });
      view.render();
      expect(spy.callCount).to.equal(1);
      expect(_.keys(view.children).length).to.equal(1);
      var firstKey = _.keys(view.children)[0];

      view.key = 2;
      view.render();
      expect(spy.callCount).to.equal(2);
      expect(_.keys(view.children).length).to.equal(1);
      var newFirstKey = _.keys(view.children)[0];
      expect(firstKey).to.not.equal(newFirstKey);
    });
    it('should rerender a helper has depth', function() {
      view = new Thorax.View({
        template: '{{#test}}{{../foo}}{{/test}}'
      });
      view.render();
      expect(spy.callCount).to.equal(1);
      expect(_.keys(view.children).length).to.equal(1);
      var firstKey = _.keys(view.children)[0];

      view.render();
      expect(spy.callCount).to.equal(2);
      expect(_.keys(view.children).length).to.equal(1);
      var newFirstKey = _.keys(view.children)[0];
      expect(firstKey).to.not.equal(newFirstKey);
    });
    it('should cooperate with each loops', function() {
      view = new Thorax.View({
        template: '{{#each keys}}{{#test}}@index{{/test}}{{/each}}',
        keys: _.range(5)
      });
      view.render();
      expect(spy.callCount).to.equal(5);
      expect(_.keys(view.children).length).to.equal(5);

      view.render();
      expect(spy.callCount).to.equal(5);
      expect(_.keys(view.children).length).to.equal(5);
    });

    it('should destroy old children on re-render', function() {
      view = new Thorax.View({
        template: '{{#test key}}{{/test}}',
        key: 1
      });
      view.render();
      expect(spy.callCount).to.equal(1);
      expect(_.keys(view.children).length).to.equal(1);
      var child = _.first(_.values(view.children));
      this.spy(child, 'destroy');

      view.key = 2;
      view.render();
      expect(spy.callCount).to.equal(2);
      expect(child.destroy.callCount).to.equal(1);
    });
  });
});
