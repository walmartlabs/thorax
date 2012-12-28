describe("context", function() {
  it("should expose key in template", function() {
    var view = new (Thorax.View.extend({
      template: '{{key}}'
    }))({key: 'value'});
    view.render();
    expect(view.html()).to.equal('value');
  });
});