$(function() {

  Thorax.configure({
    templatePathPrefix: ''
  });

  Application.templates = {
    'letter.handlebars': Handlebars.compile('{{collection tag="ul"}}'), 
    'letter-item.handlebars': Handlebars.compile("<li>{{letter}}</li>"),
    'letter-empty.handlebars': Handlebars.compile("<li>empty</li>"),
    'letter-multiple-item.handlebars': Handlebars.compile("<li>{{letter}}</li><li>{{letter}}</li>")
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
      clonedLetterCollection.remove(clonedLetterCollection.at(0 * indexMultiplier));
      equal(view.$('li')[0 * indexMultiplier].innerHTML + view.$('li')[2 * indexMultiplier].innerHTML, 'bd', 'rendered nodes in correct order');
      clonedLetterCollection.remove(clonedLetterCollection.at(2 * indexMultiplier));
      equal(view.$('li')[0 * indexMultiplier].innerHTML + view.$('li')[1 * indexMultiplier].innerHTML, 'bc', 'rendered nodes in correct order');
      clonedLetterCollection.add(new LetterModel({letter: 'e'}));
      equal(view.$('li')[2 * indexMultiplier].innerHTML, 'e', 'collection and nodes maintain sort order');
      clonedLetterCollection.add(new LetterModel({letter: 'a'}), {at: 0 * indexMultiplier});
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

  });

});

