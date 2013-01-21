describe('empty helper', function() {
  var letterCollection;

  beforeEach(function() {
    letterCollection = new (Thorax.Collection.extend({
      model: Thorax.Model.extend({})
    }))(['a', 'b', 'c', 'd'].map(function(letter) {
      return {letter: letter};
    }));
  });

  it('should render empty without any inputs', function() {
    var emptyView = new Thorax.View({
      template: '{{#empty}}empty{{else}}not empty{{/empty}}'
    });
    emptyView.render();
    expect(emptyView.$('[data-view-helper]').html()).to.equal('empty');
  });
  it('should render empty with an empty model', function() {
    var emptyModelView = new Thorax.View({
      template: '{{#empty}}empty{{else}}not empty{{/empty}}',
      model: new Thorax.Model()
    });
    emptyModelView.render();
    expect(emptyModelView.$('[data-view-helper]').html()).to.equal('empty');
    emptyModelView.model.set({foo: 'value'});
    expect(emptyModelView.$('[data-view-helper]').html()).to.equal('not empty');
  });
  it('should render empty with collection parameter', function() {
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

  it('empty and collection helpers in the same template', function() {
    var a = new Thorax.View({
      template: '{{#empty letters}}<div class="empty">empty</div>{{/empty}}{{#collection letters}}{{letter}}{{/collection}}',
      letters: new Thorax.Collection()
    });
    a.render();
    var oldRenderCount = a._renderCount;
    expect(a.$('.empty').html()).to.equal('empty');
    a.letters.reset(letterCollection.models);
    expect(a.$('.empty').length).to.equal(0);
    expect(a.$('[data-collection-cid] div')[0].innerHTML).to.equal('a');
    expect(oldRenderCount).to.equal(a._renderCount, 'render count unchanged on collection reset');

    var b = new Thorax.View({
      template: '{{#empty letters}}<div class="empty">empty a</div>{{/empty}}{{#collection letters}}{{letter}}{{else}}empty b{{/collection}}',
      letters: new Thorax.Collection()
    });
    b.render();
    expect(b.$('.empty').html()).to.equal('empty a');
    expect(b.$('[data-collection-cid] div')[0].innerHTML).to.equal('empty b');
    b.letters.reset(letterCollection.models);
    expect(b.$('.empty').length).to.equal(0);
    expect(b.$('[data-collection-cid] div')[0].innerHTML).to.equal('a');
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
});
