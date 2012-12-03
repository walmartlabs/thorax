$(function() {

  QUnit.module('Thorax Helpers');

  test("url helper", function() {
    var view = new Thorax.View({
      template: '<a href="{{url "/a/{{b}}" expand-tokens=true}}"></a>'
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

    var view = new Thorax.View({
      template: '<a href="{{url "a" b}}"></a>',
      b: 'c'
    });
    view.render();
    equal(view.$('a').attr('href'), '#a/c');
  });

  test("option hash required arguments for button and link", function() {
    var view = new Thorax.View({
      template: '{{#link href="a"}}{{/link}}{{#button method="b"}}{{/button}}'
    });
    view.render();
    equal(view.$('a').attr('href'), '#a');
    equal(view.$('button').attr('data-call-method'), 'b');
  });

  test("button and link helpers", function() {
    var view = new Thorax.View({
      events: {
        testEvent: function() {}
      },
      someMethod: function(){},
      template: '{{#button "someMethod"}}Button{{/button}}{{#button trigger="testEvent"}}Button 2{{/button}}{{#link "href"}}content{{/link}}'
    });
    view.render();
    equal($(view.$('button')[0]).html(),'Button');
    equal($(view.$('button')[0]).attr('data-call-method'), 'someMethod');
    equal($(view.$('button')[1]).attr('data-trigger-event'), 'testEvent');
    equal(view.$('a').html(),'content');
    equal(view.$('a').attr('href'),'#href');
  });

});
