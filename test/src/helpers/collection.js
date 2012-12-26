describe('collection helper', function() {
  it('should have access to handlebars noop', function() {
    // Explicit verification that Handlebars is exposing this field.
    expect(Handlebars.VM.noop).to.exist;
  });
});
