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

  describe('urls are properly encoded', function () {
    it('when joining multiple arguments automatically', function () {
      // uses encodeURIComponent in /src/helpers/url.js
      var slug = "hello world, sup!",
          actual = Handlebars.helpers.url('articles', slug, {}),
          expected = '#articles/hello%20world%2C%20sup!';

      expect(actual).to.equal(expected);
    });
    it('when using expand-tokens=true (bug)', function () {
      // uses Thorax.Util.expandToken from /src/util.js, line 260
      var context = {slug: "hello world, sup!"},
          actual = Handlebars.helpers.url.call(context, '/articles/{{slug}}', {'expand-tokens': true}),
          expected = '#/articles/hello%20world%2C%20sup!';

      expect(actual).to.equal(expected);
    });
  });
});
