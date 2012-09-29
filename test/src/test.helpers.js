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
    var callCount = 0, eventCallCount = 0;
    var view = new Thorax.View({
      events: {
        testEvent: function() {
          ++eventCallCount;
        }
      },
      someMethod: function(){
        ++callCount;
      },
      template: '{{#button "someMethod"}}Button{{/button}}{{#button trigger="testEvent"}}Button 2{{/button}}{{#link "href"}}content{{/link}}'
    });
    view.render();
    equal(view.$('button').html(),'Button');
    equal(view.$('a').html(),'content');
    equal(view.$('a').attr('href'),'#href');

    $('body').append(view.el);
    this.clock.restore();  
    expect(7);
    stop();
    setTimeout(function() {
      $(view.$('button')[0]).trigger('click');
      equal(callCount, 1);
      equal(eventCallCount, 0);
      $(view.$('button')[1]).trigger('click');
      equal(eventCallCount, 1);
      equal(callCount, 1);
      $(view.el).remove();
      start();
    }, 2);
  });

});
