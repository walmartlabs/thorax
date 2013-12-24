var assert = chai.assert;

describe('View', function () {
  var Frameworks = [
    {frameworkName: 'Backbone', obj: Backbone},
    {frameworkName: 'Thorax', obj: Thorax}
  ];

  /**
   * Loop through both frameworks so writing one set of tests runs them
   * in both frameworks, e.g., Backbone or Thorax (given our goal is to make
   * Thorax version of view.listenTo work identical to Backbone version
   */
  var Framework, frameworkName;
  for (var i = 0; i < Frameworks.length; i++) {
    frameworkName = Frameworks[i].frameworkName;
    Framework = Frameworks[i].obj;

    executeTests(Frameworks[i].obj, Frameworks[i].frameworkName);
  }
});


function executeTests(Framework, frameworkName) {

  describe(frameworkName, function () {

    it('has a version if its backbone', function () {
      if (frameworkName == 'Backbone') {
        window.console.log("The Backbone Version is: ", Backbone.VERSION);
      }
    });

    describe('Baseline Specs', function () {
      var view;

      beforeEach(function () {
        view = new Framework.View({
          id        : 'test-view',
          className : 'test-view',
          other     : 'non-special-option'
        });
      });

      it("delegateEvents", function() {
        var counter1 = 0, counter2 = 0;

        var view = new Framework.View({el: '#testElement'});
        view.increment = function(){ counter1++; };
        view.$el.on('click', function(){ counter2++; });

        var events = {'click h1': 'increment'};

        view.delegateEvents(events);
        view.$('h1').trigger('click');
        assert.equal(counter1, 1);
        assert.equal(counter2, 1);

        view.$('h1').trigger('click');
        assert.equal(counter1, 2);
        assert.equal(counter2, 2);

        view.delegateEvents(events);
        view.$('h1').trigger('click');
        assert.equal(counter1, 3);
        assert.equal(counter2, 3);
      });

      it("delegateEvents allows functions for callbacks", function() {
        var view = new Framework.View({el: '<p></p>'});
        view.counter = 0;

        var events = {
          click: function() {
            this.counter++;
          }
        };

        view.delegateEvents(events);
        view.$el.trigger('click');
        assert.equal(view.counter, 1);

        view.$el.trigger('click');
        assert.equal(view.counter, 2);

        view.delegateEvents(events);
        view.$el.trigger('click');
        assert.equal(view.counter, 3);
      });


      it("delegateEvents ignore undefined methods", function() {
        var view = new Framework.View({el: '<p></p>'});
        view.delegateEvents({'click': 'undefinedMethod'});
        view.$el.trigger('click');
      });

      it("undelegateEvents", function() {
        var counter1 = 0, counter2 = 0;

        var view = new Framework.View({el: '#testElement'});
        view.increment = function(){ counter1++; };
        view.$el.on('click', function(){ counter2++; });

        var events = {'click h1': 'increment'};

        view.delegateEvents(events);
        view.$('h1').trigger('click');
        assert.equal(counter1, 1);
        assert.equal(counter2, 1);

        view.undelegateEvents();
        view.$('h1').trigger('click');
        assert.equal(counter1, 1);
        assert.equal(counter2, 2);

        view.delegateEvents(events);
        view.$('h1').trigger('click');
        assert.equal(counter1, 2);
        assert.equal(counter2, 3);
      });

      // it("_ensureElement with DOM node el", function() {
      //   var View = Framework.View.extend({
      //     el: document.body
      //   });

      //   assert.equal(new View().el, document.body);
      // });

      it("_ensureElement with string el", function() {
        var View = Framework.View.extend({
          el: "body"
        });
        assert.strictEqual(new View().el, document.body);

        View = Framework.View.extend({
          el: "#testElement > h1"
        });
        assert.strictEqual(new View().el, $("#testElement > h1").get(0));

        View = Framework.View.extend({
          el: "#nonexistent"
        });
        assert.ok(!new View().el);
      });

      it("multiple views per element", function() {
        var count = 0;
        var $el = $('<p></p>');

        var View = Framework.View.extend({
          el: $el,
          events: {
            click: function() {
              count++;
            }
          }
        });

        var view1 = new View;
        $el.trigger("click");
        assert.equal(1, count);

        var view2 = new View;
        $el.trigger("click");
        assert.equal(3, count);

        view1.delegateEvents();
        $el.trigger("click");
        assert.equal(5, count);
      });

      it("custom events, with namespaces", function() {
        var count = 0;

        var View = Framework.View.extend({
          el: $('body'),
          events: function() {
            return {"fake$event.namespaced": "run"};
          },
          run: function() {
            count++;
          }
        });

        var view = new View;
        $('body').trigger('fake$event').trigger('fake$event');
        assert.equal(count, 2);

        $('body').off('.namespaced');
        $('body').trigger('fake$event');
        assert.equal(count, 2);
      });

      it("views stopListening", function() {
        var View = Framework.View.extend({
          initialize: function() {
            this.listenTo(this.model, 'all x', function(){ assert.ok(false); }, this);
            this.listenTo(this.collection, 'all x', function(){ assert.ok(false); }, this);
          }
        });

        var view = new View({
          model: new Framework.Model,
          collection: new Framework.Collection
        });

        view.stopListening();
        view.model.trigger('x');
        view.collection.trigger('x');
      });

      it("events passed in options", function() {
        var counter = 0;

        var View = Framework.View.extend({
          el: '#testElement',
          increment: function() {
            counter++;
          }
        });

        var view = new View({
          events: {
            'click h1': 'increment'
          }
        });

        view.$('h1').trigger('click').trigger('click');
        assert.equal(counter, 2);
      });

      it("unique test not pulled from backbone, use listenTo", function() {
        var counter = 0;

        var View = Framework.View.extend({
          el: '#testElement',
          increment: function() {
            counter++;
          }
        });

        var bookView = new View({
          events: {
            'click h1': 'increment'
          }
        });

        var libraryView = new View();

        libraryView.listenTo(bookView, {
          'click a': function(event) {
            expect(this).to.eq(bookView);
            this.increment();
          }
        });

        view.$('h1').trigger('click').trigger('click');
        assert.equal(counter, 2);
      });
    });

  });

}