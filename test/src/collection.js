describe('collection', function() {
  Thorax.templates.letter = '{{collection tag="ul"}}';
  Thorax.templates['letter-item'] = '<li>{{letter}}</li>';
  Thorax.templates['letter-empty'] = '<li>empty</li>';
  Thorax.templates['letter-multiple-item'] = '<li>{{letter}}</li><li>{{letter}}</li>';

  var LetterModel = Thorax.Model.extend({});
  var letterCollection = new (Thorax.Collection.extend({
    model: LetterModel
  }))(['a', 'b', 'c', 'd'].map(function(letter) {
    return {letter: letter};
  }));
  var LetterCollectionView = Thorax.View.extend({name: 'letter'});
  var LetterItemView = Thorax.View.extend({name: 'letter-item'});
  Thorax.View.extend({name: 'letter-empty'});

  it("should implement isPopulated", function() {
    expect(letterCollection.isPopulated()).to.be.true;
    expect(letterCollection.at(0).isPopulated()).to.be.true;
  });

  it("collection view binding", function() {
    function runCollectionTests(view, indexMultiplier, msg) {
      msg += ' : ';
      function matchCids(collection) {
        collection.forEach(function(model) {
          expect(view.$('[data-model-cid="' + model.cid + '"]').length).to.equal(1 * indexMultiplier, 'match CIDs');
        });
      }
      expect(view.el.firstChild).to.not.exist;
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
      expect(view.$('li').length).to.equal(4 * indexMultiplier, msg + 'rendered node length matches collection length');
      expect(view.$('li')[0 * indexMultiplier].innerHTML + view.$('li')[3 * indexMultiplier].innerHTML).to.equal('ad', msg + 'rendered nodes in correct order');
      expect(renderedCount).to.equal(1, msg + 'rendered event count');
      expect(renderedCollectionCount).to.equal(1, msg + 'rendered:collection event count');
      expect(renderedItemCount).to.equal(4, msg + 'rendered:item event count');
      expect(renderedEmptyCount).to.equal(0, msg + 'rendered:empty event count');
      matchCids(clonedLetterCollection);

      //reorder
      clonedLetterCollection.remove(clonedLetterCollection.at(0));
      expect(view.$('li')[0 * indexMultiplier].innerHTML + view.$('li')[2 * indexMultiplier].innerHTML).to.equal('bd', msg + 'rendered nodes in correct order');
      clonedLetterCollection.remove(clonedLetterCollection.at(2));
      expect(view.$('li')[0 * indexMultiplier].innerHTML + view.$('li')[1 * indexMultiplier].innerHTML).to.equal('bc', msg + 'rendered nodes in correct order');
      clonedLetterCollection.add(new LetterModel({letter: 'e'}));
      expect(view.$('li')[2 * indexMultiplier].innerHTML).to.equal('e', msg + 'collection and nodes maintain sort order');
      clonedLetterCollection.add(new LetterModel({letter: 'a'}), {at: 0});
      expect(view.$('li')[0 * indexMultiplier].innerHTML).to.equal('a', msg + 'collection and nodes maintain sort order');
      expect(renderedCount).to.equal(1, msg + 'rendered event count');
      expect(renderedCollectionCount).to.equal(1, msg + 'rendered:collection event count');
      expect(renderedItemCount).to.equal(6, msg + 'rendered:item event count');
      expect(renderedEmptyCount).to.equal(0, msg + 'rendered:empty event count');
      matchCids(clonedLetterCollection);

      //empty
      clonedLetterCollection.remove(clonedLetterCollection.models);
      expect(view.$('li')[0].innerHTML).to.equal('empty', msg + 'empty collection renders empty');
      clonedLetterCollection.add(new LetterModel({letter: 'a'}));
      
      expect(view.$('li').length).to.equal(1 * indexMultiplier, msg + 'transition from empty to one item');
      expect(view.$('li')[0 * indexMultiplier].innerHTML).to.equal('a', msg + 'transition from empty to one item');
      expect(renderedCount).to.equal(1, msg + 'rendered event count');
      expect(renderedCollectionCount).to.equal(1, msg + 'rendered:collection event count');
      expect(renderedItemCount).to.equal(7, msg + 'rendered:item event count');
      expect(renderedEmptyCount).to.equal(1, msg + 'rendered:empty event count');
      matchCids(clonedLetterCollection);

      var oldLength = view.$('li').length;
      clonedLetterCollection.reset(clonedLetterCollection.models);
      expect(view.$('li').length).to.equal(oldLength, msg + 'Reset does not cause change in number of rendered items');

      //freeze
      view.freeze();
      
      clonedLetterCollection.remove(clonedLetterCollection.models);
      expect(renderedEmptyCount).to.equal(1, msg + 'rendered:empty event count');
      expect(view.$('li')[0 * indexMultiplier].innerHTML).to.equal('a', msg + 'transition from empty to one item after freeze');
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
      renderItem: function(model) {
        return new LetterItemView({model: model});
      }
    }))();
    runCollectionTests(viewReturningItemView, 1, 'renderItem returning LetterItemView');

    var viewReturningMixed = new (LetterCollectionView.extend({
      initialize: addRenderItemBinding,
      renderItem: function(model, i) {
        return i % 2 === 0 ? new LetterItemView({model: model}) : this.renderTemplate(this.name + '-item', model.attributes);
      }
    }))();
    runCollectionTests(viewReturningMixed, 1, 'renderItem returning mixed');

    var viewReturningMultiple = new (LetterCollectionView.extend({
      initialize: addRenderItemBinding,
      renderItem: function(model) {
        return this.renderTemplate('letter-multiple-item', model.attributes);
      }
    }))();
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

  it("multiple collections", function() {
    var view = new Thorax.View({
      template: '{{collection a tag="ul" item-template="letter-item"}}{{collection b tag="ul" item-template="letter-item"}}',
      a: new Thorax.Collection(letterCollection.models),
      b: new Thorax.Collection(letterCollection.models)
    });
    view.render();
    expect(view.$('li').length).to.equal(letterCollection.models.length * 2);

    view = new Thorax.View({
      template: '{{collection a tag="ul" item-template="letter-item"}}{{collection a tag="ul" item-template="letter-item"}}{{collection b tag="ul" item-template="letter-item"}}{{collection b tag="ul" item-template="letter-item"}}',
      a: new Thorax.Collection(letterCollection.models),
      b: new Thorax.Collection(letterCollection.models)
    });
    view.render();
    expect(view.$('li').length).to.equal(letterCollection.models.length * 4);

    Thorax.View.extend({
      name: 'sub-view-with-same-collection',
      template: '{{collection a tag="ul" item-template="letter-item"}}'
    });
    var view = new Thorax.View({
      a: new Thorax.Collection(letterCollection.models),
      b: new Thorax.Collection(letterCollection.models),
      template: '{{collection a tag="ul" item-template="letter-item"}}{{view "sub-view-with-same-collection" a=a}}'
    });
    view.render();
    expect(view.$('li').length).to.equal(letterCollection.models.length * 2);

    var view = new Thorax.View({
      template: '{{#collection a tag="ul"}}<li>{{letter}}</li>{{/collection}}{{#collection a tag="div"}}<span>{{letter}}</span>{{/collection}}',
      a: new Thorax.Collection(letterCollection.models)
    });
    view.render();
    expect(view.$('li').length).to.equal(letterCollection.models.length);
    expect(view.$('span').length).to.equal(letterCollection.models.length);
  });

  it("inverse block in collection helper", function() {
    var emptyCollectionView = new Thorax.View({
      template: '{{#collection}}<div>{{letter}}</div>{{else}}<div>empty</div>{{/collection}}',
      collection: new Thorax.Collection()
    });
    emptyCollectionView.render();
    expect(emptyCollectionView.$('[data-collection-cid]').html()).to.equal('<div>empty</div>');
  });

  it("empty template defaults to parent scope", function() {
    var view = new Thorax.View({
      parentKey: 'value',
      collection: new (Thorax.Collection.extend({url: false}))(),
      template: '{{#collection}}item{{else}}{{parentKey}}{{/collection}}'
    });
    view.render();
    expect(view.$('[data-collection-empty] div').html()).to.equal('value');
  });

  it("empty and collection helpers in the same template", function() {
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
    expect(a.$('.empty').html()).to.equal('empty');
    a.letters.reset(letterCollection.models);
    expect(a.$('.empty').length).to.equal(0);
    expect(a.$('[data-collection-cid] div')[0].innerHTML).to.equal('a');
    expect(oldRenderCount).to.equal(a._renderCount, 'render count unchanged on collection reset');

    b.render();
    expect(b.$('.empty').html()).to.equal('empty a');
    expect(b.$('[data-collection-cid] div')[0].innerHTML).to.equal('empty b');
    b.letters.reset(letterCollection.models);
    expect(b.$('.empty').length).to.equal(0);
    expect(b.$('[data-collection-cid] div')[0].innerHTML).to.equal('a');
  });

  it("should re-render when sort is triggered", function() {
    var collection = new Thorax.Collection(letterCollection.models);
    var view = new Thorax.View({
      collection: collection,
      template: '{{#collection tag="ul"}}<li>{{letter}}</li>{{/collection}}'
    });
    view.render();
    expect(view.$('li').length).to.equal(collection.length);
    expect(view.$('li').eq(0).html()).to.equal('a');
    // reverse alphabetical sort
    collection.comparator = function(letter) {
      return _.map(letter.get('letter').toLowerCase().split(''), function(l) { 
        return String.fromCharCode(-(l.charCodeAt(0)));
      });
    };
    collection.sort();
    expect(view.$('li').eq(0).html()).to.equal('d');
  });

  it("bindDataObject or model.set can be called in context()", function() {
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
    expect(view.$('[data-collection-cid] div')[0].innerHTML).to.equal('value');
  });

  it("filter what items are rendered in a collection", function() {
    //zepto does not support the :visible selector, so emulate
    function isVisible(elem) {
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
    expect(filterVisible(view.$('li')).length).to.equal(0);
    var a = new Thorax.Model({key: 'a'});
    view.collection.reset([a]);
    expect(filterVisible(view.$('li')).length).to.equal(1);
    expect(filterVisible(view.$('li'))[0].innerHTML).to.equal('a');
    var b = new Thorax.Model({key: 'b'});
    view.collection.add(b);
    expect(filterVisible(view.$('li')).length).to.equal(2);
    expect(filterVisible(view.$('li'))[1].innerHTML).to.equal('b');
    var c = new Thorax.Model({key: 'c'});
    view.collection.add(c);
    expect(filterVisible(view.$('li')).length).to.equal(2, 'add item that should not be included');
    expect(filterVisible(view.$('li'))[1].innerHTML).to.equal('b', 'add item that should not be included');
    c.set({key: 'b'});
    expect(filterVisible(view.$('li')).length).to.equal(3, 'set item not included to be included');
    expect(filterVisible(view.$('li'))[1].innerHTML).to.equal('b', 'set item not included to be included');
    expect(filterVisible(view.$('li'))[2].innerHTML).to.equal('b', 'set item not included to be included');
    c.set({key: 'c'});
    expect(filterVisible(view.$('li')).length).to.equal(2, 'set item that is included to not be included');
    expect(filterVisible(view.$('li'))[1].innerHTML).to.equal('b', 'set item that is included to not be included');
    a.set({key: 'x'});
    expect(filterVisible(view.$('li')).length).to.equal(1, 'set first included item to not be included');
    expect(filterVisible(view.$('li'))[0].innerHTML).to.equal('b', 'set first included item to not be included');
    a.set({key: 'a'});
    expect(filterVisible(view.$('li')).length).to.equal(2);
    expect(filterVisible(view.$('li'))[0].innerHTML).to.equal('a', 'set first item not included to be included');
    expect(filterVisible(view.$('li'))[1].innerHTML).to.equal('b', 'set first item not included to be included');
    a.set({key: 'a'});
    expect(filterVisible(view.$('li'))[0].innerHTML).to.equal('a', 'items maintain order when updated when filter is present');
    expect(filterVisible(view.$('li'))[1].innerHTML).to.equal('b', 'items maintain order when updated when filter is present');
    b.set({key: 'b'});
    expect(filterVisible(view.$('li'))[0].innerHTML).to.equal('a', 'items maintain order when updated when filter is present');
    expect(filterVisible(view.$('li'))[1].innerHTML).to.equal('b', 'items maintain order when updated when filter is present');
    view.$el.remove();

  });

  it("nested collection helper", function() {
    function testNesting(view, msg) {
      var blogModel = new Thorax.Model();
      view.setModel(blogModel);
      expect(view.$('[data-view-helper]').html()).to.equal('empty', msg + ' : starts empty');
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
      expect(view.$('h2').length).to.equal(2, msg + ' : title length');
      expect(view.$('h2')[0].innerHTML).to.equal('title one', msg + ' : title content');
      expect(view.$('h2')[1].innerHTML).to.equal('title two', msg + ' : title content');
      expect(view.$('p').length).to.equal(4, msg + ' : comment length');
      expect(view.$('p')[0].innerHTML).to.equal('comment one', msg + ' : comment content');
      expect(view.$('p')[1].innerHTML).to.equal('comment two', msg + ' : comment content');
      expect(view.$('p')[2].innerHTML).to.equal('comment three', msg + ' : comment content');
      expect(view.$('p')[3].innerHTML).to.equal('comment four', msg + ' : comment content');
      expect(view.$('span').length).to.equal(8, msg + ' : author length');

      comments2.add(new Thorax.Model({comment: 'comment five'}));
      expect(view.$('p')[4].innerHTML).to.equal('comment five', msg + ' : added comment content');

      blogModel.attributes.posts.add(new Thorax.Model({
        title: 'title three'
      }));
      expect(view.$('h2').length).to.equal(3, msg + ' : added title length');
      expect(view.$('h2')[2].innerHTML).to.equal('title three', msg + ' : added title content');
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

  it("collection model updates will update item", function() {
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
    expect(renderCount).to.equal(1);
    expect(view.$('li').html()).to.equal('a');
    collection.at(0).set({name: 'A'});
    expect(view.$('li').html()).to.equal('A');
    expect(renderCount).to.equal(1);
    collection.add({name: 'b'});
    expect(view.$('li:last-child').html()).to.equal('b');
    collection.at(1).set({name: 'B'});
    expect(view.$('li:last-child').html()).to.equal('B');
    expect(renderCount).to.equal(1);

    //ensure correct index is updated
    collection.at(0).set({name: 'a'});
    collection.at(1).set({name: 'c'});
    expect(view.$('li:first-child').html()).to.equal('a');
    expect(view.$('li:last-child').html()).to.equal('c');
    collection.at(0).set({name: 'A'});
    collection.add({name: 'b'});
    expect(collection.at(2).attributes.name).to.equal('c');
    collection.at(2).set({name: 'C'});
    expect(view.$('li:first-child').html()).to.equal('A');
    expect(view.$('li:last-child').html()).to.equal('C');

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
    expect(itemRenderCount).to.equal(1);
    expect(renderCount).to.equal(1);
    expect(view.$('li').html()).to.equal('one');
    collection.at(0).set({
      name: 'two'
    });
    expect(itemRenderCount).to.equal(2);
    expect(view.$('li').html()).to.equal('two');
    expect(renderCount).to.equal(1);
    collection.add({name: 'three'});
    expect(itemRenderCount).to.equal(3);
    expect(view.$('li:last-child').html()).to.equal('three');
    collection.at(1).set({name: 'four'});
    expect(itemRenderCount).to.equal(4);
    expect(view.$('li:last-child').html()).to.equal('four');
    expect(renderCount).to.equal(1);
  });

  it("collection-element helper", function() {
    var view = new Thorax.View({
      collection: letterCollection,
      template: '<div class="test">{{collection-element tag="ul"}}</div>',
      itemTemplate: 'letter-item'
    });
    expect(view.$('li').length).to.equal(letterCollection.length);
  });

  it("graceful failure of empty collection with no empty template", function() {
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
      collection: new Thorax.Collection()
    });
    view.render();
  });

  it("item-template and empty-template can return text nodes", function() {
    var view = new Thorax.View({
      letters: new Thorax.Collection(),
      template: '{{#collection letters}}{{letter}}{{else}}empty{{/collection}}'
    });
    view.render();
    expect(view.$('div[data-collection-cid] div').html()).to.equal('empty');
    expect(view.$('[data-collection-empty]').length).to.be.above(0);
    view.letters.reset(letterCollection.models);
    expect(view.$('div[data-collection-cid] div').html()).to.equal('a');
    expect(view.$('[data-collection-empty]').length).to.equal(0);
  });

  it("empty helper", function() {
    var emptyView = new Thorax.View({
      template: '{{#empty}}empty{{else}}not empty{{/empty}}'
    });
    emptyView.render();
    expect(emptyView.$('[data-view-helper]').html()).to.equal('empty');
    var emptyModelView = new Thorax.View({
      template: '{{#empty}}empty{{else}}not empty{{/empty}}',
      model: new Thorax.Model()
    });
    emptyModelView.render();
    expect(emptyModelView.$('[data-view-helper]').html()).to.equal('empty');
    emptyModelView.model.set({key: 'value'});
    expect(emptyModelView.$('[data-view-helper]').html()).to.equal('not empty');
    var emptyCollectionView = new Thorax.View({
      template: '{{#empty myCollection}}empty{{else}}not empty{{/empty}}',
      myCollection: new Thorax.Collection()
    });
    emptyCollectionView.render();
    expect(emptyCollectionView.$('[data-view-helper]').html()).to.equal('empty');
    var model = new Thorax.Model();
    emptyCollectionView.myCollection.add(model);
    expect(emptyCollectionView.$('[data-view-helper]').html()).to.equal('not empty');
    emptyCollectionView.myCollection.remove(model);
    expect(emptyCollectionView.$('[data-view-helper]').html()).to.equal('empty');
  });

  it("item-context & empty-context", function() {
    var view = new Thorax.View({
      collection: letterCollection,
      template: "{{#collection this.collection}}<span>{{test}}</span>{{/collection}}",
      itemContext: function() {
        return {
          test: 'testing'
        };
      }
    });
    view.render();
    expect(view.$('span').length).to.equal(letterCollection.length);
    expect(view.$('span')[0].innerHTML).to.equal('testing');

    //will use default
    view = new Thorax.View({
      collection: new (Thorax.Collection.extend({
        url: false,
        isEmpty: function() {
          return true;
        }
      }))(),
      template: "{{#collection this.collection}}{{test}}{{else}}<b>{{test}}</b>{{/collection}}",
      emptyContext: function() {
        return {
          test: 'testing'
        };
      }
    });
    view.render();
    expect(view.$('b')[0].innerHTML).to.equal('testing');
  });

  it("empty-class option", function() {
    var view = new Thorax.View({
      template: "{{#collection empty-class=\"a\" tag=\"ul\"}}{{/collection}}",
      collection: new (Thorax.Collection.extend({url: false}))()
    });
    view.render();
    expect(view.$('ul').hasClass('a')).to.be.true;
    var model = new Thorax.Model({key: 'value'});
    view.collection.add(model);
    expect(view.$('ul').hasClass('a')).to.be.false;
    view.collection.remove(model);
    expect(view.$('ul').hasClass('a')).to.be.true;

    //with default arg
    view = new Thorax.View({
      template: "{{#collection tag=\"ul\"}}{{/collection}}",
      collection: new (Thorax.Collection.extend({url: false}))()
    });
    view.render();
    expect(view.$('ul').hasClass('empty')).to.be.true;
    var model = new Thorax.Model({key: 'value'});
    view.collection.add(model);
    expect(view.$('ul').hasClass('empty')).to.be.false;
    view.collection.remove(model);
    expect(view.$('ul').hasClass('empty')).to.be.true;
  });

  it("helper and local scope collision", function() {
    var child = new Thorax.View({
      collection: letterCollection,
      template: '{{#collection this.collection tag="ul"}}<li>{{letter}}</li>{{/collection}}'
    });
    child.render();
    expect(child.$('li').html()).to.equal('a');
  });

  it("$.fn.collection", function() {
    var view = new Thorax.View({
      template: '{{#collection letters tag="ul"}}<li>{{letter}}</li>{{/collection}}',
      letters: letterCollection
    });
    view.render();
    expect(view.$('li:first-child').view().parent).to.equal(view);
    expect(view.$('ul').collection()).to.equal(letterCollection);
    expect(view.$('ul').model()).to.equal(false);
    expect(view.$el.collection()).to.equal(false);
    expect(view.$('li:first-child').collection()).to.equal(letterCollection);
    expect(view.$('li:first-child').model()).to.equal(letterCollection.models[0]);
  });

  it("collection events", function() {
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
    expect(callCounter.all - oldAllCount).to.equal(2);
    expect(callCounter.test1).to.equal(1);
    expect(callCounter.test2).to.equal(1);
  });
});
