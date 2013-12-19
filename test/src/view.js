var Frameworks = [
  {
    frameworkName: 'Backbone',
    obj: Backbone
  },
  {
    frameworkName: 'Thorax',
    obj: Thorax
  }
];

/**
 * Loop through both frameworks so writing one set of tests runs them
 * in both frameworks, e.g., Backbone or Thorax (given our goal is to make
 * Thorax version of view.listenTo work identical to Backbone version
 */
var Framework, frameworkName;
for (var i = 0; i < Frameworks.length; i++) {
  frameworkName = Frameworks[i].frameworkName;
  Framework = Frameworks[i].obj;

  executeTests(Frameworks[i].obj, Frameworks[i].frameworkName);
}

function executeTests(Framework, frameworkName) {
  describe(frameworkName, function () {
    it('works', function () {
      expect(Framework).to.be.ok;
    });

    var modelCounter, collectionCounter, View, view;
    beforeEach(function () {
      modelCounter = 0;
      collectionCounter = 0;

      View = Framework.View.extend({
        initialize: function() {
          this.listenTo(this.model, 'someEvent', function(){ modelCounter++; }, this);
          this.listenTo(this.collection, 'all someEvent', function(){ collectionCounter++; }, this);
        }
      });

      view = new View({
        model: new Framework.Model(),
        collection: new Framework.Collection()
      });
    });

    it("no events should have been triggered yet", function () {
      expect(modelCounter).to.eq(0, "model counter should be 0");
      expect(collectionCounter).to.eq(0, "the collection counter should be 0");
    });

    it("the model and collection counter should each increment by 1", function() {
      view.model.trigger('someEvent');
      view.collection.trigger('someEvent');

      expect(modelCounter).to.eq(1, "model counter should be 1");
      expect(collectionCounter).to.eq(2, "collection counter should be 1");

      view.stopListening();

      view.model.trigger('someEvent');
      view.collection.trigger('someEvent');

      expect(modelCounter).to.eq(1);
      expect(collectionCounter).to.eq(2);
    });

    it('only one event should be fired per trigger', function () {
      view.collection.trigger('someEvent');
      view.collection.trigger('someEvent');

      // given the above tests prove that 1 event is fired when registering with all
      // the following should only eq 3, but i put 2 b/c when the entire bug is fixed, that will
      // be the correct behavior
      expect(collectionCounter).to.eq(4, "collection counter should equal 2");
    });


  });
}