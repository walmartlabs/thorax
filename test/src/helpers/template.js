describe('template helper', function() {
  it("template function can be specified", function() {
    var childReturningString = new Thorax.View({
      template: function(data, options) {
        expect(options.data.cid).to.match(/^t/);
        return 'template';
      }
    });
    childReturningString.render();
    expect(childReturningString.html()).to.equal('template');
    var childReturningElement = new Thorax.View({
      template: function() {
        return $('<p>template</p>')[0];
      }
    });
    childReturningElement.render();
    expect(childReturningElement.$('p').html()).to.equal('template');
    var childReturning$ = new Thorax.View({
      template: function() {
        return $('<p>template</p>');
      }
    });
    childReturning$.render();
    expect(childReturning$.$('p').html()).to.equal('template');
  });

  it("template yield", function() {
    Thorax.templates['yield-child'] = Handlebars.compile('<span>{{@yield}}</span>');
    Thorax.templates['yield-parent'] = Handlebars.compile('<p>{{#template "yield-child"}}content{{/template}}</p>');
    var view = new Thorax.View({
      name: 'yield-parent'
    });
    view.render();
    expect(view.$('p > span').html()).to.equal('content');
  });
});
