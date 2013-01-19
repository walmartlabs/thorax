describe('helper-view', function() {
  it('should nest helper view instances', function() {
    Handlebars.registerViewHelper('test', function(viewHelper) {
      expect(view.cid).to.equal(viewHelper.parent.cid);
    });
    var view = new Thorax.View({
      name: 'outer',
      template: '{{#test}}{{#test}}{{#test}}{{key}}{{/test}}{{/test}}{{/test}}',
      key: 'value'
    });
    view.render();
    expect(view.$('[data-view-helper]')[2].innerHTML).to.equal('value');
    delete Handlebars.helpers.test;
  });
});
