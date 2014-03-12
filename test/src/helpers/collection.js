/*global runCollectionTests*/
describe('collection helper', function() {
  it('should have access to handlebars noop', function() {
    // Explicit verification that Handlebars is exposing this field.
    expect(Handlebars.VM.noop).to.be.ok();
  });

  it('should allow use of expand-tokens', function() {
    var view = new Thorax.View({
      key: 'value',
      template: Handlebars.compile('{{#collection class="{{key}}" expand-tokens=true}}{{/collection}}'),
      collection: new Thorax.Collection([{a: 'a'}])
    });
    view.render();
    expect(view.$('div.value').length).to.equal(1);
  });

  it('should allow arbitrary html attributes', function() {
    var view = new Thorax.View({
      template: Handlebars.compile('{{#collection random="value"}}{{/collection}}'),
      collection: new Thorax.Collection([{a: 'a'}])
    });
    view.render();
    expect(view.$('div[random="value"]').length).to.equal(1);
  });

  it('should allow name attribute', function() {
    var view = new Thorax.View({
      template: Handlebars.compile('{{#collection tag="select" name="select" class="test-class"}}<option value="{{id}}">{{id}}</option>{{/collection}}'),
      collection: new Thorax.Collection([{
        id: 1
      }, {
        id: 2
      }])
    });
    view.render();
    expect(view.$('select').attr('name')).to.equal('select');
    expect(view.$('select').attr('class')).to.equal('test-class');
  });

  it('should render block', function() {
    var view = new Thorax.View({
      template: Handlebars.compile('{{#collection tag="ul" empty-template="letter-empty"}}<li>{{letter}}</li>{{/collection}}')
    });
    runCollectionTests(view);
  });

  it('should render item-view', function() {
    var view = new Thorax.View({
      template: Handlebars.compile('{{collection tag="ul" empty-template="letter-empty" item-view="letter-item"}}')
    });
    runCollectionTests(view);
  });

  it('should render with item-view and block', function() {
    var view = new Thorax.View({
      template: Handlebars.compile('{{#collection tag="ul" empty-template="letter-empty" item-view="letter-item"}}<li class="testing">{{letter}}</li>{{/collection}}')
    });
    runCollectionTests(view);
  });

  it('should render with item-template', function() {
    var view = new Thorax.View({
      template: Handlebars.compile('{{collection tag="ul" empty-view="letter-empty" item-template="letter-item"}}')
    });
    runCollectionTests(view);
  });

  it('shoud accept item-context as argument', function() {
    var view = new Thorax.View({
      a: new Thorax.Collection([{key: 'value'}]),
      b: new Thorax.Collection([{key: 'value'}]),
      itemContextA: function() {
        return {
          one: 'one' + this.exclamation
        };
      },
      itemContextB: function() {
        return {
          two: 'two' + this.exclamation
        };
      },
      // ensures is called with correct context
      exclamation: '!',
      template: Handlebars.compile('{{#collection a tag="ul" item-context="itemContextA"}}<li>{{one}}</li>{{/collection}}{{#collection b item-context=itemContextB tag="ul"}}<li>{{two}}</li>{{/collection}}')
    });
    view.render();
    expect(view.$('ul:first-child li').html()).to.equal('one!');
    expect(view.$('ul:last-child li').html()).to.equal('two!');
  });

  it('should accept item-filter as argument', function() {
    var view = new Thorax.View({
      a: new Thorax.Collection([{key: 'value'}]),
      b: new Thorax.Collection([{key: 'value'}]),
      itemFilterA: function() {
        return true;
      },
      itemFilterB: function() {
        return false;
      },
      template: Handlebars.compile('{{#collection a tag="ul" item-filter="itemFilterA"}}<li>{{one}}</li>{{/collection}}{{#collection b item-filter=itemFilterB tag="ul"}}<li>{{two}}</li>{{/collection}}')
    });
    view.render();
    expect(view.$('ul:first-child li').css('display')).to.not.equal('none');
    expect(view.$('ul:last-child li').css('display')).to.equal('none');
  });

  it('should item-view and item-template', function() {
    var view = new Thorax.View({
      template: Handlebars.compile('{{collection tag="ul" empty-view="letter-empty" item-view="letter-item" item-template="letter-item"}}')
    });
    runCollectionTests(view);
  });

  it('should render with empty-view and empty-template', function() {
    var view = new Thorax.View({
      template: Handlebars.compile('{{collection tag="ul" empty-template="letter-empty" empty-view="letter-empty" item-template="letter-item"}}')
    });
    runCollectionTests(view);
  });

  it("graceful failure of empty collection with no empty template", function() {
    var view = new Thorax.View({
      template: Handlebars.compile('{{collection item-template="letter-item"}}'),
      collection: new Thorax.Collection({
        isPopulated: function() {
          return true;
        }
      })
    });
    view.render();
    view = new Thorax.View({
      template: Handlebars.compile('{{collection item-template="letter-item"}}'),
      collection: new Thorax.Collection()
    });
    view.render();
  });

  it("transition from no collection to collection", function() {
    var view = new Thorax.View({
      template: Handlebars.compile('{{#collection tag="ul"}}<li>{{letter}}</li>{{/collection}}')
    });
    view.render();
    expect(view.$('li').length).to.equal(0);
    var collection = new Thorax.Collection([{letter: 'a'}]);
    view.setCollection(collection);
    expect(view.$('li').length).to.equal(1);
    view.setCollection(false);
    expect(view.$('li').length).to.equal(0);
    // keep swapping back and forth
    view.setCollection(collection);
    expect(view.$('li').length).to.equal(1);
    view.setCollection(false);
    expect(view.$('li').length).to.equal(0);
  });

  it("should auto assign item-view and empty-view if available", function() {
    Thorax.View.extend({
      name: "auto-assign-item",
      template: Handlebars.compile('<li>{{key}}</li>')
    });
    Thorax.View.extend({
      name: "auto-assign-empty",
      template: Handlebars.compile('<li>empty</li>')
    });

    var autoAssignView = new Thorax.CollectionView({
      name: 'auto-assign',
      tagName: 'ul',
      collection: new Thorax.Collection([])
    });
    autoAssignView.render();
    expect(autoAssignView.$('li').html()).to.equal('empty');
    autoAssignView.collection.add({key: 'value'});
    expect(autoAssignView.$('li').html()).to.equal('value');

    var autoAssignViewWithHelper = new Thorax.View({
      name: 'auto-assign',
      template: Handlebars.compile('{{collection tag="ul"}}'),
      collection: new Thorax.Collection([])
    });
    autoAssignViewWithHelper.render();
    expect(autoAssignViewWithHelper.$('li').html()).to.equal('empty');
    autoAssignViewWithHelper.collection.add({key: 'value'});
    expect(autoAssignViewWithHelper.$('li').html()).to.equal('value');
  });

  it("collection-element declared outside of CollectionView will raise", function() {
    var view = new Thorax.View({
      template: Handlebars.compile('{{collection-element}}')
    });
    expect(_.bind(view.render, view)).to.throwError();
  });

  it("collection helper won't re-render parent on add", function() {
    var spy = this.spy();
    var collection = new Thorax.Collection([{letter: 'a'}]);
    var view = new Thorax.View({
      events: {
        rendered: spy
      },
      template: Handlebars.compile('{{#collection tag="ul"}}<li>{{letter}}</li>{{/collection}}')
    });
    view.render();
    expect(spy.callCount).to.equal(1);
    view.setCollection(collection);
    expect(spy.callCount).to.equal(1);
    expect(view.$('li').length).to.equal(1);
    collection.add({letter: 'b'});
    expect(spy.callCount).to.equal(1);
    expect(view.$('li').length).to.equal(2);
  });

  it("events handled on parent when collection view renders", function() {
    var spy = this.spy();
    var view = new Thorax.View({
      events: {
        collection: {
          test: spy
        }
      },
      template: Handlebars.compile('{{#collection}}{{/collection}}'),
      collection: new Thorax.Collection()
    });
    view.collection.trigger('test');
    expect(spy.callCount).to.equal(1);
  });

  it("nested collection helper", function() {
    function testNesting(view, msg) {
      var blogModel = new Thorax.Model();
      view.setModel(blogModel, {render: true});
      expect(view.html()).to.equal('empty', msg + ' : starts empty');
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
      expect(view.$('h2').eq(0).html()).to.equal('title one', msg + ' : title content');
      expect(view.$('h2').eq(1).html()).to.equal('title two', msg + ' : title content');
      expect(view.$('p').length).to.equal(4, msg + ' : comment length');
      expect(view.$('p').eq(0).html()).to.equal('comment one', msg + ' : comment content');
      expect(view.$('p').eq(1).html()).to.equal('comment two', msg + ' : comment content');
      expect(view.$('p').eq(2).html()).to.equal('comment three', msg + ' : comment content');
      expect(view.$('p').eq(3).html()).to.equal('comment four', msg + ' : comment content');
      expect(view.$('span').length).to.equal(8, msg + ' : author length');

      comments2.add(new Thorax.Model({comment: 'comment five'}));
      expect(view.$('p').eq(4).html()).to.equal('comment five', msg + ' : added comment content');

      blogModel.attributes.posts.add(new Thorax.Model({
        title: 'title three'
      }));
      expect(view.$('h2').length).to.equal(3, msg + ' : added title length');
      expect(view.$('h2').eq(2).html()).to.equal('title three', msg + ' : added title content');
    }

    //test with embedded view
    Thorax.View.extend({
      name: 'comments',
      template: Handlebars.compile('{{#collection comments}}<p>{{comment}}</p>{{#collection authors}}<span>{{author}}</span>{{/collection}}{{/collection}}')
    });
    var view = new Thorax.View({
      postsContext: function(model) {
        return _.extend({}, model.attributes, {
          comments: new Thorax.Views['comments']({
            comments: model.get('comments')
          })
        });
      },
      template: Handlebars.compile('{{#empty posts}}empty{{else}}{{#collection posts name="outer" item-context="postsContext"}}<h2>{{title}}</h2>{{view comments}}{{/collection}}{{/empty}}')
    });
    testNesting(view, 'nested view');

    //test with multiple inline nesting
    view = new Thorax.View({
      template: Handlebars.compile('{{#empty posts}}empty{{else}}{{#collection posts name="outer"}}<h2>{{title}}</h2>{{#collection comments}}<p>{{comment}}</p>{{#collection authors}}<span>{{author}}</span>{{/collection}}{{/collection}}{{/collection}}{{/empty}}')
    });
    testNesting(view, 'nested inline');
  });

  describe('delgation', function() {
    var view,
        spy;
    beforeEach(function() {
      spy = this.spy();
      view = new Thorax.View({
        template: Handlebars.compile('{{#collection}}<span>{{test}}</span>{{/collection}}'),
        _modifyDataObjectOptions: function(dataObject, options) {
          options.render = true;
          return options;
        }
      });
    });

    it('should delegate to #itemContext', function() {
      view.itemContext = this.spy(function() {
        return {
          test: 'testing'
        };
      });
      view.setCollection(new Thorax.Collection([{id: 1}]));

      expect(view.itemContext.calledOnce).to.be(true);
      expect(view.itemContext.calledOn(view)).to.be(true);
      expect(view.$('span').length).to.equal(1);
      expect(view.$('span').eq(0).html()).to.equal('testing');
    });

    it('should delegate to #itemFilter', function() {
      view.itemFilter = this.spy(function() {
        return false;
      });
      view.setCollection(new Thorax.Collection([{id: 1}]));

      expect(view.itemFilter.calledOnce).to.be(true);
      expect(view.itemFilter.calledOn(view)).to.be(true);
      expect(view.$('span').length).to.equal(1);
      expect(view.$('span').css('display')).to.equal('none');
    });

    it('should forward rendered:item', function() {
      view.on('rendered:item', spy);
      view.setCollection(new Thorax.Collection([{id: 1}]));

      expect(spy.calledOnce).to.be(true);
      expect(spy.calledOn(view)).to.be(true);
      expect(spy.calledWith(_.values(view.children)[0], view.collection, view.collection.models[0])).to.be(true);
    });
    it('should delegate to #renderItem', function() {
      view.renderItem = spy;
      view.setCollection(new Thorax.Collection([{id: 1}]));

      expect(view.renderItem.calledOnce).to.be(true);
      expect(view.renderItem.calledOn(view)).to.be(true);
      expect(view.renderItem.calledWith(view.collection.models[0])).to.be(true);
    });
    it('should delegate to #renderItem with a named parent and no inline template', function() {
      view.name = 'foo';
      view.template = Handlebars.compile('{{collection}}');

      view.renderItem = spy;
      view.setCollection(new Thorax.Collection([{id: 1}]));

      expect(view.renderItem.calledOnce).to.be(true);
      expect(view.renderItem.calledOn(view)).to.be(true);
      expect(view.renderItem.calledWith(view.collection.models[0])).to.be(true);
    });
    it('should delegate to #renderEmpty with a named parent and no inline template', function() {
      view.name = 'foo';
      view.template = Handlebars.compile('{{collection}}');

      view.renderItem = function() {};
      view.renderEmpty = spy;
      view.setCollection(new Thorax.Collection([]));

      expect(view.renderEmpty.calledOnce).to.be(true);
      expect(view.renderEmpty.calledOn(view)).to.be(true);
    });
    it('should not release views rendered with renderItem on change', function() {
      var child = new (Thorax.View.extend({
        release: function() { throw new Error('Release'); },

        template: function() { return '<div>foo</div>'; }
      }))();
      child.ensureRendered();

      view.renderItem = this.spy(function() {
        return child;
      });

      view.setCollection(new Thorax.Collection([{id: 1}]));
      view.collection.at(0).set('foo', 'bar');

      expect(view.renderItem.calledOnce).to.be(true);
    });

    it('should forward rendered:empty', function() {
      view.on('rendered:empty', spy);
      view.setCollection(new Thorax.Collection([]));

      expect(spy.calledOnce).to.be(true);
      expect(spy.calledOn(view)).to.be(true);
    });
    it('should delegate to #renderEmpty', function() {
      view.renderEmpty = spy;
      view.setCollection(new Thorax.Collection([]));

      expect(view.renderEmpty.calledOnce).to.be(true);
      expect(view.renderEmpty.calledOn(view)).to.be(true);
    });
  });
});
