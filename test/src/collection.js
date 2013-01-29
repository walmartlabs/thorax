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
    expect(letterCollection.isPopulated()).to.be['true'];
    expect(letterCollection.at(0).isPopulated()).to.be['true'];
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
      clonedLetterCollection.reset(_.clone(clonedLetterCollection.models));
      expect(renderedEmptyCount).to.equal(1, msg + 'rendered:empty event count');
      expect(view.$('li').length).to.equal(oldLength, msg + 'Reset does not cause change in number of rendered items');

      clonedLetterCollection.off();

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

    var viewWithCollectionHelperWithItemViewAndItemTemplate = new Thorax.View({
      template: '{{collection tag="ul" empty-view="letter-empty" item-view="letter-item" item-template="letter-item"}}'
    });
    runCollectionTests(viewWithCollectionHelperWithItemViewAndItemTemplate, 1, 'block helper with item-template');

    var viewWithCollectionHelperWithEmptyViewAndBlock = new Thorax.View({
      template: '{{collection tag="ul" empty-template="letter-empty" empty-view="letter-empty" item-template="letter-item"}}'
    });
    runCollectionTests(viewWithCollectionHelperWithEmptyViewAndBlock, 1, 'block helper with empty view and block');
  });

  it('should render sync fetch', function() {
    var collection = new Thorax.Collection();
    collection.url = true;
    collection.fetch = function() {
      collection.reset([{id: 1}, {id: 2}, {id: 3}]);
    };

    var view = new Thorax.View({
      template: '{{#collection}}<li>foo</li>{{/collection}}',
      collection: collection
    });
    view.render();
    expect(view.$('li').length).to.equal(3);
  });

  describe('multiple collections', function() {
    it('should render separate collections', function() {
      var view = new Thorax.View({
        template: '{{collection a tag="ul" item-template="letter-item"}}{{collection b tag="ul" item-template="letter-item"}}',
        a: new Thorax.Collection(letterCollection.models),
        b: new Thorax.Collection(letterCollection.models)
      });
      view.render();
      expect(view.$('li').length).to.equal(letterCollection.models.length * 2);
    });

    it('should render the same collection multiple times', function() {
      var view = new Thorax.View({
        template: '{{collection a tag="ul" item-template="letter-item"}}{{collection a tag="ul" item-template="letter-item"}}{{collection b tag="ul" item-template="letter-item"}}{{collection b tag="ul" item-template="letter-item"}}',
        a: new Thorax.Collection(letterCollection.models),
        b: new Thorax.Collection(letterCollection.models)
      });
      view.render();
      expect(view.$('li').length).to.equal(letterCollection.models.length * 4);
    });

    it('should render subview collections', function() {
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
    });

    it('should render with proper item template', function() {
      var view = new Thorax.View({
        template: '{{#collection a tag="ul"}}<li>{{letter}}</li>{{/collection}}{{#collection a tag="div"}}<span>{{letter}}</span>{{/collection}}',
        a: new Thorax.Collection(letterCollection.models)
      });
      view.render();
      expect(view.$('li').length).to.equal(letterCollection.models.length);
      expect(view.$('span').length).to.equal(letterCollection.models.length);
    });
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

  it("itemFilter should not be passed null items when appending empty", function() {
    var view = new Thorax.View({
      template: '{{#collection tag="ul"}}<li>{{key}}</li>{{/collection}}',
      collection: new Thorax.Collection(),
      itemFilter: function(model) {
        return model.attributes.key === 'a' || model.attributes.key === 'b';
      },
      emptyTemplate: function(){ return '<li>empty</li>'; }
    });
    view.render();
    expect(view.$('ul li').html()).to.equal('empty');
    var a = new Thorax.Model({key: 'a'});
    view.collection.reset([a]);
    expect(view.$('li').length).to.equal(1);
  });

  it("itemFilter will work in nested view helpers", function() {
    var view = new Thorax.View({
      collection: new Thorax.Collection([
        {letter: 'a'},
        {letter: 'b'}
      ]),
      template: '{{^empty collection}}{{#collection tag="ul"}}<li>{{letter}}</li>{{/collection}}{{/empty}}',
      itemFilter: function(model) {
        return model.get('letter') != 'a';
      }
    });
    view.render();

    expect(view.$('li').eq(0).css('display')).to.equal('none');
    expect(view.$('li').eq(1).css('display')).to.not.equal('none');
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
    var view = new Thorax.CollectionView({
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

  it("itemContext", function() {
    var view = new Thorax.View({
      key: 'value',
      collection: letterCollection,
      template: "{{#collection}}<span>{{test}}</span>{{/collection}}",
      itemContext: function() {
        // not checking for `view` or cid as itemContext will be called immediately
        // before `view` var is assigned
        expect(this.key).to.equal('value', 'itemContext called with correct context');
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
      template: "{{#collection}}{{test}}{{else}}<b>{{test}}</b>{{/collection}}",
      test: 'testing'
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
    expect(view.$('ul').hasClass('a')).to.be['true'];
    var model = new Thorax.Model({key: 'value'});
    view.collection.add(model);
    expect(view.$('ul').hasClass('a')).to.be['false'];
    view.collection.remove(model);
    expect(view.$('ul').hasClass('a')).to.be['true'];

    //with default arg
    view = new Thorax.View({
      template: "{{#collection tag=\"ul\"}}{{/collection}}",
      collection: new (Thorax.Collection.extend({url: false}))()
    });
    view.render();
    expect(view.$('ul').hasClass('empty')).to.be['true'];
    var model = new Thorax.Model({key: 'value'});
    view.collection.add(model);
    expect(view.$('ul').hasClass('empty')).to.be['false'];
    view.collection.remove(model);
    expect(view.$('ul').hasClass('empty')).to.be['true'];
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

  it('should render collection after setCollection is called', function() {
    var view = new Thorax.View({
      template: "hi{{collection}}"
    });
    view.render();
    expect(view.$('div').length).to.equal(1, 'initial render');
    view.setCollection(new Thorax.Collection());
    expect(view.$('div').length).to.equal(1, 'after setCollection (first)');
    view.setCollection(new Thorax.Collection());
    expect(view.$('div').length).to.equal(1, 'after setCollection (second)');
  });

  it('should preserve itself in the DOM after re-rendering collection', function() {
    var spy = this.spy();
    var collection = new Thorax.Collection([{key: 'one'}, {key: 'two'}]);
    var view = new Thorax.CollectionView({
      template: "{{collection-element tag=\"ul\"}}",
      itemTemplate: Handlebars.compile('<li>{{key}}</li>'),
      events: {
        'rendered:item': spy
      }
    });
    view.setCollection(collection);
    var oldUl = view.$('ul')[0];
    expect(spy.callCount).to.equal(2, 'without colletion helper before render');
    expect(view.$('ul').length).to.equal(1, 'without colletion helper before render');
    expect(view.$('li').length).to.equal(2, 'without colletion helper before render');

    view.render();
    expect(spy.callCount).to.equal(2, 'without colletion helper after render');
    expect(oldUl).to.equal(view.$('ul')[0], 'without colletion helper after render');
    expect(view.$('ul').length).to.equal(1, 'without colletion helper after render');
    expect(view.$('li').length).to.equal(2, 'without colletion helper after render');
    spy.callCount = 0;

    // Alternate way of testing
    var parent = $('<div></div>');
    view = new Thorax.View({
      template: '{{collection}}',
    });
    view.setCollection(new Thorax.Collection());
    parent.append(view.$el);
    var oldEl = parent.children('div')[0];
    view.render();
    expect(parent.children('div')[0]).to.equal(oldEl);
  });

  it('collection loaded via load() will be rendered', function() {
    var spy = this.spy();
    var server = sinon.fakeServer.create();
    var collection = new (Thorax.Collection.extend({
      url: '/test'
    }));
    var view = new Thorax.CollectionView({
      collection: collection,
      events: {
        'rendered:collection': spy
      },
      template: '{{collection-element}}',
      itemTemplate: Handlebars.compile('<span>{{text}}</span>')
    });
    server.requests[0].respond(
      200,
      { "Content-Type": "application/json" },
      JSON.stringify([{id: 1, text: "test"}])
    );
    expect(spy.callCount).to.equal(1);
    expect(view.$('span').html()).to.equal('test');
    server.restore();
  });

});
