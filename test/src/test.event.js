$(function() {

  QUnit.module('Thorax Event');

  test("don't break existing event hash", function() {
    expect(6);
    var view = new Thorax.View({
      key: 'value',
      events: {
        test1: 'test1',
        test2: function() {
          equal(this.key, 'value');
          ok(true);
        }
      },
      test1: function() {
        equal(this.key, 'value');
        ok(true);
      }
    });
    view.trigger('test1');
    view.trigger('test2');

    view = new Thorax.View({
      events: function() {
        return {
          test3: 'test3'
        };
      },
      key: 'value',
      test3: function() {
        equal(this.key, 'value');
        ok(true);
      }
    });
    view.trigger('test3');
  });

  //ensure view.on('viewEventOne viewEventTwo') still works
  test("Inheritable events", function() {
    var originalLength = Thorax.View._events.length;
    var Parent = Thorax.View.extend({}),
        aCount = 0,
        bCount = 0;
    Parent.on({
      a: function() {
        ++aCount;
      }
    });
    var Child = Parent.extend({});
    Child.on({
      b: function() {
        ++bCount;
      }
    });
    var parent = new Parent(),
        child = new Child();
    parent.trigger('a');
    parent.trigger('b');
    child.trigger('a');
    child.trigger('b');
    equal(aCount, 2);
    equal(bCount, 1);

    //ensure events are properly cloned
    Parent = Thorax.View.extend();
    Parent.on({
      a: 1
    });

    Child = Parent.extend({});
    Child.on({
      a: 2
    });

    var ChildTwo = Parent.extend({});
    equal(Child._events[originalLength - 0][1], 1, 'ensure events are not shared between children');
    equal(Child._events.length - originalLength, 2, 'ensure events are not shared between children');
    equal(ChildTwo._events[originalLength - 0][1], 1, 'ensure events are not shared between children');
    equal(ChildTwo._events.length - originalLength, 1, 'ensure events are not shared between children');
  });

  test("multiple event registration", function() {
    var view = new Thorax.View(), a = 0, b = 0, c = 0, d = 0, e = 0;
    view.on({
      'a b': function() {
        ++a;
        ++b;
      },
      'c': [
        function() {
          ++c;
        },
        function() {
          ++c;
        }
      ],
      'd e': [
        function() {
          ++d;
        },
        function() {
          ++e;
        }
      ]
    });
    view.trigger('a');
    view.trigger('b c');
    view.trigger('d e');
    equal(a, 2);
    equal(b, 2);
    equal(c, 2);
    equal(d, 2);
    equal(e, 2);
  });

  test("auto dispose events", function() {
    var view = new Thorax.View({});
    var model = new Thorax.Model();
    var callCount = 0;
    view.on(model, 'test', function() {
      ++callCount;
    });
    model.trigger('test');
    equal(callCount, 1);
    view.freeze();
    model.trigger('test');
    equal(callCount, 1);
  });

  // TODO: simluated DOM events fail under Phantom + Zepto, but work in all
  // other scenarios, figure out why this test won't run
  if (!window.callPhantom || (window.callPhantom && typeof jQuery !== 'undefined')) {
    test("bindToView", function() {
      var childClickedCount = 0,
          parentClickedCount = 0;

      var Child = Thorax.View.extend({
        template: Thorax.templates['child'],
        events: {
          'click div': function() {
            ++childClickedCount;
          }
        }
      });

      var Parent = Thorax.View.extend({
        template: Thorax.templates['parent'],
        events: {
          'click div': function() {
            ++parentClickedCount;
          }
        },
        initialize: function() {
          this.child = new Child({
            value: 'a'
          });
        }
      });

      var parent = new Parent();
      $('body').append(parent.el);
      parent.render();
      $(parent.$('div')[0]).trigger('click');
      equal(parentClickedCount, 1);
      equal(childClickedCount, 0);
      parent.child.$('div').trigger('click');
      equal(parentClickedCount, 1);
      equal(childClickedCount, 1);
      parent.$el.remove();
    });
  }
});
