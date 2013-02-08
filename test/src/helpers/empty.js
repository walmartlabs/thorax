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
      template: Handlebars.compile('{{#empty}}empty{{else}}not empty{{/empty}}')
    });
    emptyView.render();
    expect(emptyView.html()).to.equal('empty');
  });
  it('should render empty with an empty model', function() {
    var emptyModelView = new Thorax.View({
      template: Handlebars.compile('{{#empty}}empty{{else}}not empty{{/empty}}'),
      model: new Thorax.Model()
    });
    emptyModelView.render();
    expect(emptyModelView.html()).to.equal('empty');
    emptyModelView.model.set({foo: 'value'});
    expect(emptyModelView.html()).to.equal('not empty');
  });
  it('should render when model is added', function() {
    var emptyModelView = new Thorax.View({
      template: Handlebars.compile('{{#empty}}empty{{else}}not empty{{/empty}}')
    });
    emptyModelView.render();
    expect(emptyModelView.html()).to.equal('empty');
    emptyModelView.setModel(new Thorax.Model({foo: 'value'}));
    expect(emptyModelView.html()).to.equal('not empty');
  });
  it('should render empty with collection parameter', function() {
    var emptyCollectionView = new Thorax.View({
      template: Handlebars.compile('{{#empty myCollection}}empty{{else}}not empty{{/empty}}'),
      myCollection: new Thorax.Collection()
    });
    emptyCollectionView.render();
    expect(emptyCollectionView.html()).to.equal('empty');
    var model = new Thorax.Model();
    emptyCollectionView.myCollection.add(model);
    expect(emptyCollectionView.html()).to.equal('not empty');
    emptyCollectionView.myCollection.remove(model);
    expect(emptyCollectionView.html()).to.equal('empty');
  });

  it('empty and collection helpers in the same template', function() {
    var a = new Thorax.View({
      template: Handlebars.compile('{{#empty letters}}<div class="empty">empty</div>{{/empty}}{{#collection letters}}{{letter}}{{/collection}}'),
      letters: new Thorax.Collection()
    });
    a.render();
    expect(a.$('.empty').html()).to.equal('empty');
    a.letters.reset(_.clone(letterCollection.models));
    expect(a.$('.empty').length).to.equal(0);
    expect(a.$('[data-collection-cid] div')[0].innerHTML).to.equal('a');
    var b = new Thorax.View({
      template: Handlebars.compile('{{#empty letters}}<div class="empty">empty a</div>{{/empty}}{{#collection letters}}{{letter}}{{else}}empty b{{/collection}}'),
      letters: new Thorax.Collection()
    });
    b.render();
    expect(b.$('.empty').html()).to.equal('empty a');
    expect(b.$('[data-collection-cid] div')[0].innerHTML).to.equal('empty b');
    b.letters.reset(letterCollection.models);
    expect(b.$('.empty').length).to.equal(0);
    expect(b.$('[data-collection-cid] div')[0].innerHTML).to.equal('a');
  });

  it("multiple empty helpers binding the same object will not cause multiple renders", function() {
    var spy = this.spy();
    var view = new Thorax.View({
      events: {
        rendered: spy
      },
      template: Handlebars.compile("{{#empty collection}}{{/empty}}{{#empty collection}}{{/empty}}"),
      collection: new Thorax.Collection()
    });
    view.ensureRendered();
    expect(spy.callCount).to.equal(1);
    view.collection.add({key: 'value'});
    expect(spy.callCount).to.equal(2);
  });
});
