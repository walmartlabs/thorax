describe('button-link helpers', function() {
  it("option hash required arguments for button and link", function() {
    var link = $(Handlebars.helpers.link({hash: {href: 'a'}}).toString()),
        button = $(Handlebars.helpers.button({hash: {method: 'b'}}).toString());
    expect(link.attr('href')).to.equal('#a');
    expect(button.attr('data-call-method')).to.equal('b');
  });

  it("multiple arguments to link", function() {
    var view = new Thorax.View({
      template: Handlebars.compile('{{#link a b c class="test"}}link{{/link}}'),
      a: 'a',
      b: 'b',
      c: 'c'
    });
    view.render();
    expect(view.$('a').attr('href')).to.equal('#a/b/c');
  });

  it("expand-tokens in link", function() {
    var view = new Thorax.View({
      template: Handlebars.compile('{{#link "a/{{key}}"}}link{{/link}}'),
      key: 'b'
    });
    view.render();
    expect(view.$('a').attr('href')).to.equal('#a/{{key}}');

    view = new Thorax.View({
      template: Handlebars.compile('{{#link "a/{{key}}" expand-tokens=true}}link{{/link}}'),
      key: 'b'
    });
    view.render();
    expect(view.$('a').attr('href')).to.equal('#a/b');
    expect(view.$('a[expand-tokens]').length).to.equal(0);
  });

  it("allow empty string as link", function() {
    var view = new Thorax.View({
      template: Handlebars.compile('{{#link ""}}text{{/link}}')
    });
    view.render();
    expect(view.$('a').html()).to.equal('text');
  });

  it("button and link helpers", function() {
    var view = new Thorax.View({
      events: {
        testEvent: function() {}
      },
      someMethod: function() {},
      template: Handlebars.compile('{{#button "someMethod"}}Button{{/button}}{{#button trigger="testEvent"}}Button 2{{/button}}{{#link "href"}}content{{/link}}')
    });
    view.render();
    expect($(view.$('button')[0]).html()).to.equal('Button');
    expect($(view.$('button')[0]).attr('data-call-method')).to.equal('someMethod');
    expect($(view.$('button')[1]).attr('data-trigger-event')).to.equal('testEvent');
    expect(view.$('a').html()).to.equal('content');
    expect(view.$('a').attr('href')).to.equal('#href');
  });
});
