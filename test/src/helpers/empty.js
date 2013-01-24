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
  it('should render when model is added', function() {
    var emptyModelView = new Thorax.View({
      template: '{{#empty}}empty{{else}}not empty{{/empty}}'
    });
    emptyModelView.render();
    expect(emptyModelView.$('[data-view-helper]').html()).to.equal('empty');
    emptyModelView.setModel(new Thorax.Model({foo: 'value'}));
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
});
