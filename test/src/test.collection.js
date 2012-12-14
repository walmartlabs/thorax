$(function() {

  QUnit.module('Thorax Collection Helper');

  Thorax.templates['letter'] = '{{collection tag="ul"}}';
  Thorax.templates['letter-item'] = '<li>{{letter}}</li>';
  Thorax.templates['letter-empty'] = '<li>empty</li>';
  Thorax.templates['letter-multiple-item'] = '<li>{{letter}}</li><li>{{letter}}</li>';

  var LetterModel = Thorax.Model.extend({});
  var letterCollection = new (Thorax.Collection.extend({
    model: LetterModel
  }))(['a','b','c','d'].map(function(letter) {
    return {letter: letter};
  }));
  var LetterCollectionView = Thorax.View.extend({name: 'letter'});
  var LetterItemView = Thorax.View.extend({name: 'letter-item'});
  var LetterEmptyView = Thorax.View.extend({name: 'letter-empty'});

  test("isPopulated", function() {
    ok(letterCollection.isPopulated());
    ok(letterCollection.at(0).isPopulated());
  });

  test("collection view binding", function() {
    function runCollectionTests(view, indexMultiplier, msg) {
      msg += ' : ';
      function matchCids(collection) {
        collection.forEach(function(model) {
          equal(view.$('[data-model-cid="' + model.cid + '"]').length, 1 * indexMultiplier, 'match CIDs');
        });
      }
      ok(!view.el.firstChild, msg + 'no render until setCollection');
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

      view.collection = clonedLetterCollection;
      view.render();
      equal(view.$('li').length, 4 * indexMultiplier, msg + 'rendered node length matches collection length');
      equal(view.$('li')[0 * indexMultiplier].innerHTML + view.$('li')[3 * indexMultiplier].innerHTML, 'ad', msg + 'rendered nodes in correct order');
      equal(renderedCount, 1, msg + 'rendered event count');
      equal(renderedCollectionCount, 1, msg + 'rendered:collection event count');
      equal(renderedItemCount, 4, msg + 'rendered:item event count');
      equal(renderedEmptyCount, 0, msg + 'rendered:empty event count');
      matchCids(clonedLetterCollection);

      //reorder
      clonedLetterCollection.remove(clonedLetterCollection.at(0));
      equal(view.$('li')[0 * indexMultiplier].innerHTML + view.$('li')[2 * indexMultiplier].innerHTML, 'bd', msg + 'rendered nodes in correct order');
      clonedLetterCollection.remove(clonedLetterCollection.at(2));
      equal(view.$('li')[0 * indexMultiplier].innerHTML + view.$('li')[1 * indexMultiplier].innerHTML, 'bc', msg + 'rendered nodes in correct order');
      clonedLetterCollection.add(new LetterModel({letter: 'e'}));
      equal(view.$('li')[2 * indexMultiplier].innerHTML, 'e', msg + 'collection and nodes maintain sort order');
      clonedLetterCollection.add(new LetterModel({letter: 'a'}), {at: 0});
      equal(view.$('li')[0 * indexMultiplier].innerHTML, 'a', msg + 'collection and nodes maintain sort order');
      equal(renderedCount, 1, msg + 'rendered event count');
      equal(renderedCollectionCount, 1, msg + 'rendered:collection event count');
      equal(renderedItemCount, 6, msg + 'rendered:item event count');
      equal(renderedEmptyCount, 0, msg + 'rendered:empty event count');
      matchCids(clonedLetterCollection);

      //empty
      clonedLetterCollection.remove(clonedLetterCollection.models);
      equal(view.$('li')[0].innerHTML, 'empty', msg + 'empty collection renders empty');
      clonedLetterCollection.add(new LetterModel({letter: 'a'}));
      equal(view.$('li').length, 1 * indexMultiplier, msg + 'transition from empty to one item');
      equal(view.$('li')[0 * indexMultiplier].innerHTML, 'a', msg + 'transition from empty to one item');
      equal(renderedCount, 1, msg + 'rendered event count');
      equal(renderedCollectionCount, 1, msg + 'rendered:collection event count');
      equal(renderedItemCount, 7, msg + 'rendered:item event count');
      equal(renderedEmptyCount, 1, msg + 'rendered:empty event count');
      matchCids(clonedLetterCollection);

      var oldLength = view.$('li').length;
      clonedLetterCollection.reset(clonedLetterCollection.models);
      equal(oldLength, view.$('li').length, msg + 'Reset does not cause change in number of rendered items')

      //freeze
      view.freeze();
      view.collection.off();
      clonedLetterCollection.remove(clonedLetterCollection.models);
      equal(renderedEmptyCount, 1, msg + 'rendered:empty event count');
      equal(view.$('li')[0 * indexMultiplier].innerHTML, 'a', msg + 'transition from empty to one item');
    }

    runCollectionTests(new LetterCollectionView(), 1, 'base');

    //when the fragment is created bind
    function addRenderItemBinding() {
      this.on('helper:collection', function(fragment) {
        fragment.renderItem = _.bind(this.renderItem, this);
      }, this);
    }

    var viewReturningItemView = new (LetterCollectionView.extend({
      initialize: addRenderItemBinding,
      renderItem: function(model, i) {
        return new LetterItemView({model: model});
      }
    }));
    runCollectionTests(viewReturningItemView, 1, 'renderItem returning LetterItemView');

    var viewReturningMixed = new (LetterCollectionView.extend({
      initialize: addRenderItemBinding,
      renderItem: function(model, i) {
        return i % 2 === 0 ? new LetterItemView({model: model}) : this.renderTemplate(this.name + '-item', model.attributes);
      }
    }));
    runCollectionTests(viewReturningMixed, 1, 'renderItem returning mixed');

    var viewReturningMultiple = new (LetterCollectionView.extend({
      initialize: addRenderItemBinding,
      renderItem: function(model, i) {
        return this.renderTemplate('letter-multiple-item', model.attributes);
      }
    }));
    runCollectionTests(viewReturningMultiple, 2, 'renderItem returning multiple');

    var viewWithBlockCollectionHelper = new Thorax.View({
      template: '{{#collection tag="ul" empty-template="letter-empty"}}<li>{{letter}}</li>{{/collection}}'
    });
    runCollectionTests(viewWithBlockCollectionHelper, 1, 'block helper');

    var viewWithBlockCollectionHelperWithViews = new Thorax.View({
      template: '{{collection tag="ul" empty-template="letter-empty" item-view="letter-item"}}'
    });
    runCollectionTests(viewWithBlockCollectionHelperWithViews, 1, 'block helper with item-view');

    var viewWithBlockCollectionHelperWithViewsAndBlock = new Thorax.View({
      template: '{{#collection tag="ul" empty-template="letter-empty" item-view="letter-item"}}<li class="testing">{{letter}}</li>{{/collection}}'
    });
    runCollectionTests(viewWithBlockCollectionHelperWithViewsAndBlock, 1, 'block helper with item-view and fn');

    var viewWithCollectionHelperWithEmptyView = new Thorax.View({
      template: '{{collection tag="ul" empty-view="letter-empty" item-template="letter-item"}}'
    });
    runCollectionTests(viewWithCollectionHelperWithEmptyView, 1, 'block helper with item-template');

    var viewWithCollectionHelperWithEmptyViewAndBlock = new Thorax.View({
      template: '{{collection tag="ul" empty-template="letter-empty" empty-view="letter-empty" item-template="letter-item"}}'
    });
    runCollectionTests(viewWithCollectionHelperWithEmptyViewAndBlock, 1, 'block helper with empty view and block');
  });

  test("multiple collections", function() {
    var view = new Thorax.View({
      template: '{{collection a tag="ul" item-template="letter-item"}}{{collection b tag="ul" item-template="letter-item"}}',
      a: new Thorax.Collection(letterCollection.models),
      b: new Thorax.Collection(letterCollection.models)
    });
    view.render();
    equal(view.$('li').length, letterCollection.models.length * 2);

    view = new Thorax.View({
      template: '{{collection a tag="ul" item-template="letter-item"}}{{collection a tag="ul" item-template="letter-item"}}{{collection b tag="ul" item-template="letter-item"}}{{collection b tag="ul" item-template="letter-item"}}',
      a: new Thorax.Collection(letterCollection.models),
      b: new Thorax.Collection(letterCollection.models)
    });
    view.render();
    equal(view.$('li').length, letterCollection.models.length * 4);

    var SubViewWithSameCollection = Thorax.View.extend({
      name: 'sub-view-with-same-collection',
      template: '{{collection a tag="ul" item-template="letter-item"}}'
    });
    var view = new Thorax.View({
      a: new Thorax.Collection(letterCollection.models),
      b: new Thorax.Collection(letterCollection.models),
      template: '{{collection a tag="ul" item-template="letter-item"}}{{view "sub-view-with-same-collection" a=a}}'
    });
    view.render();
    equal(view.$('li').length, letterCollection.models.length * 2);

    var view = new Thorax.View({
      template: '{{#collection a tag="ul"}}<li>{{letter}}</li>{{/collection}}{{#collection a tag="div"}}<span>{{letter}}</span>{{/collection}}',
      a: new Thorax.Collection(letterCollection.models)
    });
    view.render();
    equal(view.$('li').length, letterCollection.models.length);
    equal(view.$('span').length, letterCollection.models.length);
  });

  test("inverse block in collection helper", function() {
    var emptyCollectionView = new Thorax.View({
      template: '{{#collection}}<div>{{letter}}</div>{{else}}<div>empty</div>{{/collection}}',
      collection: new Thorax.Collection()
    });
    emptyCollectionView.render();
    equal(emptyCollectionView.$('[data-collection-cid]').html(), '<div>empty</div>');
  });

  test("empty template defaults to parent scope", function() {
    var view = new Thorax.View({
      parentKey: 'value',
      collection: new (Thorax.Collection.extend({url: false})),
      template: '{{#collection}}item{{else}}{{parentKey}}{{/collection}}'
    });
    view.render();
    equal(view.$('[data-collection-empty] div').html(), 'value');
  });

  test("empty and collection helpers in the same template", function() {
    var a = new Thorax.View({
      template: '{{#empty letters}}<div class="empty">empty</div>{{/empty}}{{#collection letters}}{{letter}}{{/collection}}',
      letters: new Thorax.Collection()
    });
    var b = new Thorax.View({
      template: '{{#empty letters}}<div class="empty">empty a</div>{{/empty}}{{#collection letters}}{{letter}}{{else}}empty b{{/collection}}',
      letters: new Thorax.Collection()
    });
    a.render();
    var oldRenderCount = a._renderCount;
    equal(a.$('.empty').html(), 'empty');
    a.letters.reset(letterCollection.models);
    equal(a.$('.empty').length, 0);
    equal(a.$('[data-collection-cid] div')[0].innerHTML, 'a');
    equal(oldRenderCount, a._renderCount, 'render count unchanged on collection reset');

    b.render();
    equal(b.$('.empty').html(), 'empty a');
    equal(b.$('[data-collection-cid] div')[0].innerHTML, 'empty b');
    b.letters.reset(letterCollection.models);
    equal(b.$('.empty').length, 0);
    equal(b.$('[data-collection-cid] div')[0].innerHTML, 'a');
  });

  test("_bindCollection or model.set can be called in context()", function() {
    //this causes recursion
    var view = new Thorax.View({
      model: new Thorax.Model(),
      template: '{{key}}{{#collection col}}{{key}}{{/collection}}',
      context: function() {
        this.model.set({key: 'value'});
        return {
          key: 'value',
          col: new Thorax.Collection([{key: 'value'}])
        };
      }
    });
    view.render();
    equal(view.$('[data-collection-cid] div')[0].innerHTML, 'value');
  });

  test("filter what items are rendered in a collection", function() {
    //zepto does not support the :visible selector, so emulate
    function isVisible(elem){
      elem = $(elem);
      return !!(elem.width() || elem.height()) && elem.css("display") !== "none";
    }

    function filterVisible(arr) {
      return _.select(arr, function(el) {
        return isVisible(el);
      });
    }

    var view = new Thorax.View({
      template: '{{#collection tag="ul"}}<li>{{key}}</li>{{/collection}}',
      collection: new Thorax.Collection(),
      itemFilter: function(model) {
        return model.attributes.key === 'a' || model.attributes.key === 'b';
      }
    });
    view.render();
    document.body.appendChild(view.el);
    equal(filterVisible(view.$('li')).length, 0);
    var a = new Thorax.Model({key: 'a'});
    view.collection.reset([a]);
    equal(filterVisible(view.$('li')).length, 1);
    equal(filterVisible(view.$('li'))[0].innerHTML, 'a');
    var b = new Thorax.Model({key: 'b'});
    view.collection.add(b);
    equal(filterVisible(view.$('li')).length, 2);
    equal(filterVisible(view.$('li'))[1].innerHTML, 'b');
    var c = new Thorax.Model({key: 'c'});
    view.collection.add(c);
    equal(filterVisible(view.$('li')).length, 2, 'add item that should not be included');
    equal(filterVisible(view.$('li'))[1].innerHTML, 'b', 'add item that should not be included');
    c.set({key: 'b'});
    equal(filterVisible(view.$('li')).length, 3, 'set item not included to be included');
    equal(filterVisible(view.$('li'))[1].innerHTML, 'b', 'set item not included to be included');
    equal(filterVisible(view.$('li'))[2].innerHTML, 'b', 'set item not included to be included');
    c.set({key: 'c'});
    equal(filterVisible(view.$('li')).length, 2, 'set item that is included to not be included');
    equal(filterVisible(view.$('li'))[1].innerHTML, 'b', 'set item that is included to not be included');
    a.set({key: 'x'});
    equal(filterVisible(view.$('li')).length, 1, 'set first included item to not be included');
    equal(filterVisible(view.$('li'))[0].innerHTML, 'b', 'set first included item to not be included');
    a.set({key: 'a'});
    equal(filterVisible(view.$('li')).length, 2);
    equal(filterVisible(view.$('li'))[0].innerHTML, 'a', 'set first item not included to be included');
    equal(filterVisible(view.$('li'))[1].innerHTML, 'b', 'set first item not included to be included');
    a.set({key: 'a'});
    equal(filterVisible(view.$('li'))[0].innerHTML, 'a', 'items maintain order when updated when filter is present');
    equal(filterVisible(view.$('li'))[1].innerHTML, 'b', 'items maintain order when updated when filter is present');
    b.set({key: 'b'});
    equal(filterVisible(view.$('li'))[0].innerHTML, 'a', 'items maintain order when updated when filter is present');
    equal(filterVisible(view.$('li'))[1].innerHTML, 'b', 'items maintain order when updated when filter is present');
    view.$el.remove();

  });

  test("nested collection helper", function() {
    function testNesting(view, msg) {
      var blogModel = new Thorax.Model();
      view.setModel(blogModel);
      equal(view.$('[data-view-helper]').html(), 'empty', msg + ' : starts empty');
      var authors = [
        new Thorax.Model({author: 'author 1'}),
        new Thorax.Model({author: 'author 2'})
      ];
      var comments1 = new Thorax.Collection([
        new Thorax.Model({
          comment: 'comment one',
          authors: new Thorax.Collection(authors)
        }),
        new Thorax.Model({
          comment: 'comment two',
          authors: new Thorax.Collection(authors)
        })
      ]);
      var comments2 = new Thorax.Collection([
        new Thorax.Model({
          comment: 'comment three',
          authors: new Thorax.Collection(authors)
        }),
        new Thorax.Model({
          comment: 'comment four',
          authors: new Thorax.Collection(authors)
        })
      ]);
      blogModel.set({
        posts: new Thorax.Collection([
          new Thorax.Model({
            title: 'title one',
            comments: comments1
          }),
          new Thorax.Model({
            title: 'title two',
            comments: comments2
          })
        ])
      });
      equal(view.$('h2').length, 2, msg + ' : title length');
      equal(view.$('h2')[0].innerHTML, 'title one', msg + ' : title content');
      equal(view.$('h2')[1].innerHTML, 'title two', msg + ' : title content');
      equal(view.$('p').length, 4, msg + ' : comment length');
      equal(view.$('p')[0].innerHTML, 'comment one', msg + ' : comment content');
      equal(view.$('p')[1].innerHTML, 'comment two', msg + ' : comment content');
      equal(view.$('p')[2].innerHTML, 'comment three', msg + ' : comment content');
      equal(view.$('p')[3].innerHTML, 'comment four', msg + ' : comment content');
      equal(view.$('span').length, 8, msg + ' : author length');

      comments2.add(new Thorax.Model({comment: 'comment five'}));
      equal(view.$('p')[4].innerHTML, 'comment five', msg + ' : added comment content');

      blogModel.attributes.posts.add(new Thorax.Model({
        title: 'title three'
      }));
      equal(view.$('h2').length, 3, msg + ' : added title length');
      equal(view.$('h2')[2].innerHTML, 'title three', msg + ' : added title content');
    }

    //test with embedded view
    Thorax.View.extend({
      name: 'comments',
      template: '{{#collection comments}}<p>{{comment}}</p>{{#collection authors}}<span>{{author}}</span>{{/collection}}{{/collection}}'
    });
    var view = new Thorax.View({
      template: '{{#empty posts}}empty{{else}}{{#collection posts name="outer"}}<h2>{{title}}</h2>{{view "comments" comments=comments}}</div>{{/collection}}{{/empty}}'
    });
    testNesting(view, 'nested view');

    //test with multiple inline nesting
    view = new Thorax.View({
      template: '{{#empty posts}}empty{{else}}{{#collection posts name="outer"}}<h2>{{title}}</h2>{{#collection comments}}<p>{{comment}}</p>{{#collection authors}}<span>{{author}}</span>{{/collection}}{{/collection}}</div>{{/collection}}{{/empty}}'
    });
    testNesting(view, 'nested inline');
  });

  test("collection model updates will update item", function() {
    var collection = new Thorax.Collection([{name: 'a'}], {
      comparator: function(obj) {
        return obj.get("name");
      }
    });
    var renderCount = 0;
    var view = new Thorax.View({
      initialize: function() {
        this.on('rendered', function() {
          ++renderCount;
        });
      },
      myCollection: collection,
      template: '{{#collection myCollection tag="ul"}}<li>{{name}}</li>{{/collection}}'
    });
    view.render();
    equal(renderCount, 1);
    equal(view.$('li').html(), 'a');
    collection.at(0).set({name: 'A'});
    equal(view.$('li').html(), 'A');
    equal(renderCount, 1);
    collection.add({name: 'b'});
    equal(view.$('li:last-child').html(), 'b');
    collection.at(1).set({name: 'B'});
    equal(view.$('li:last-child').html(), 'B');
    equal(renderCount, 1);

    //ensure correct index is updated
    collection.at(0).set({name: 'a'});
    collection.at(1).set({name: 'c'});
    equal(view.$('li:first-child').html(), 'a');
    equal(view.$('li:last-child').html(), 'c');
    collection.at(0).set({name: 'A'});
    collection.add({name: 'b'});
    equal(collection.at(2).attributes.name, 'c');
    collection.at(2).set({name: 'C'});
    equal(view.$('li:first-child').html(), 'A');
    equal(view.$('li:last-child').html(), 'C');

    collection = new Thorax.Collection({name: 'one'});
    renderCount = 0;
    var itemRenderCount = 0;
    view = new Thorax.View({
      name: 'outer-view',
      initialize: function() {
        this.on('rendered', function() {
          ++renderCount;
        });
      },
      itemView: Thorax.View.extend({
        name: 'inner-view',
        initialize: function() {
          this.on('rendered', function() {
            ++itemRenderCount;
          });
        },
        tagName: 'li',
        template: '{{name}}'
      }),
      myCollection: collection,
      template: '{{collection myCollection tag="ul" item-view=itemView}}'
    });
    view.render();
    equal(itemRenderCount, 1);
    equal(renderCount, 1);
    equal(view.$('li').html(), 'one');
    collection.at(0).set({
      name: 'two'
    });
    equal(itemRenderCount, 2);
    equal(view.$('li').html(), 'two');
    equal(renderCount, 1);
    collection.add({name: 'three'});
    equal(itemRenderCount, 3);
    equal(view.$('li:last-child').html(), 'three');
    collection.at(1).set({name: 'four'});
    equal(itemRenderCount, 4);
    equal(view.$('li:last-child').html(), 'four');
    equal(renderCount, 1);
  });

  test("graceful failure of empty collection with no empty template", function() {
    var view = new Thorax.View({
      template: '{{collection item-template="letter-item"}}',
      collection: new Thorax.Collection({
        isPopulated: function() {
          return true;
        }
      })
    });
    view.render();
    view = new Thorax.View({
      template: '{{collection item-template="letter-item"}}',
      collection: new Thorax.Collection
    });
    view.render();
    ok(true);
  });

  test("item-template and empty-template can return text nodes", function() {
    var view = new Thorax.View({
      letters: new Thorax.Collection(),
      template: '{{#collection letters}}{{letter}}{{else}}empty{{/collection}}'
    });
    view.render();
    equal(view.$('div[data-collection-cid] div').html(), 'empty');
    ok(view.$('[data-collection-empty]').length);
    view.letters.reset(letterCollection.models);
    equal(view.$('div[data-collection-cid] div').html(), 'a');
    ok(!view.$('[data-collection-empty]').length);
  });

  test("empty helper", function() {
    var emptyView = new Thorax.View({
      template: '{{#empty}}empty{{else}}not empty{{/empty}}'
    });
    emptyView.render();
    equal(emptyView.$('[data-view-helper]').html(), 'empty');
    var emptyModelView = new Thorax.View({
      template: '{{#empty}}empty{{else}}not empty{{/empty}}',
      model: new Thorax.Model()
    });
    emptyModelView.render();
    equal(emptyModelView.$('[data-view-helper]').html(), 'empty');
    emptyModelView.model.set({key: 'value'});
    equal(emptyModelView.$('[data-view-helper]').html(), 'not empty');
    var emptyCollectionView = new Thorax.View({
      template: '{{#empty myCollection}}empty{{else}}not empty{{/empty}}',
      myCollection: new Thorax.Collection()
    });
    emptyCollectionView.render();
    equal(emptyCollectionView.$('[data-view-helper]').html(), 'empty');
    var model = new Thorax.Model();
    emptyCollectionView.myCollection.add(model);
    equal(emptyCollectionView.$('[data-view-helper]').html(), 'not empty');
    emptyCollectionView.myCollection.remove(model);
    equal(emptyCollectionView.$('[data-view-helper]').html(), 'empty');
  });

  test("item-context & empty-context", function() {
    var view = new Thorax.View({
      collection: letterCollection,
      template: "{{#collection this.collection}}<span>{{test}}</span>{{/collection}}",
      itemContext: function(model, i) {
        return {
          test: 'testing'
        };
      }
    });
    view.render();
    equal(view.$('span').length, letterCollection.length);
    equal(view.$('span')[0].innerHTML, 'testing');

    //will use default
    view = new Thorax.View({
      collection: new (Thorax.Collection.extend({
        url: false,
        isEmpty: function() {
          return true;
        }
      })),
      template: "{{#collection this.collection}}{{test}}{{else}}<b>{{test}}</b>{{/collection}}",
      emptyContext: function() {
        return {
          test: 'testing'
        }
      }
    });
    view.render();
    equal(view.$('b')[0].innerHTML, 'testing');
  });

  test("empty-class option", function() {
    var view = new Thorax.View({
      template: "{{#collection empty-class=\"a\" tag=\"ul\"}}{{/collection}}",
      collection: new (Thorax.Collection.extend({url: false}))
    });
    view.render();
    ok(view.$('ul').hasClass('a'));
    var model = new Thorax.Model({key: 'value'});
    view.collection.add(model);
    ok(!view.$('ul').hasClass('a'));
    view.collection.remove(model);
    ok(view.$('ul').hasClass('a'));

    //with default arg
    view = new Thorax.View({
      template: "{{#collection tag=\"ul\"}}{{/collection}}",
      collection: new (Thorax.Collection.extend({url: false}))
    });
    view.render();
    ok(view.$('ul').hasClass('empty'));
    var model = new Thorax.Model({key: 'value'});
    view.collection.add(model);
    ok(!view.$('ul').hasClass('empty'));
    view.collection.remove(model);
    ok(view.$('ul').hasClass('empty'));
  });

  test("helper and local scope collision", function() {
    var child = new Thorax.View({
      collection: letterCollection,
      template: '{{#collection this.collection tag="ul"}}<li>{{letter}}</li>{{/collection}}'
    });
    child.render();
    equal(child.$('li').html(), 'a');
  });

  test("$.fn.collection", function() {
    var view = new Thorax.View({
      template: '{{#collection letters tag="ul"}}<li>{{letter}}</li>{{/collection}}',
      letters: letterCollection
    });
    view.render();
    equal(view.$('li:first-child').view().parent, view);
    equal(view.$('ul').collection(), letterCollection);
    equal(view.$('ul').model(), false);
    equal(view.$el.collection(), false);
    equal(view.$('li:first-child').collection(), letterCollection);
    equal(view.$('li:first-child').model(), letterCollection.models[0]);
  });

  test("collection events", function() {
    var callCounter = {
      all: 0,
      test1: 0,
      test2: 0
    };
    var collection = new Thorax.Collection();
    var view = new Thorax.View({
      collection: collection,
      template: '',
      events: {
        collection: {
          all: function() {
            ++callCounter.all;
          },
          test1: 'test1',
          test2: function() {
            ++callCounter.test2;
          }
        }
      },
      test1: function() {
        ++callCounter.test1;
      }
    });
    var oldAllCount = callCounter.all;
    collection.trigger('test1');
    collection.trigger('test2');
    equal(callCounter.all - oldAllCount, 2);
    equal(callCounter.test1, 1);
    equal(callCounter.test2, 1);
  });
});
