describe('link helper with pushState', function() {
  before(function() {
    this.previousPushState = Backbone.history._hasPushState;
    Backbone.history._hasPushState = true;
  });

  after(function() {
    Backbone.history._hasPushState = this.previousPushState;
  });

  it("should not have double slashes if the argument starts with a slash", function() {
    var link = $(Handlebars.helpers.link({hash: {href: '/a'}}).toString());
    expect(link.attr('href')).to.equal('/a');
  });
});

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

  it('nested prevent default', function (done) {
    if ($serverSide) {
      return done();
    }

    var spy = this.spy(),
        view = new Thorax.View({
          template: Handlebars.compile('{{#link "test"}}<span>text</span>{{/link}}')
        });
    // Make sure that hash change is only triggered once
    $(document).on('click.test.prevent-default', function (e) {
      expect(e.isDefaultPrevented()).to.equal(true);
      done();
    });
    // Append the view to the body for testing
    view.appendTo(document.body);
    view.retain();
    view.$('a span').trigger('click');
    view.$el.remove();
    $(document).off('click.test.prevent-default');
  });

  it("does not invoke Backbone.Navigate if when shift or meta keys are pressed on {{#links}}", function() {
    var spy = sinon.spy(Backbone.history, 'navigate');

    var view = new Thorax.View({
      template: Handlebars.compile("{{#link '#test'}}Link{{/link}}")
    });
    var el = view.$('a').get(0);

    view._anchorClick({ metaKey: true,  currentTarget: el });
    view._anchorClick({ shiftKey: true, currentTarget: el });

    expect(spy.called).to.equal(false);

    spy.restore();
  });
});
