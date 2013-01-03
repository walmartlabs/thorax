describe('event', function() {
  it("don't break existing event hash", function() {
    var spy = this.spy();

    var view = new (Thorax.View.extend({
      events: {
        test1: 'test1',
        test2: spy
      },
      test1: spy
    }));
    view.trigger('test1');
    view.trigger('test2');

    view = new (Thorax.View.extend({
      events: function() {
        return {
          test3: 'test3'
        };
      },
      test3: spy
    }));
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

    view = new (View.extend({
      events: function() {
        return {
          test3: 'test3'
        };
      },
      test3: spy
    }));
    view.trigger('test1');
    view.trigger('test2');
    view.trigger('test3');

    View = View.extend({
      events: function() {
        return {
          test3: 'test3'
        };
      },
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

  it("unbindDataObject stops events from being triggered", function() {
    var spy = this.spy();
    var view = new (Thorax.View.extend({
      events: {
        model: {
          test: spy
        }
      }
    }));
    var model = new Thorax.Model({key: 'value'});
    view.set('model', model, {render: false});
    expect(spy.callCount).to.equal(0);
    model.trigger('test');
    expect(spy.callCount).to.equal(1);
    view.unset('model');
    model.trigger('test');
    expect(spy.callCount).to.equal(1);
  });

  // Regression: events starting with another event name would not trigger
  //  due to permissive regex
  it('should tigger change:view:end', function() {
    var view = new Thorax.View(),
        spy = this.spy();
    view.on('change:view:end', spy);
    view.trigger('change:view:end');
    expect(spy).to.have.been.calledOnce;
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
          this.set('child', new Child({
            value: 'a'
          }));
        }
      });

      var parent = new Parent();
      $('body').append(parent.el);
      parent.render();
      $(parent.$('div')[0]).trigger('click');
      expect(parentClickedCount).to.equal(1);
      expect(childClickedCount).to.equal(0);
      parent.get('child').$('div').trigger('click');
      expect(parentClickedCount).to.equal(1);
      expect(childClickedCount).to.equal(1);
      parent.$el.remove();
    });
  }

  it("should trigger ready event on children", function() {
    var spy = this.spy(),
        layoutView = new Thorax.LayoutView(),
        view = new (Thorax.View.extend({
          template: '{{view child}}'
        }));
    view.set('child', new (Thorax.View.extend({
      template: '',
      events: {
        ready: spy
      }
    })));
    expect(spy.callCount).to.equal(0, 'ready event will trigger via LayoutView');
    layoutView.setView(view);
    expect(spy.callCount).to.equal(1, 'ready event will trigger via LayoutView');

    var secondChildSpy = this.spy(),
        secondChild = new (Thorax.View.extend({
          events: {
            ready: secondChildSpy
          },
          template: 'test'
        }));
    expect(secondChildSpy.callCount).to.equal(0, 'adding a child to a view that is ready should immediately trigger');
    view.set('secondChild', secondChild);
    expect(secondChildSpy.callCount).to.equal(1, 'adding a child to a view that is ready should immediately trigger');

    var itemViewSpy = this.spy();    
    var collectionView = new (Thorax.View.extend({
      itemView: Thorax.View.extend({
        events: {
          ready: itemViewSpy
        },
        tagName: 'li',
        template: '{{key}}'
      }),
      template: '{{collection tag="ul"}}'
    }));
    collectionView.set('collection', new Thorax.Collection([
      {key: 'one'},
      {key: 'two'},
      {key: 'three'}
    ]));
    expect(itemViewSpy.callCount).to.equal(0, 'ready event triggered via collection');
    collectionView.trigger('ready');
    expect(collectionView.$('li').length).to.equal(3, 'ready event triggered via collection');
    expect(collectionView.$('li').eq(0).html()).to.equal('one', 'ready event triggered via collection');
    expect(itemViewSpy.callCount).to.equal(3, 'ready event triggered via collection');
    collectionView.collection.add(new Thorax.Model({key: 'four'}));
    expect(collectionView.$('li').length).to.equal(4, 'ready event triggered via collection:add');
    expect(collectionView.$('li').eq(3).html()).to.equal('four', 'ready event triggered via collection:add');
    expect(itemViewSpy.callCount).to.equal(4, 'ready event triggered via collection:add');

  });

  describe('context', function() {
    var view, spy,
        context = {};
    beforeEach(function() {
      view = new Thorax.View();
      spy = this.spy();
    });

    describe('view events', function() {
      it('should use view', function() {
        view.on('foo', spy);
        view.trigger('foo');
        expect(spy).to.have.been.calledOnce
            .to.be.always.calledOn(view);
      });
      it('should pass context', function() {
        view.on('foo', spy, context);
        view.trigger('foo');
        expect(spy).to.have.been.calledOnce
            .to.be.always.calledOn(context);
      });
    });

    describe('object view events', function() {
      it('should use view', function() {
        view.on({foo: spy});
        view.trigger('foo');
        expect(spy).to.have.been.calledOnce
            .to.be.always.calledOn(view);
      });
      it('should pass context', function() {
        view.on({foo: spy}, context);
        view.trigger('foo');
        expect(spy).to.have.been.calledOnce
            .to.be.always.calledOn(context);
      });
    });
    describe('data object events', function() {
      it('should use view', function() {
        var model = new Thorax.Model();
        view.on({model: {foo: spy}});
        view.set('model', model, {render: false, fetch: false});
        model.trigger('foo');
        expect(spy).to.have.been.calledOnce
            .to.be.always.calledOn(view);
      });
      it('should pass context', function() {
        var model = new Thorax.Model();
        view.on({model: {foo: spy}}, context);
        view.set('model', model, {render: false, fetch: false});
        model.trigger('foo');
        expect(spy).to.have.been.calledOnce
            .to.be.always.calledOn(context);
      });
    });
    describe('dom events', function() {
      beforeEach(function() {
        this.stub(view.$el, 'on', function(event, selector, callback) {
          if (selector === 'foo') {
            callback($.Event());
          }
        });
        this.stub($.fn, 'view', function() { return view; });
      });

      it('should use view', function() {
        view.on('click foo', spy);
        view.delegateEvents();
        expect(spy).to.have.been.calledOnce
            .to.be.always.calledOn(view);
      });
      it('should pass context', function() {
        view.on('click foo', spy, context);
        view.delegateEvents();
        expect(spy).to.have.been.calledOnce
            .to.be.always.calledOn(context);
      });
    });
  });
});
