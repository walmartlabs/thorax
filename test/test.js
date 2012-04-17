$(function() {

  Thorax.configure({
    templatePathPrefix: ''
  });

  Application.templates = {
    'letter.handlebars': Handlebars.compile('{{collection tag="ul"}}'), 
    'letter-item.handlebars': Handlebars.compile("<li>{{letter}}</li>"),
    'letter-empty.handlebars': Handlebars.compile("<li>empty</li>"),
    'letter-multiple-item.handlebars': Handlebars.compile("<li>{{letter}}</li><li>{{letter}}</li>"),
    'parent.handlebars': Handlebars.compile("<div>{{view child}}</div>"),
    'child.handlebars': Handlebars.compile("{{value}}")
  };

  var LetterModel = Thorax.Model.extend({});

  var letterCollection = new Thorax.Collection(['a','b','c','d'].map(function(letter) {
    return {letter: letter};
  }));

  var LetterCollectionView = Thorax.View.extend({
    name: 'letter'
  });

  var LetterItemView = Thorax.View.extend({
    name: 'letter-item'
  });

  test("isPopulated()", function() {
    ok(letterCollection.isPopulated());
    ok(letterCollection.at(0).isPopulated());
  });

  test("Model View binding", function() {
    var a = new LetterItemView({
      model: letterCollection.at(0)
    });
    equal(a.el.firstChild.innerHTML, 'a', 'set via constructor');

    var b = new LetterItemView();
    b.setModel(letterCollection.at(1));
    equal(b.el.firstChild.innerHTML, 'b', 'set via setModel');

    letterCollection.at(1).set({letter: 'B'});
    equal(b.el.firstChild.innerHTML, 'B', 'update attribute triggers render');

    b.freeze();
    letterCollection.at(1).set({letter: 'b'});
    equal(b.el.firstChild.innerHTML, 'B', 'freeze disables render on update');

    var c = new LetterItemView();
    c.setModel(letterCollection.at(2), {
      render: false
    });
    ok(!c.el.firstChild, 'did not render');
    c.render();
    equal(c.el.firstChild.innerHTML, 'c', 'manual render');
  });

  test("Collection View binding", function() {
    function runCollectionTests(view, indexMultiplier) {
      function matchCids(collection) {
        collection.forEach(function(model) {
          equal(view.$('[data-model-cid="' + model.cid + '"]').length, 1 * indexMultiplier, 'match CIDs');
        });
      }

      ok(!view.el.firstChild, 'no render until setCollection');
      var clonedLetterCollection = new Thorax.Collection(letterCollection.models),
          renderedItemCount = 0,
          renderedCollectionCount = 0,
          renderedEmptyCount = 0,
          renderedCount = 0;

      view.on('rendered', function() {
        ++renderedCount;
      });
      view.on('rendered:collection', function() {
        ++renderedCollectionCount;
      });
      view.on('rendered:item', function() {
        ++renderedItemCount;
      });
      view.on('rendered:empty', function() {
        ++renderedEmptyCount;
      });

      view.setCollection(clonedLetterCollection);
      equal(view.$('li').length, 4 * indexMultiplier, 'rendered node length matches collection length');
      equal(view.$('li')[0 * indexMultiplier].innerHTML + view.$('li')[3 * indexMultiplier].innerHTML, 'ad', 'rendered nodes in correct order');
      equal(renderedCount, 1, 'rendered event count');
      equal(renderedCollectionCount, 1, 'rendered:collection event count');
      equal(renderedItemCount, 4, 'rendered:item event count');
      equal(renderedEmptyCount, 0, 'rendered:empty event count');
      matchCids(clonedLetterCollection);

      //reorder
      clonedLetterCollection.remove(clonedLetterCollection.at(0));
      equal(view.$('li')[0 * indexMultiplier].innerHTML + view.$('li')[2 * indexMultiplier].innerHTML, 'bd', 'rendered nodes in correct order');
      clonedLetterCollection.remove(clonedLetterCollection.at(2));
      equal(view.$('li')[0 * indexMultiplier].innerHTML + view.$('li')[1 * indexMultiplier].innerHTML, 'bc', 'rendered nodes in correct order');
      clonedLetterCollection.add(new LetterModel({letter: 'e'}));
      equal(view.$('li')[2 * indexMultiplier].innerHTML, 'e', 'collection and nodes maintain sort order');
      clonedLetterCollection.add(new LetterModel({letter: 'a'}), {at: 0});
      equal(view.$('li')[0 * indexMultiplier].innerHTML, 'a', 'collection and nodes maintain sort order');
      equal(renderedCount, 1, 'rendered event count');
      equal(renderedCollectionCount, 1, 'rendered:collection event count');
      equal(renderedItemCount, 6, 'rendered:item event count');
      equal(renderedEmptyCount, 0, 'rendered:empty event count');
      matchCids(clonedLetterCollection);

      //empty
      clonedLetterCollection.remove(clonedLetterCollection.models);
      equal(view.$('li')[0].innerHTML, 'empty', 'empty collection renders empty');
      clonedLetterCollection.add(new LetterModel({letter: 'a'}));
      equal(view.$('li').length, 1 * indexMultiplier, 'transition from empty to one item');
      equal(view.$('li')[0 * indexMultiplier].innerHTML, 'a', 'transition from empty to one item');
      equal(renderedCount, 1, 'rendered event count');
      equal(renderedCollectionCount, 1, 'rendered:collection event count');
      equal(renderedItemCount, 7, 'rendered:item event count');
      equal(renderedEmptyCount, 1, 'rendered:empty event count');
      matchCids(clonedLetterCollection);

      //freeze
      view.freeze();
      clonedLetterCollection.remove(clonedLetterCollection.models);
      equal(renderedEmptyCount, 1, 'rendered:empty event count');
      equal(view.$('li')[0 * indexMultiplier].innerHTML, 'a', 'transition from empty to one item');
    }

    runCollectionTests(new LetterCollectionView(), 1);

    var viewReturningItemView = new (LetterCollectionView.extend({
      renderItem: function(model, i) {
        return new LetterItemView({model: model});
      }
    }));
    runCollectionTests(viewReturningItemView, 1);

    var viewReturningMixed = new (LetterCollectionView.extend({
      renderItem: function(model, i) {
        return i % 2 === 0 ? new LetterItemView({model: model}) : this.template(this.name + '-item', model.attributes);
      }
    }));
    runCollectionTests(viewReturningMixed, 1);

    var viewReturningMultiple = new (LetterCollectionView.extend({
      renderItem: function(model, i) {
        return this.template('letter-multiple-item', model.attributes);
      }
    }));
    runCollectionTests(viewReturningMultiple, 2);
  });

});

