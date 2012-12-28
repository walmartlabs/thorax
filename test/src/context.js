describe("context", function() {
  it("should expose key in template", function() {
    var view = new (Thorax.View.extend({
      template: '{{key}}'
    }))({key: 'value'});
    view.render();
    expect(view.html()).to.equal('value');
  });

  it("render option should re-render view", function() {
    var view = new (Thorax.View.extend({
      template: '{{key}}'
    }));
    view.render();
    expect(view.html()).to.equal('');
    view.set({key: 'value'});
    expect(view.html()).to.equal('');
    view.render();
    expect(view.html()).to.equal('value');
    view.set({key: 'value2'}, {render: true});
    expect(view.html()).to.equal('value2');
    // Keep changing to ensure "render" option is not stored
    view.set('key', 'value');
    expect(view.html()).to.equal('value2');
    view.render();
    expect(view.html()).to.equal('value');
  });
});