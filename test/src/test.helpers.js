$(function() {

  QUnit.module('Thorax Helpers');

  test("url helper", function() {
    var view = new Thorax.View({
      template: '<a href="{{url "/a/:b"}}"></a>'
    });
    view.render();
    equal(view.$('a').attr('href'), '#/a/:b');
    view.b = 'b';
    view.render();
    equal(view.$('a').attr('href'), '#/a/b');
    view.b = false;
    view.setModel(new Backbone.Model({
      b: 'c'
    }));
    equal(view.$('a').attr('href'), '#/a/c');
    view.setModel(false);
    view.render();
    equal(view.$('a').attr('href'), '#/a/:b');

    var view = new Thorax.View({
      template: '<a href="{{url "/a/{{b}}"}}"></a>'
    });
    view.render();
    equal(view.$('a').attr('href'), '#/a/');
    view.b = 'b';
    view.render();
    equal(view.$('a').attr('href'), '#/a/b');
    view.b = false;
    view.setModel(new Backbone.Model({
      b: 'c'
    }));
    equal(view.$('a').attr('href'), '#/a/c');
  });

  test("button and link helpers", function() {
    var view = new Thorax.View({
      someMethod: function(){},
      template: '{{#button "someMethod"}}Button{{/button}}{{#link "href"}}content{{/link}}'
    });
    view.render();
    equal(view.$('button').html(),'Button');
    equal(view.$('a').html(),'content');
    equal(view.$('a').attr('href'),'#href');
  });
});
