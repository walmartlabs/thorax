describe('collection', function() {
  Handlebars.templates.letter = Handlebars.compile('{{collection tag="ul"}}');
  Handlebars.templates['letter-item'] = Handlebars.compile('<li>{{letter}}</li>');
  Handlebars.templates['letter-empty'] = Handlebars.compile('<li>empty</li>');
  Handlebars.templates['letter-multiple-item'] = Handlebars.compile('<li>{{letter}}</li><li>{{letter}}</li>');

  var LetterModel = Thorax.Model.extend({});
  var items = _.map(['a', 'b', 'c', 'd'], function(letter) {
    return {letter: letter};
  });
  var letterCollection = new (Thorax.Collection.extend({
    model: LetterModel
  }))(items);
  var LetterCollectionView = Thorax.View.extend({name: 'letter'});
  var LetterItemView = Thorax.View.extend({name: 'letter-item'});
  Thorax.View.extend({name: 'letter-empty'});

  it("should implement isPopulated", function() {
    expect(letterCollection.isPopulated()).to.be(true);
    expect(letterCollection.at(0).isPopulated()).to.be(true);
  });

  describe('collection view binding', function() {
    //when the fragment is created bind
    function addRenderItemBinding() {
      this.on('helper:collection', function(fragment) {
        fragment.renderItem = _.bind(this.renderItem, this);
      }, this);
    }

    it('should render named templates', function() {
      runCollectionTests(new LetterCollectionView());
    });

    it('should render views', function() {
      var view = new (LetterCollectionView.extend({
        initialize: addRenderItemBinding,
        renderItem: function(model) {
          return new LetterItemView({model: model});
        }
      }))();
      runCollectionTests(view);
    });

    it('should render views and templates', function() {
      var view = new (LetterCollectionView.extend({
        initialize: addRenderItemBinding,
        renderItem: function(model, i) {
          return i % 2 === 0 ? new LetterItemView({model: model}) : this.renderTemplate(this.name + '-item', model.attributes);
        }
      }))();
      runCollectionTests(view);
    });

    it('should render multiple elements per-model', function() {
      var view = new (LetterCollectionView.extend({
        initialize: addRenderItemBinding,
        renderItem: function(model) {
          return this.renderTemplate('letter-multiple-item', model.attributes);
        }
      }))();
      runCollectionTests(view, 2);
    });
  });

  it("should re-render when sort is triggered", function() {
    var collection = new Thorax.Collection(letterCollection.models);
    var view = new Thorax.View({
      collection: collection,
      template: Handlebars.compile('{{#collection tag="ul"}}<li>{{letter}}</li>{{/collection}}')
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

  describe('multiple collections', function() {
    it('should render separate collections', function() {
      var view = new Thorax.View({
        template: Handlebars.compile('{{collection a tag="ul" item-template="letter-item"}}{{collection b tag="ul" item-template="letter-item"}}'),
        a: new Thorax.Collection(letterCollection.models),
        b: new Thorax.Collection(letterCollection.models)
      });
      view.render();
      expect(view.$('li').length).to.equal(letterCollection.models.length * 2);
    });

    it('should render the same collection multiple times', function() {
      var view = new Thorax.View({
        template: Handlebars.compile('{{collection a tag="ul" item-template="letter-item"}}{{collection a tag="ul" item-template="letter-item"}}{{collection b tag="ul" item-template="letter-item"}}{{collection b tag="ul" item-template="letter-item"}}'),
        a: new Thorax.Collection(letterCollection.models),
        b: new Thorax.Collection(letterCollection.models)
      });
      view.render();
      expect(view.$('li').length).to.equal(letterCollection.models.length * 4);
    });

    it('should render subview collections', function() {
      Thorax.View.extend({
        name: 'sub-view-with-same-collection',
        template: Handlebars.compile('{{collection a tag="ul" item-template="letter-item"}}')
      });
      var a = new Thorax.Collection(letterCollection.models);
      var view = new Thorax.View({
        a: a,
        b: new Thorax.Collection(letterCollection.models),
        subViewWithSameCollection: new Thorax.Views['sub-view-with-same-collection']({
          a: a
        }),
        template: Handlebars.compile('{{collection a tag="ul" item-template="letter-item"}}{{view subViewWithSameCollection}}')
      });
      view.render();
      expect(view.$('li').length).to.equal(letterCollection.models.length * 2);
    });

    it('should render with proper item template', function() {
      var view = new Thorax.View({
        template: Handlebars.compile('{{#collection a tag="ul"}}<li>{{letter}}</li>{{/collection}}{{#collection a tag="div"}}<span>{{letter}}</span>{{/collection}}'),
        a: new Thorax.Collection(letterCollection.models)
      });
      view.render();
      expect(view.$('li').length).to.equal(letterCollection.models.length);
      expect(view.$('span').length).to.equal(letterCollection.models.length);
    });
  });

  describe('empty rendering', function() {
    it("inverse block in collection helper", function() {
      var emptyCollectionView = new Thorax.View({
        template: Handlebars.compile('{{#collection}}<div>{{letter}}</div>{{else}}<div>empty</div>{{/collection}}'),
        collection: new Thorax.Collection()
      });
      emptyCollectionView.render();
      expect(emptyCollectionView.$('[data-collection-cid]').html().toLowerCase()).to.equal('<div>empty</div>');
    });

    it("empty template defaults to parent scope", function() {
      var view = new Thorax.View({
        parentKey: 'value',
        collection: new (Thorax.Collection.extend({url: false}))(),
        template: Handlebars.compile('{{#collection}}item{{else}}{{parentKey}}{{/collection}}')
      });
      view.render();
      expect(view.$('[data-collection-empty] div').html()).to.equal('value');
    });

    it("empty-class option", function() {
      var view = new Thorax.View({
        template: Handlebars.compile("{{#collection empty-class=\"a\" tag=\"ul\"}}{{/collection}}"),
        collection: new (Thorax.Collection.extend({url: false}))()
      });
      view.render();
      expect(view.$('ul').hasClass('a')).to.be(true);
      var model = new Thorax.Model({key: 'value'});
      view.collection.add(model);
      expect(view.$('ul').hasClass('a')).to.be(false);
      view.collection.remove(model);
      expect(view.$('ul').hasClass('a')).to.be(true);

      //with default arg
      view = new Thorax.View({
        template: Handlebars.compile("{{#collection tag=\"ul\"}}{{/collection}}"),
        collection: new (Thorax.Collection.extend({url: false}))()
      });
      view.render();
      expect(view.$('ul').hasClass('empty')).to.be(true);
      var model = new Thorax.Model({key: 'value'});
      view.collection.add(model);
      expect(view.$('ul').hasClass('empty')).to.be(false);
      view.collection.remove(model);
      expect(view.$('ul').hasClass('empty')).to.be(true);
    });
  });

  describe('filter', function() {
    it("filter what items are rendered in a collection", function() {
      //zepto does not support the :visible selector, so emulate
      function isVisible(elem) {
        elem = $(elem);
        return !!($serverSide || elem.width() || elem.height()) && elem.css("display") !== "none";
      }

      function filterVisible(arr) {
        return $(_.select(arr, function(el) {
          return isVisible(el);
        }));
      }

      var view = new Thorax.View({
        template: Handlebars.compile('{{#collection tag="ul"}}<li>{{key}}</li>{{/collection}}'),
        collection: new Thorax.Collection(),
        itemFilter: function(model) {
          return model.attributes.key === 'a' || model.attributes.key === 'b';
        }
      });
      view.render();
      $('body').append(view.el);
      expect(filterVisible(view.$('li')).length).to.equal(0);
      var a = new Thorax.Model({key: 'a'});
      view.collection.reset([a]);
      expect(filterVisible(view.$('li')).length).to.equal(1);
      expect(filterVisible(view.$('li')).eq(0).html()).to.equal('a');
      var b = new Thorax.Model({key: 'b'});
      view.collection.add(b);
      expect(filterVisible(view.$('li')).length).to.equal(2);
      expect(filterVisible(view.$('li')).eq(1).html()).to.equal('b');
      var c = new Thorax.Model({key: 'c'});
      view.collection.add(c);
      expect(filterVisible(view.$('li')).length).to.equal(2, 'add item that should not be included');
      expect(filterVisible(view.$('li')).eq(1).html()).to.equal('b', 'add item that should not be included');
      c.set({key: 'b'});
      expect(filterVisible(view.$('li')).length).to.equal(3, 'set item not included to be included');
      expect(filterVisible(view.$('li')).eq(1).html()).to.equal('b', 'set item not included to be included');
      expect(filterVisible(view.$('li')).eq(2).html()).to.equal('b', 'set item not included to be included');
      c.set({key: 'c'});
      expect(filterVisible(view.$('li')).length).to.equal(2, 'set item that is included to not be included');
      expect(filterVisible(view.$('li')).eq(1).html()).to.equal('b', 'set item that is included to not be included');
      a.set({key: 'x'});
      expect(filterVisible(view.$('li')).length).to.equal(1, 'set first included item to not be included');
      expect(filterVisible(view.$('li')).eq(0).html()).to.equal('b', 'set first included item to not be included');
      a.set({key: 'a'});
      expect(filterVisible(view.$('li')).length).to.equal(2);
      expect(filterVisible(view.$('li')).eq(0).html()).to.equal('a', 'set first item not included to be included');
      expect(filterVisible(view.$('li')).eq(1).html()).to.equal('b', 'set first item not included to be included');
      a.set({key: 'a'});
      expect(filterVisible(view.$('li')).eq(0).html()).to.equal('a', 'items maintain order when updated when filter is present');
      expect(filterVisible(view.$('li')).eq(1).html()).to.equal('b', 'items maintain order when updated when filter is present');
      b.set({key: 'b'});
      expect(filterVisible(view.$('li')).eq(0).html()).to.equal('a', 'items maintain order when updated when filter is present');
      expect(filterVisible(view.$('li')).eq(1).html()).to.equal('b', 'items maintain order when updated when filter is present');
      view.$el.remove();
    });

    it("itemFilter should not be passed null items when appending empty", function() {
      var view = new Thorax.View({
        template: Handlebars.compile('{{#collection tag="ul"}}<li>{{key}}</li>{{/collection}}'),
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
        template: Handlebars.compile('{{^empty collection}}{{#collection tag="ul"}}<li>{{letter}}</li>{{/collection}}{{/empty}}'),
        itemFilter: function(model) {
          return model.get('letter') !== 'a';
        }
      });
      view.render();

      expect(view.$('li').eq(0).css('display')).to.equal('none');
      expect(view.$('li').eq(1).css('display')).to.not.equal('none');
    });

    it('will re-render on updateFilter call', function() {
      var view = new Thorax.CollectionView({
        collection: new Thorax.Collection([
          {letter: 'a'},
          {letter: 'b'}
        ]),
        renderItem: function() {
          return '<div>foo</div>';
        },
        itemFilter: function(model) {
          return model.get('letter') !== 'a';
        }
      });

      view.render();
      expect(_.map(view.$('div'), function(el) {
        return $(el).css('display') || 'block';
      })).to.eql(['none', 'block']);

      view.itemFilter = function() {
        return true;
      };
      view.updateFilter();
      expect(_.map(view.$('div'), function(el) {
        return $(el).css('display') || 'block';
      })).to.eql(['block', 'block']);
    });
  });

  it("collection-element helper", function() {
    var view = new Thorax.CollectionView({
      collection: letterCollection,
      template: Handlebars.compile('<div class="test">{{collection-element tag="ul"}}</div>'),
      itemTemplate: Handlebars.templates['letter-item']
    });
    view.render();
    expect(view.$('li').length).to.equal(letterCollection.length);
  });

  it("$.fn.collection", function() {
    var view = new Thorax.View({
      template: Handlebars.compile('{{#collection letters tag="ul"}}<li>{{letter}}</li>{{/collection}}'),
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
      template: function() {},
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

  describe('rendering', function() {
    it('should render deferred', function(done) {
      var collection = new Thorax.Collection([{id: 1}, {id: 2}, {id: 3}]),
          itRan = false;

      var view = new Thorax.CollectionView({
        itemTemplate: Handlebars.compile('<li>foo</li>'),
        collection: collection
      });
      view.on('rendered:collection', function() {
        itRan = true;
      });
      view.render(undefined, function() {
        expect(view.$('li').length).to.equal(3);
        expect(itRan).to.be(true);
        done();
      });
      expect(view.$('li').length).to.equal(0);
      expect(itRan).to.be(false);
      this.clock.tick(1000);
    });

    it('should render helper deferred', function(done) {
      var collection = new Thorax.Collection([{id: 1}, {id: 2}, {id: 3}]),
          itRan = false;

      var view = new Thorax.View({
        template: Handlebars.compile('{{#collection}}<li>foo</li>{{/collection}}'),
        collection: collection
      });
      view.on('rendered:collection', function() {
        itRan = true;
      });
      view.render(undefined, function() {
        expect(view.$('li').length).to.equal(3);
        expect(itRan).to.be(true);
        done();
      });
      expect(view.$('li').length).to.equal(0);
      expect(itRan).to.be(false);
      this.clock.tick(1000);
    });

    it('should render sync fetch', function() {
      var collection = new Thorax.Collection();
      collection.url = true;
      collection.fetch = function() {
        collection.reset([{id: 1}, {id: 2}, {id: 3}]);
      };

      var view = new Thorax.View({
        template: Handlebars.compile('{{#collection}}<li>foo</li>{{/collection}}'),
        collection: collection
      });
      view.render();
      expect(view.$('li').length).to.equal(3);
    });

    it("nested render should throw", function() {
      //this causes recursion
      function doNestedRender() {
        var view = new Thorax.View({
          template: Handlebars.compile('{{key}}{{#collection col}}{{key}}{{/collection}}'),
          context: function() {
            this.model.set({key: 'value'});
            return {
              key: 'value',
              col: new Thorax.Collection([{key: 'value'}])
            };
          }
        });
        view.setModel(new Thorax.Model(), {render: true});
      }
      expect(doNestedRender).to.throwError();
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
        template: Handlebars.compile('{{#collection myCollection tag="ul"}}<li>{{name}}</li>{{/collection}}')
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
    });

    it('model update will update item view', function() {
      var collection = new Thorax.Collection({name: 'one'}),
          renderCount = 0,
          itemRenderCount = 0,
          children = [];
      var view = new Thorax.View({
        name: 'outer-view',
        initialize: function() {
          this.on('rendered', function() {
            ++renderCount;
          });
        },
        itemView: Thorax.View.extend({
          itemRenderCount: 0,

          name: 'inner-view',
          initialize: function() {
            children.push(this);

            this.on('rendered', function() {
              itemRenderCount++;
              ++this.itemRenderCount;
            });
          },
          tagName: 'li',
          template: Handlebars.compile('{{name}}')
        }),
        myCollection: collection,
        template: Handlebars.compile('{{collection myCollection tag="ul" item-view=itemView}}')
      });

      view.render();
      expect(renderCount).to.equal(1);

      expect(itemRenderCount).to.equal(1);
      expect(children[0].itemRenderCount).to.equal(1);
      expect(view.$('li').html()).to.equal('one');

      collection.at(0).set({
        name: 'two'
      });
      expect(itemRenderCount).to.equal(2);
      expect(children[0].itemRenderCount).to.equal(2);
      expect(view.$('li').html()).to.equal('two');

      collection.add({name: 'three'});
      expect(itemRenderCount).to.equal(3);
      expect(children[1].itemRenderCount).to.equal(1);
      expect(view.$('li:last-child').html()).to.equal('three');

      collection.at(1).set({name: 'four'});
      expect(itemRenderCount).to.equal(4);
      expect(children[1].itemRenderCount).to.equal(2);
      expect(view.$('li:last-child').html()).to.equal('four');

      expect(renderCount).to.equal(1);
      expect(children.length).to.equal(2);
    });
    it('should render collection after setCollection is called', function() {
      var view = new Thorax.View({
        template: Handlebars.compile("hi{{#collection}}{{/collection}}")
      });
      view.render();
      expect(view.$('div').length).to.equal(1, 'initial render');
      view.setCollection(new Thorax.Collection());
      expect(view.$('div').length).to.equal(1, 'after setCollection (first)');
      view.setCollection(new Thorax.Collection());
      expect(view.$('div').length).to.equal(1, 'after setCollection (second)');
    });

    it('should defer render collection after setCollection is called', function() {
      var spy = this.spy();

      var view = new Thorax.View({
        events: {
          'rendered rendered:item': spy
        },
        template: Handlebars.compile("{{collection}}"),
        itemTemplate: function() { return '<div class="item">' + this.id + '</div>'; },
        collection: new Thorax.Collection([{id:1},{id:2}])
      });
      expect(spy.callCount).to.equal(0);
      view.render();
      expect(spy.callCount).to.equal(3);
      expect(view.$('.item').length).to.equal(2);
    });

    it('should preserve itself in the DOM after re-rendering collection', function() {
      var spy = this.spy();
      var collection = new Thorax.Collection([{key: 'one'}, {key: 'two'}]);
      var view = new Thorax.CollectionView({
        template: Handlebars.compile("{{collection-element tag=\"ul\"}}"),
        itemTemplate: Handlebars.compile('<li>{{key}}</li>'),
        events: {
          'rendered:item': spy
        }
      });
      view.render();
      view.setCollection(collection);
      // Note that we want to compare HTML instead of the actual node
      // as in IE only we will clone the node. In other browsers will
      // use the same node, but don't want to do browser conditional
      // unit tests
      var oldUlHTML = view.$('ul').eq(0).html();
      expect(spy.callCount).to.equal(2, 'without collection helper before render');
      expect(view.$('ul').length).to.equal(1, 'without collection helper before render');
      expect(view.$('li').length).to.equal(2, 'without collection helper before render');

      view.render();
      expect(spy.callCount).to.equal(2, 'without collection helper after render');
      expect(oldUlHTML).to.equal(view.$('ul').eq(0).html(), 'without collection helper after render');
      expect(view.$('ul').length).to.equal(1, 'without collection helper after render');
      expect(view.$('li').length).to.equal(2, 'without collection helper after render');
      spy.callCount = 0;

      // Alternate way of testing
      var parent = $('<div></div>');
      view = new Thorax.View({
        template: Handlebars.compile('{{#collection}}{{/collection}}')
      });
      view.setCollection(new Thorax.Collection());
      parent.append(view.$el);
      var oldEl = parent.children('div')[0];
      view.render();
      expect(parent.children('div')[0]).to.equal(oldEl);
    });

    it("item-template and empty-template can return text nodes", function() {
      var view = new Thorax.View({
        letters: new Thorax.Collection(),
        template: Handlebars.compile('{{#collection letters}}{{letter}}{{else}}empty{{/collection}}')
      });
      view.render();
      expect(view.$('div[data-collection-cid] div').html()).to.equal('empty');
      expect(view.$('[data-collection-empty]').length).to.be.above(0);
      view.letters.reset(letterCollection.models);
      expect(view.$('div[data-collection-cid] div').html()).to.equal('a');
      expect(view.$('[data-collection-empty]').length).to.equal(0);
    });
  });

  describe('view delegation', function() {
    describe('#getCollectionViews', function() {
      var view,
          collection1,
          collection2;

      beforeEach(function() {
        collection1 = new Thorax.Collection();
        collection2 = new Thorax.Collection();

        view = new Thorax.View({
          template: Handlebars.compile('{{#collection tag="ul"}}<li>{{key}}</li>{{/collection}}{{#collection collection2}}foo{{/collection}}'),
          collection: collection1,
          collection2: collection2
        });
        view.render();
      });
      it('will find specific collection views', function() {
        var collectionView = _.values(view.children)[0];

        expect(view.getCollectionViews(collectionView.collection)).to.eql([collectionView]);
      });
      it('will find all collection views', function() {
        expect(view.getCollectionViews()).to.eql(_.values(view.children));
      });
    });

    it('will delegate to children on updateFilter call', function() {
      var collectionView = {
        updateFilter: this.spy()
      };
      var view = new Thorax.View({
        getCollectionViews: function() { return [collectionView]; }
      });

      view.updateFilter();
      expect(collectionView.updateFilter.callCount).to.equal(1);
    });
  });
});

describe('collection view', function() {
  it('collection loaded via load() will be rendered', function() {
    if ($serverSide) {
      // Not going to attempt to mock AJAX requests within fruit loops environments.
      return;
    }

    var spy = this.spy();
    var server = sinon.fakeServer.create();
    var collection = new (Thorax.Collection.extend({
      url: '/test'
    }))();
    var view = new Thorax.CollectionView({
      collection: collection,
      events: {
        'rendered:collection': spy
      },
      template: Handlebars.compile('{{collection-element}}'),
      itemTemplate: Handlebars.compile('<span>{{text}}</span>')
    });
    view.render();

    server.requests[0].respond(
      200,
      { "Content-Type": "application/json" },
      JSON.stringify([{id: 1, text: "test"}])
    );
    expect(spy.callCount).to.equal(2);
    expect(view.$('span').html()).to.equal('test');
    server.restore();
  });

  it('may have a blank template', function() {
    var view = new Thorax.CollectionView({
      tagName: 'ul',
      collection: new Thorax.Collection([{key: 'value'}]),
      itemTemplate: Handlebars.compile('<li>{{key}}</li>')
    });
    view.render();
    expect(view.$('li').length).to.equal(1);
  });

  it('will assign template if view only has name', function() {
    Handlebars.templates['collection-view-with-name'] = Handlebars.compile('<div class="named">{{collection-element tag="ul"}}</div>');
    var view = new Thorax.CollectionView({
      name: 'collection-view-with-name',
      itemTemplate: Handlebars.compile('<li>{{key}}</li>'),
      collection: new Thorax.Collection([{key: 'value'}])
    });
    view.render();
    expect(view.$('.named li').length).to.equal(1);
  });

  it('should throw if no template can be found', function() {
    var view = new Thorax.View({
      template: Handlebars.compile('{{collection}}')
    });
    var collection = new Thorax.Collection([{id: 1}]);
    function setCollection() {
      view.setCollection(collection);
      view.render();
    }
    expect(setCollection).to.throwError();
  });

  it("getCollectionElement should still return the correct element with nested collection views", function() {
    var parent = new Thorax.CollectionView({
      collection: new Thorax.Collection([]),
      template: Handlebars.compile('{{collection-element}}{{view child}}'),
      itemTemplate: Handlebars.compile(''),
      child: new Thorax.CollectionView({
        collection: new Thorax.Collection([]),
        template: Handlebars.compile(''),
        itemTemplate: Handlebars.compile('')
      })
    });
    parent.render();
    expect(parent.getCollectionElement()[0]).to.equal(parent.$('div')[0]);
    expect(parent.getCollectionElement()[0]).to.not.equal(parent.child.getCollectionElement()[0]);

    var parentWithCollectionHelper = new Thorax.View({
      collection: new Thorax.Collection([{key: 'value'}]),
      template: Handlebars.compile('{{#collection tag="ul"}}<li>{{key}}</li>{{/collection}}')
    });
    parentWithCollectionHelper.render();
    var parentCollectionView = parentWithCollectionHelper.children[_.keys(parentWithCollectionHelper.children)[0]];

    var childWithCollectionHelper = new Thorax.View({
      collection: new Thorax.Collection([{key: 'value'}]),
      template: Handlebars.compile('{{#collection tag="ul" class="inner"}}<li>{{key}}</li>{{/collection}}')
    });
    childWithCollectionHelper.appendTo(parentWithCollectionHelper.$('li')[0]);
    var childCollectionView = childWithCollectionHelper.children[_.keys(childWithCollectionHelper.children)[0]];

    expect(parentCollectionView.getCollectionElement()[0]).to.not.equal(childCollectionView.getCollectionElement()[0]);
  });

  it("should accept a change option", function() {
    var model = new Thorax.Model({key: 'a'});
    var view = new Thorax.CollectionView({
      tagName: 'ul',
      itemTemplate: Handlebars.compile('<li>{{key}}</li>')
    });
    view.setCollection(new Thorax.Collection([model]), {
      change: false
    });
    view.ensureRendered();
    expect(view.$('li').html()).to.equal('a');
    model.set({key: 'b'});
    expect(view.$('li').html()).to.equal('a');
  });

  it('should not leak views created within the item template', function() {
    var collection = new Thorax.Collection([{letter: 'foo'}, {letter: 'bar'}]),
        releaseSpy = this.spy();

    Thorax.View.extend({
      name: 'foo-view',
      template: Handlebars.compile('fubar'),
      release: releaseSpy
    });

    var view = new Thorax.View({
      collection: collection,
      template: Handlebars.compile('{{collection tag="ul"}}'),
      itemTemplate: Handlebars.compile('<li>{{view innerView}}<br>{{view "foo-view"}}</li>'),
      itemContext: function(item) {
        return _.defaults({
          innerView: new Thorax.View({
            model: item,
            template: Handlebars.compile('{{letter}}'),
            release: releaseSpy
          })
        }, item.attributes);
      }
    });
    view.render();

    var collectionViewName = _.keys(view.children)[0],
        children = view.children[collectionViewName].children;

    collection.at(0).set({letter: 'baz'});

    // The expected number of children of the collection view is 4 (2 items in collection, 2 views per item)
    expect(_.keys(children).length).to.equal(4);
    expect(releaseSpy.callCount).to.equal(2);
  });

});

function runCollectionTests(view, indexMultiplier) {
  indexMultiplier = indexMultiplier || 1;

  function matchCids(collection) {
    collection.forEach(function(model) {
      expect(view.$('[data-model-cid="' + model.cid + '"]').length).to.equal(1 * indexMultiplier, 'match CIDs');
    });
  }
  expect(view.el.firstChild).to.not.be.ok();

  var LetterModel = Thorax.Model.extend({});
  var items = _.map(['a', 'b', 'c', 'd'], function(letter) {
    return {letter: letter};
  });

  var letterCollection = new (Thorax.Collection.extend({
        model: LetterModel
      }))(items),
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

  view.collection = letterCollection;
  view.render();
  expect(view.$('li').length).to.equal(4 * indexMultiplier, 'rendered node length matches collection length');
  expect(view.$('li').eq(0 * indexMultiplier).html() + view.$('li').eq(3 * indexMultiplier).html()).to.equal('ad', 'rendered nodes in correct order');
  expect(renderedCount).to.equal(1, 'rendered event count');
  expect(renderedCollectionCount).to.equal(1, 'rendered:collection event count');
  expect(renderedItemCount).to.equal(4, 'rendered:item event count');
  expect(renderedEmptyCount).to.equal(0, 'rendered:empty event count');
  matchCids(letterCollection);

  //reorder
  letterCollection.remove(letterCollection.at(0));
  expect(view.$('li').eq(0 * indexMultiplier).html() + view.$('li').eq(2 * indexMultiplier).html()).to.equal('bd', 'rendered nodes in correct order');
  letterCollection.remove(letterCollection.at(2));
  expect(view.$('li').eq(0 * indexMultiplier).html() + view.$('li').eq(1 * indexMultiplier).html()).to.equal('bc', 'rendered nodes in correct order');
  letterCollection.add(new LetterModel({letter: 'e'}));
  expect(view.$('li').eq(2 * indexMultiplier).html()).to.equal('e', 'collection and nodes maintain sort order');
  letterCollection.add(new LetterModel({letter: 'a'}), {at: 0});
  expect(view.$('li').eq(0 * indexMultiplier).html()).to.equal('a', 'collection and nodes maintain sort order');
  expect(renderedCount).to.equal(1, 'rendered event count');
  expect(renderedCollectionCount).to.equal(1, 'rendered:collection event count');
  expect(renderedItemCount).to.equal(6, 'rendered:item event count');
  expect(renderedEmptyCount).to.equal(0, 'rendered:empty event count');
  matchCids(letterCollection);

  //empty
  letterCollection.remove(letterCollection.models);
  expect(view.$('li').eq(0).html()).to.equal('empty', 'empty collection renders empty');
  letterCollection.add(new LetterModel({letter: 'a'}));

  expect(view.$('li').length).to.equal(1 * indexMultiplier, 'transition from empty to one item');
  expect(view.$('li').eq(0 * indexMultiplier).html()).to.equal('a', 'transition from empty to one item');
  expect(renderedCount).to.equal(1, 'rendered event count');
  expect(renderedCollectionCount).to.equal(1, 'rendered:collection event count');
  expect(renderedItemCount).to.equal(7, 'rendered:item event count');
  expect(renderedEmptyCount).to.equal(1, 'rendered:empty event count');
  matchCids(letterCollection);

  var oldLength = view.$('li').length;
  letterCollection.reset(_.clone(letterCollection.models));
  expect(renderedEmptyCount).to.equal(1, 'rendered:empty event count');
  expect(view.$('li').length).to.equal(oldLength, 'Reset does not cause change in number of rendered items');

  letterCollection.off();

  letterCollection.remove(letterCollection.models);
  expect(renderedEmptyCount).to.equal(1, 'rendered:empty event count');
  expect(view.$('li').eq(0 * indexMultiplier).html()).to.equal('a', 'transition from empty to one item after freeze');
}
