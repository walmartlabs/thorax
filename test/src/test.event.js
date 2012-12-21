describe('event', function() {
  it("don't break existing event hash", function() {
    var spy = this.spy();

    var view = new Thorax.View({
      key: 'value',
      events: {
        test1: 'test1',
        test2: spy
      },
      test1: spy
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
      test3: spy
    });
    view.trigger('test3');
    expect(spy.callCount).to.equal(3);
  });

  //ensure view.on('viewEventOne viewEventTwo') still works
  it("Inheritable events", function() {
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
    expect(aCount).to.equal(2);
    expect(bCount).to.equal(1);

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
    expect(Parent._events[0][1]).to.equal(1, 'ensure events are not shared between children');
    expect(Parent._events.length).to.equal(1, 'ensure events are not shared between children');
    expect(Child._events[0][1]).to.equal(2, 'ensure events are not shared between children');
    expect(Child._events.length).to.equal(1, 'ensure events are not shared between children');
    expect(ChildTwo._events.length).to.equal(0, 'ensure events are not shared between children');
  });

  it("inherit prototype event hash", function() {
    var spy = this.spy();

    var View = Thorax.View.extend({
      key: 'value',
      events: {
        test1: 'test1',
        test2: spy
      },
      test1: spy
    });

    var view = new View();
    view.trigger('test1');
    view.trigger('test2');

    view = new View({
      events: function() {
        return {
          test3: 'test3'
        };
      },
      key: 'value',
      test3: spy
    });
    view.trigger('test1');
    view.trigger('test2');
    view.trigger('test3');

    View = View.extend({
      events: function() {
        return {
          test3: 'test3'
        };
      },
      key: 'value',
      test3: spy
    });
    view = new View();
    view.trigger('test1');
    view.trigger('test2');
    view.trigger('test3');
    expect(spy.callCount).to.equal(8);
  });

  it("event map", function() {
    var spy = this.spy(),
        view = new Thorax.View();
    view.on({test: spy});
    view.trigger('test');
    expect(spy.callCount).to.equal(1);
  });

  it("multiple event registration", function() {
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
    expect(a).to.equal(2);
    expect(b).to.equal(2);
    expect(c).to.equal(2);
    expect(d).to.equal(2);
    expect(e).to.equal(2);
  });

  it("unbindModel / unbindCollection stops events from being triggered", function() {
    var spy = this.spy();
    var view = new Thorax.View({
      events: {
        model: {
          test: spy
        }
      }
    });
    view.myModel = new Thorax.Model({key: 'value'});
    view.bindModel(view.myModel, {render: false});
    expect(spy.callCount).to.equal(0);
    view.myModel.trigger('test');
    expect(spy.callCount).to.equal(1);
    view.unbindModel(view.myModel);
    view.myModel.trigger('test');
    expect(spy.callCount).to.equal(1);
  });

  // TODO: simluated DOM events fail under Phantom + Zepto, but work in all
  // other scenarios, figure out why this test won't run
  if (!window.callPhantom || (window.callPhantom && typeof jQuery !== 'undefined')) {
    it("bindToView", function() {
      var childClickedCount = 0,
          parentClickedCount = 0;

      var Child = Thorax.View.extend({
        template: Thorax.templates.child,
        events: {
          'click div': function() {
            ++childClickedCount;
          }
        }
      });

      var Parent = Thorax.View.extend({
        template: Thorax.templates.parent,
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
      expect(parentClickedCount).to.equal(1);
      expect(childClickedCount).to.equal(0);
      parent.child.$('div').trigger('click');
      expect(parentClickedCount).to.equal(1);
      expect(childClickedCount).to.equal(1);
      parent.$el.remove();
    });
  }
});
