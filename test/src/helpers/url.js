describe('url helper', function() {
  it("url helper", function() {
    var href = Handlebars.helpers.url.call({}, '/a/{{b}}', {'expand-tokens': true});
    expect(href).to.equal('#/a/');
    href = Handlebars.helpers.url.call({b: 'b'}, '/a/{{b}}', {'expand-tokens': true});
    expect(href).to.equal('#/a/b');
    href = Handlebars.helpers.url.call({b: 'c'}, '/a/{{b}}', {'expand-tokens': true});
    expect(href).to.equal('#/a/c');

    href = Handlebars.helpers.url('a', 'c', {});
    expect(href).to.equal('#a/c');
  });
});