test("Child views", function() {
  var childRenderedCount = 0,
      parentRenderedCount = 0;
  var Child = Thorax.View.extend({
    name: 'child',
    events: {
      rendered: function() {
        ++childRenderedCount;
      }
    }
  });
  var Parent = Thorax.View.extend({
    name: 'parent',
    events: {
      rendered: function() {
        ++parentRenderedCount;
      }
    },
    initialize: function() {
      this.childModel = new Thorax.Model({
        value: 'a'
      });
      this.child = this.view('child', {
        model: this.childModel
      });
    }
  });
  var parent = new Parent();
  parent.render();
  equal(parent.$('[data-view-name="child"]').html(), 'a', 'view embedded');
  equal(parentRenderedCount, 1);
  equal(childRenderedCount, 1);

  parent.render();
  equal(parent.$('[data-view-name="child"]').html(), 'a', 'view embedded');
  equal(parentRenderedCount, 2, 're-render of parent does not render child');
  equal(childRenderedCount, 1, 're-render of parent does not render child');

  parent.childModel.set({value: 'b'});
  equal(parent.$('[data-view-name="child"]').html(), 'b', 'view embedded');
  equal(parentRenderedCount, 2, 're-render of child does not parent child');
  equal(childRenderedCount, 2, 're-render of child does not render parent');
});

test("Inheritable events", function() {
  var Parent = Thorax.View.extend({}),
      aCount = 0,
      bCount = 0;
  Parent.registerEvents({
    a: function() {
      ++aCount;
    }
  });
  var Child = Parent.extend({});
  Child.registerEvents({
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
});

test("bindToRoute", function() {
  var callback,
      failback,
      fragment = "foo",
      _getFragment = Backbone.history.getFragment,
      _Router = Thorax.Router.extend({});
      router = new _Router();

  Backbone.history.getFragment = function() {
    return fragment;
  }

  var _this = this;
  function reset() {
    callback = _this.spy();
    failback = _this.spy();
    return router.bindToRoute(callback, failback);
  }

  var func = reset();
  Backbone.history.trigger('route');
  equal(callback.callCount, 0);
  equal(failback.callCount, 0);
  
  // test new route before load complete
  fragment = "bar";
  Backbone.history.trigger('route');
  equal(callback.callCount, 0);
  equal(failback.callCount, 1);

  // make sure callback doesn't work after route has changed
  func();
  equal(callback.callCount, 0);
  equal(failback.callCount, 1);

  // make sure callback works without initial route trigger
  func = reset();
  func();
  equal(callback.callCount, 1);
  equal(failback.callCount, 0);

  // make sure callback works with initial route trigger
  func = reset();
  Backbone.history.trigger('route');
  func();
  equal(callback.callCount, 1);
  equal(failback.callCount, 0);

  // now make sure no execution happens after route change
  fragment = "bar";
  Backbone.history.trigger('route');
  equal(callback.callCount, 1);
  equal(failback.callCount, 0);

  Backbone.history.getFragment = _getFragment;
});

//contain handler to current view (make fix so child views don't bubble)

//form serialization / population / validation

//application.layout w/router
