describe('helpers', function() {
  it("url helper", function() {
    var view = new Thorax.View({
      template: '<a href="{{url "/a/{{b}}" expand-tokens=true}}"></a>'
    });
    view.render();
    expect(view.$('a').attr('href')).to.equal('#/a/');
    view.b = 'b';
    view.render();
    expect(view.$('a').attr('href')).to.equal('#/a/b');
    view.b = false;
    view.setModel(new Backbone.Model({
      b: 'c'
    }));
    expect(view.$('a').attr('href')).to.equal('#/a/c');

    var view = new Thorax.View({
      template: '<a href="{{url "a" b}}"></a>',
      b: 'c'
    });
    view.render();
    expect(view.$('a').attr('href')).to.equal('#a/c');
  });

  it("option hash required arguments for button and link", function() {
    var view = new Thorax.View({
      template: '{{#link href="a"}}{{/link}}{{#button method="b"}}{{/button}}'
    });
    view.render();
    expect(view.$('a').attr('href')).to.equal('#a');
    expect(view.$('button').attr('data-call-method')).to.equal('b');
  });

  it("multiple arguments to link", function() {
    var view = new Thorax.View({
      template: '{{#link a b c class="test"}}link{{/link}}',
      a: 'a',
      b: 'b',
      c: 'c'
    });
    view.render();
    expect(view.$('a').attr('href')).to.equal('#a/b/c');
  });

  it("expand-tokens in link", function() {
    var view = new Thorax.View({
      template: '{{#link "a/{{key}}"}}link{{/link}}',
      key: 'b'
    });
    view.render();
    expect(view.$('a').attr('href')).to.equal('#a/{{key}}');

    view = new Thorax.View({
      template: '{{#link "a/{{key}}" expand-tokens=true}}link{{/link}}',
      key: 'b'
    });
    view.render();
    expect(view.$('a').attr('href')).to.equal('#a/b');
    expect(view.$('a[expand-tokens]').length).to.equal(0);
  });

  it("button and link helpers", function() {
    var view = new Thorax.View({
      events: {
        testEvent: function() {}
      },
      someMethod: function() {},
      template: '{{#button "someMethod"}}Button{{/button}}{{#button trigger="testEvent"}}Button 2{{/button}}{{#link "href"}}content{{/link}}'
    });
    view.render();
    expect($(view.$('button')[0]).html()).to.equal('Button');
    expect($(view.$('button')[0]).attr('data-call-method')).to.equal('someMethod');
    expect($(view.$('button')[1]).attr('data-trigger-event')).to.equal('testEvent');
    expect(view.$('a').html()).to.equal('content');
    expect(view.$('a').attr('href')).to.equal('#href');
  });
});
