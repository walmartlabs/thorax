describe('HelperView', function() {
  it('should allow an empty template', function() {
    var spy = this.spy();
    Handlebars.registerViewHelper('test', spy);
    var view = new Thorax.View({
      template: '{{test}}'
    });
    view.render();
    expect(spy.callCount).to.equal(1);
    delete Handlebars.helpers.test;
  });

  it('should destroy old children on re-render', function() {
    var spy = this.spy(function(view) {
      return view;
    });
    Handlebars.registerViewHelper('test', spy);
    var view = new Thorax.View({
      template: '{{#test}}{{/test}}'
    });
    view.render();
    expect(spy.callCount).to.equal(1, 'after render spy count');
    expect(_.keys(view.children).length).to.equal(1, 'after render child count');
    var firstKey = _.keys(view.children)[0];
    view.render();
    expect(spy.callCount).to.equal(2, 'after second render spy count');
    expect(_.keys(view.children).length).to.equal(1, 'after second render child count');
    var newFirstKey = _.keys(view.children)[0];
    expect(firstKey).to.not.equal(newFirstKey, 'after second render key equality');
    delete Handlebars.helpers.test;
  });
});