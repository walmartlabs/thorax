/*global $serverSide */
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

  it("unbindDataObject stops events from being triggered", function() {
    var spy = this.spy();
    var view = new Thorax.View({
      events: {
        model: {
          test: spy
        }
      }
    });
    view.myModel = new Thorax.Model({key: 'value'});
    view.bindDataObject('model', view.myModel, {render: false});
    expect(spy.callCount).to.equal(0);
    view.myModel.trigger('test');
    expect(spy.callCount).to.equal(1);
    view.unbindDataObject(view.myModel);
    view.myModel.trigger('test');
    expect(spy.callCount).to.equal(1);
  });

  // Regression: events starting with another event name would not trigger
  //  due to permissive regex
  it('should tigger change:view:end', function() {
    var view = new Thorax.View(),
        spy = this.spy();
    view.on('change:view:end', spy);
    view.trigger('change:view:end');
    expect(spy.calledOnce).to.be(true);
  });

  describe('dom events', function() {
    if ($serverSide) {
      return;
    }

    it("bindToView", function() {
      var childClickedCount = 0,
          parentClickedCount = 0;

      var Child = Thorax.View.extend({
        template: Handlebars.templates.child,
        events: {
          'click div': function() {
            ++childClickedCount;
          }
        }
      });

      var Parent = Thorax.View.extend({
        template: Handlebars.templates.parent,
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

    it("on works after el is created", function() {
      var spy = this.spy();
      var view = new Thorax.View();
      view.on('click', spy);
      $('body').append(view.el);

      view.$el.trigger('click');
      expect(spy.callCount).to.equal(1);

      view.$el.remove();
    });

    it("on works after _ensureElement but before delegateEvents (basically initialize)", function() {
      // this is useful for mixins for example
      var spy = this.spy();
      var TestView = Thorax.View.extend({
        initialize: function() {
          this.on({
            'click button': spy
          });
        },
        template: function() {
          return '<button>foo</button>';
        }
      });

      var view = new TestView();
      view.render();
      var el = view.$('button');
      expect(el.length).to.equal(1);
      $(document.body).append(view.$el);
      el.trigger('click');
      view.$el.remove();
      expect(spy.callCount).to.equal(1);
    });
  });

  it("on works after data object is set", function() {
    var spy = this.spy();
    var view = new Thorax.View({
      template: function() {return '';},
      model: new Thorax.Model({
        key: 'value'
      })
    });
    view.on({model: {event: spy}});
    view.model.trigger('event');
    expect(spy.callCount).to.equal(1);
  });

  it('should trigger ready event on layout view', function() {
    var spy = this.spy(),
        layoutView = new Thorax.LayoutView(),
        view = new Thorax.View({
          serverRender: true,
          events: {
            ready: spy
          },
          template: function() {}
        });
    expect(spy.callCount).to.equal(0, 'ready event will trigger via LayoutView');
    layoutView.appendTo(document.body);
    layoutView.setView(view, {async: false});
    expect(spy.callCount).to.equal(1, 'ready event will trigger via LayoutView');
  });

  it("should trigger ready event on children", function() {
    var spy = this.spy(),
        layoutView = new Thorax.LayoutView(),
        view = new Thorax.View({
          serverRender: true,
          child: new Thorax.View({
            template: function() {},
            events: {
              ready: spy
            }
          }),
          template: Handlebars.compile('{{view child}}')
        });
    expect(spy.callCount).to.equal(0, 'ready event will trigger via LayoutView');
    layoutView.setView(view, {async: false});
    expect(spy.callCount).to.equal(1, 'ready event will trigger via LayoutView');

    var secondChildSpy = this.spy(),
        secondChild = new Thorax.View({
          events: {
            ready: secondChildSpy
          },
          template: Handlebars.compile('test')
        });
    expect(secondChildSpy.callCount).to.equal(0, 'adding a child to a view that is ready should immediately trigger');
    view._addChild(secondChild);
    expect(secondChildSpy.callCount).to.equal(1, 'adding a child to a view that is ready should immediately trigger');

    var itemViewSpy = this.spy();
    var collectionView = new Thorax.View({
      itemView: Thorax.View.extend({
        events: {
          ready: itemViewSpy
        },
        tagName: 'li',
        template: Handlebars.compile('{{key}}')
      }),
      collection: new Thorax.Collection([
        {key: 'one'},
        {key: 'two'},
        {key: 'three'}
      ]),
      template: Handlebars.compile('{{collection tag="ul"}}')
    });
    collectionView.render();
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

  describe('cleanup', function() {
    it('should cleanup backbone events on off', function() {
      var view = new Thorax.View(),
          spy = this.spy();
      view.on('foo', spy);

      view.trigger('foo');
      expect(spy.calledOnce).to.be(true);

      view.off('foo', spy);

      view.trigger('foo');
      expect(spy.calledOnce).to.be(true);
    });
    it('should cleanup backbone events on release', function() {
      var spy = this.spy(),
          view = new Thorax.View({
            events: {
              model: {
                foo: spy
              }
            },
            model: new Thorax.Model(),
            template: function() {}
          }),
          model = view.model;

      model.trigger('foo');
      expect(spy.calledOnce).to.be(true);

      view.release();

      model.trigger('foo');
      expect(spy.calledOnce).to.be(true);
    });
    it('should cleanup DOM events on release', function() {
      if ($serverSide) {
        return;
      }

      var spy = this.spy(),
          view = new Thorax.View({
            events: {
              'mousedown a': spy,
              'mousedown': spy
            }
          }),
          $el = view.$el;

      $el.html('<a href="foo">bar</a>');
      document.body.appendChild(view.el);

      $el.find('a').trigger('mousedown');
      expect(spy.calledTwice).to.be(true);

      view.release();

      $el.find('a').trigger('mousedown');
      expect(spy.calledTwice).to.be(true);
    });
    it('should cleanup listening view events on release', function() {
      var spy = this.spy(),
          View = Thorax.View.extend({
            template: function() {}
          }),
          view = new View(),
          other = new View();

      other.on('foo', spy, view);
      other.trigger('foo');

      expect(spy.calledOnce).to.be(true);
      expect(spy.calledOn(view)).to.be(true);

      view.release();

      other.trigger('foo');
      expect(spy.calledOnce).to.be(true);
    });
    it('should cleanup own view events on release', function() {
      var spy = this.spy(),
          View = Thorax.View.extend({
            template: function() {}
          }),
          view = new View();

      view.on('foo', spy);
      view.trigger('foo');

      expect(spy.calledOnce).to.be(true);
      expect(spy.calledOn(view)).to.be(true);

      view.release();

      view.trigger('foo');
      expect(spy.calledOnce).to.be(true);
    });
  });

  describe('context', function() {
    var view, spy,
        context = {};
    beforeEach(function() {
      view = new Thorax.View();

      // IE needs to have the element in the DOM for click handling
      $('body').append(view.$el);

      spy = this.spy();
    });
    afterEach(function() {
      view.release();
    });

    describe('view events', function() {
      it('should use view', function() {
        view.on('foo', spy);
        view.trigger('foo');
        expect(spy.calledOnce).to.be(true);
        expect(spy.alwaysCalledOn(view)).to.be(true);
      });
      it('should pass context', function() {
        view.on('foo', spy, context);
        view.trigger('foo');
        expect(spy.calledOnce).to.be(true);
        expect(spy.alwaysCalledOn(context)).to.be(true);
      });
    });

    describe('object view events', function() {
      it('should use view', function() {
        view.on({foo: spy});
        view.trigger('foo');
        expect(spy.calledOnce).to.be(true);
        expect(spy.alwaysCalledOn(view)).to.be(true);
      });
      it('should pass context', function() {
        view.on({foo: spy}, context);
        view.trigger('foo');
        expect(spy.calledOnce).to.be(true);
        expect(spy.alwaysCalledOn(context)).to.be(true);
      });
    });
    describe('data object events', function() {
      it('should use view', function() {
        var model = new Thorax.Model();
        view.on({model: {foo: spy}});
        view.setModel(model, {render: false, fetch: false});
        model.trigger('foo');
        expect(spy.calledOnce).to.be(true);
        expect(spy.alwaysCalledOn(view)).to.be(true);
      });
      it('should pass context', function() {
        var model = new Thorax.Model();
        view.on({model: {foo: spy}}, context);
        view.setModel(model, {render: false, fetch: false});
        model.trigger('foo');
        expect(spy.calledOnce).to.be(true);
        expect(spy.alwaysCalledOn(context)).to.be(true);
      });
    });
    describe('dom events', function() {
      if ($serverSide) {
        return;
      }

      it('should use view', function() {
        view.on('click', spy);
        view.delegateEvents();
        view.$el.trigger('click');
        expect(spy.calledOnce).to.be(true);
        expect(spy.alwaysCalledOn(view)).to.be(true);
      });
      it('should pass context', function() {
        view.on('click', spy, context);
        view.delegateEvents();
        view.$el.trigger('click');
        expect(spy.calledOnce).to.be(true);
        expect(spy.alwaysCalledOn(context)).to.be(true);
      });
    });
  });
});
