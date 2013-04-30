describe('collection helper', function() {
  it('should have access to handlebars noop', function() {
    // Explicit verification that Handlebars is exposing this field.
    expect(Handlebars.VM.noop).to.exist;
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

  it("collection-element declared outside of CollectionView will raise", function() {
    var view = new Thorax.View({
      template: Handlebars.compile('{{collection-element}}')
    });
    expect(view.render).to['throw']();
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
      view.setModel(blogModel);
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
      template: Handlebars.compile('{{#collection comments}}<p>{{comment}}</p>{{#collection authors}}<span>{{author}}</span>{{/collection}}{{/collection}}')
    });
    var view = new Thorax.View({
      template: Handlebars.compile('{{#empty posts}}empty{{else}}{{#collection posts name="outer"}}<h2>{{title}}</h2>{{view "comments" comments=comments}}</div>{{/collection}}{{/empty}}')
    });
    testNesting(view, 'nested view');

    //test with multiple inline nesting
    view = new Thorax.View({
      template: Handlebars.compile('{{#empty posts}}empty{{else}}{{#collection posts name="outer"}}<h2>{{title}}</h2>{{#collection comments}}<p>{{comment}}</p>{{#collection authors}}<span>{{author}}</span>{{/collection}}{{/collection}}</div>{{/collection}}{{/empty}}')
    });
    testNesting(view, 'nested inline');
  });

  describe('delgation', function() {
    var view,
        spy;
    beforeEach(function() {
      spy = this.spy();
      view = new Thorax.View({
        template: Handlebars.compile('{{#collection}}<span>{{test}}</span>{{/collection}}')
      });
    });

    it('should delegate to #itemContext', function() {
      view.itemContext = this.spy(function() {
        return {
          test: 'testing'
        };
      });
      view.setCollection(new Thorax.Collection([{id: 1}]));

      expect(view.itemContext)
          .to.have.been.calledOnce
          .to.have.been.calledOn(view);
      expect(view.$('span').length).to.equal(1);
      expect(view.$('span')[0].innerHTML).to.equal('testing');
    });

    it('should delegate to #itemFilter', function() {
      view.itemFilter = this.spy(function() {
        return false;
      });
      view.setCollection(new Thorax.Collection([{id: 1}]));

      expect(view.itemFilter)
          .to.have.been.calledOnce
          .to.have.been.calledOn(view);
      expect(view.$('span').length).to.equal(1);
      expect(view.$('span')[0].style.display).to.equal('none');
    });

    it('should forward rendered:item', function() {
      view.on('rendered:item', spy);
      view.setCollection(new Thorax.Collection([{id: 1}]));

      expect(spy)
          .to.have.been.calledOnce
          .to.have.been.calledOn(view)
          .to.have.been.calledWith(_.values(view.children)[0], view.collection, view.collection.models[0]);
    });
    it('should delegate to #renderItem', function() {
      view.renderItem = spy;
      view.setCollection(new Thorax.Collection([{id: 1}]));

      expect(view.renderItem)
          .to.have.been.calledOnce
          .to.have.been.calledOn(view)
          .to.have.been.calledWith(view.collection.models[0]);
    });
    it('should not destroy views rendered with renderItem on change', function() {
      var child = new (Thorax.View.extend({
        destroy: function() { throw new Error('Destroy'); },

        template: function() { return '<div>foo</div>'; }
      }));
      child.ensureRendered();

      view.renderItem = this.spy(function() {
        return child;
      });

      view.setCollection(new Thorax.Collection([{id: 1}]));
      view.collection.at(0).set('foo', 'bar');

      expect(view.renderItem).to.have.been.calledOnce;
    });

    it('should forward rendered:empty', function() {
      view.on('rendered:empty', spy);
      view.setCollection(new Thorax.Collection([]));

      expect(spy)
          .to.have.been.calledOnce
          .to.have.been.calledOn(view);
    });
    it('should delegate to #renderEmpty', function() {
      view.renderEmpty = spy;
      view.setCollection(new Thorax.Collection([]));

      expect(view.renderEmpty)
          .to.have.been.calledOnce
          .to.have.been.calledOn(view);
    });
  });
});
