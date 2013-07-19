describe("auto helper currying", function() {
  it("should auto generate a view helper", function() {
    var view = new Thorax.View({
      template: Handlebars.compile("{{child}}"),
      child: new Thorax.View({
        tagName: 'span',
        template: Handlebars.compile('test')
      })
    });
    view.render();
    expect(view.$('span').html()).to.equal('test');
  });

  it("should auto generate a collection helper", function() {
    var view = new Thorax.View({
      template: Handlebars.compile("{{#list}}<li>{{key}}</li>{{/list}}"),
      list: new Thorax.Collection([{key: 'one'}])
    });
    view.render();
    expect(view.$('li').html()).to.equal('one');
  });

  it("should auto generate a with helper", function() {
    var view = new Thorax.View({
      template: Handlebars.compile("{{#model}}{{key}}{{/model}}"),
      model: new Thorax.Model({key: 'value'})
    });
    view.render();
    expect(view.html()).to.equal('value');

    var view = new Thorax.View({
      template: Handlebars.compile("{{#m}}{{key}}{{/m}}"),
      m: new Thorax.Model({key: 'value'})
    });
    view.render();
    expect(view.html()).to.equal('value');
  });

  it("can access model properties", function() {
    var view = new Thorax.View({
      template: Handlebars.compile("{{#model}}{{key}}{{/model}}{{model.attributes.key}}"),
      model: new Thorax.Model({key: 'value'})
    });
    view.render();
    expect(view.html()).to.equal('valuevalue');

    var view = new Thorax.View({
      template: Handlebars.compile("{{#m}}{{key}}{{/m}}{{m.attributes.key}}"),
      m: new Thorax.Model({key: 'value'})
    });
    view.render();
    expect(view.html()).to.equal('valuevalue');
  });

  it("can access collection properties", function() {
    var view = new Thorax.View({
      template: Handlebars.compile("{{#collection}}<li>{{key}}</li>{{/collection}}<span>{{collection.length}}</span>"),
      collection: new Thorax.Collection([{key: 'one'}])
    });
    view.render();
    expect(view.$('li').html()).to.equal('one');
    expect(view.$('span').html()).to.equal('1');

    var view = new Thorax.View({
      template: Handlebars.compile("{{#list}}<li>{{key}}</li>{{/list}}<span>{{list.length}}</span>"),
      list: new Thorax.Collection([{key: 'one'}])
    });
    view.render();
    expect(view.$('li').html()).to.equal('one');
    expect(view.$('span').html()).to.equal('1');
  });
});