describe('form', function() {
  var FormView = Thorax.View.extend({
    name: 'form',
    template: function() {
      return '<form>'
          + '<input name="one"/>'
          + '<select name="two"><option value="a">a</option><option value="b">b</option></select>'
          + '<input name="three[four]">'
          + '<input name="five" value="A" type="checkbox">'
          + '<input name="five" value="B" type="checkbox" checked>'
          + '<input name="five" value="C" type="checkbox" checked>'
          + '<input name="six" value="LOL" type="checkbox" checked>'
        + '</form>';
    }
  });

  it('serialize() / populate()', function() {
    var model = new Thorax.Model({
      one: 'a',
      two: 'b',
      three: {
        four: 'c'
      }
    });

    var view = new FormView();
    view.render();
    var attributes = view.serialize();
    expect(attributes.one).to.equal('', 'serialize empty attributes');
    expect(attributes.five).to.eql(['B', 'C'], 'serialize empty attributes');
    expect(attributes.six).to.equal('LOL', 'serialize empty attributes');
    view.setModel(model);
    attributes = view.serialize();

    expect(attributes.one).to.equal('a', 'serialize attributes from model');
    expect(attributes.two).to.equal('b', 'serialize attributes from model');
    expect(attributes.three.four).to.equal('c', 'serialize attributes from model');

    view.populate({
      one: 'aa',
      two: 'b',
      three: {
        four: 'cc'
      }
    });

    attributes = view.serialize();
    expect(attributes.one).to.equal('aa', 'serialize attributes from populate()');
    expect(attributes.two).to.equal('b', 'serialize attributes from populate()');
    expect(attributes.three.four).to.equal('cc', 'serialize attributes from populate()');

    view.validateInput = function() {
      return ['error'];
    };
    var invalidCallbackCallCount = 0;
    view.on('invalid', function() {
      ++invalidCallbackCallCount;
    });
    expect(view.serialize()).to.be(undefined);
    expect(invalidCallbackCallCount).to.equal(1, 'invalid event triggered when validateInput returned errors');
  });

  it('nested serialize / populate', function() {
    //the test has a child view and a mock helper view fragment
    //the child view should act as a child view, the view fragment
    //should act as a part of the parent view
    var mockViewHelperFragment = '<div data-view-cid="mock" data-view-helper="mock"><input name="childKey"></div>';
    var view = new Thorax.View({
      child: new Thorax.View({
        template: Handlebars.compile('<input name="childKey">')
      }),
      template: Handlebars.compile('<input name="parentKey">{{view child}}' + mockViewHelperFragment)
    });
    view.render();
    var model = new Thorax.Model({
      parentKey: 'parentValue',
      childKey: 'childValue'
    });
    view.setModel(model);
    expect(view.$('input[name="parentKey"]').val()).to.equal('parentValue');
    expect(view.$('input[name="childKey"]').val()).to.equal('childValue');

    view.populate({
      parentKey: '',
      childKey: ''
    });
    expect(view.$('input[name="parentKey"]').val()).to.equal('');
    expect(view.$('input[name="childKey"]').val()).to.equal('');

    view.setModel(false);
    view.setModel(model, {
      populate: {
        children: false
      }
    });
    expect(view.$('input[name="parentKey"]')[0].value).to.equal('parentValue');
    expect(view.$('input[name="childKey"]')[1].value).to.equal('childValue');
    expect(view.$('input[name="childKey"]')[0].value).to.equal('');

    view.populate({
      parentKey: '',
      childKey: ''
    });
    view.populate(model.attributes, {
      children: false
    });
    expect(view.$('input[name="parentKey"]')[0].value).to.equal('parentValue');
    expect(view.$('input[name="childKey"]')[1].value).to.equal('childValue');
    expect(view.$('input[name="childKey"]')[0].value).to.equal('');

    view.$('input[name="childKey"]')[0].value = 'childValue';

    //multuple childKey inputs should be serialized so there should be an array
    expect(view.serialize({
      children: true
    }).childKey[0]).to.equal('childValue');

    view.$('input[name="childKey"]')[0].value = '';

    //no children so only one childKey
    expect(view.serialize({
      children: false
    }).childKey).to.equal('childValue');
  });

  it('should populate on initial render', function() {
    var attributes = {
      one: 'a',
      two: 'b',
      three: {
        four: 'c'
      }
    };
    var model = new Thorax.Model(attributes);

    var view = new FormView();
    view.setModel(model);
    expect(view._renderCount).to.equal(0);
    expect(view._populateCount).to.equal(0);
    expect(view.serialize()).to.eql({});

    view.render();
    expect(_.pick(view.serialize(), _.keys(attributes))).to.eql(attributes);
  });

  it('keep state on rerender', function() {
    var FormView = Thorax.View.extend({
      name: 'form',
      template: function() {
        return '<form><input name="test"><input name="nested[test]"><input name="merge"></form>';
      }
    });

    var model = new Thorax.Model({
      test: 'fail',
      nested: {
        test: 'fail'
      }
    });

    var view = new FormView();

    var populateSpy = this.spy(),
        serializeSpy = this.spy();

    // Set spies to make sure the event aren't firing
    view.on('populate', populateSpy);
    view.on('serialize', serializeSpy);

    view.render();
    view.setModel(model); // Triggers first data population

    // Expect the populate event to have fired once
    expect(populateSpy.callCount).to.equal(1);
    expect(serializeSpy.callCount).to.equal(0);

    model.set('merge', 'test-merge'); // Set model data in between to test the merge
    expect(populateSpy.callCount).to.equal(2);

    view.$('input[name="test"]').val('test');
    view.$('input[name="nested[test]"]').val('test-nested');
    view.render(); // Should trigger another data population with user data

    // Expect the user input to persist
    expect(view.$('input[name="merge"]')[0].value).to.equal('test-merge');
    expect(view.$('input[name="test"]')[0].value).to.equal('test');
    expect(view.$('input[name="nested[test]"]')[0].value).to.equal('test-nested');

    // Expect the events to not have fired
    expect(populateSpy.callCount).to.equal(2);
    expect(serializeSpy.callCount).to.equal(0);
  });

  it('discard previous state on model change', function() {
    var FormView = Thorax.View.extend({
      name: 'form',
      template: function() {
        return '<form><input name="test"><input name="nested[test]"><input name="merge"></form>';
      }
    });

    var model = new Thorax.Model({
      merge: 'test-merge',
      test: 'fail',
      nested: {
        test: 'fail'
      }
    });

    var view = new FormView();
    view.render();
    view.setModel(model); // Triggers first data population

    model.set('merge', 'test-merge'); // Set model data in between to test the merge
    view.$('input[name="test"]').val('test');
    view.$('input[name="nested[test]"]').val('test-nested');
    view.render();

    model = new Thorax.Model({
      test: 'win',
      nested: {
        test: 'win'
      }
    });
    view.setModel(model); // Should trigger another data population with user data

    // Expect the user input to persist
    expect(view.$('input[name="merge"]')[0].value).to.equal('');
    expect(view.$('input[name="test"]')[0].value).to.equal('win');
    expect(view.$('input[name="nested[test]"]')[0].value).to.equal('win');
  });

  it('should not populate missing fields', function() {
    var FormView = Thorax.View.extend({
      name: 'form',
      template: function() {
        return '<form><input name="test"><input name="nested[test]"><input name="merge"></form>';
      }
    });

    var model = new Thorax.Model({});

    var view = new FormView();
    view.setModel(model);
    view.render();

    // Expect the user input to persist
    expect(view.$('input[name="nested[test]"]')[0].value).to.equal('');
  });

  it('works when calling render before binding the model', function() {
    var FormView = Thorax.View.extend({
      name: 'form',
      template: function() {
        return '<form><input name="test"></form>';
      },

      initialize: function() {
        this.render();
      }
    });
    var view = new FormView({model: new Thorax.Model({test: 'test'})});
    expect(view.$('input[name="test"]')[0].value).to.equal('test');
  });

  it('should populate on model change', function() {
    var view = new FormView(),
        model = new Thorax.Model();

    view.setModel(model);
    view.render();
    expect(view.$('input[name="one"]')[0].value).to.equal('');

    model.set('one', 'foo');
    expect(view.$('input[name="one"]')[0].value).to.equal('foo');
  });

  it('should serialize checkboxes without values', function() {
    var view = new FormView({
      template: function() {
        return '<input type="checkbox" name="foo">';
      }
    });

    var model = new Thorax.Model({});
    view.setModel(model);
    view.render();

    expect(view.serialize()).to.eql({});

    model.set('foo', true);
    expect(view.serialize()).to.eql({foo: true});

    view.render();
    expect(view.serialize()).to.eql({foo: true});
  });
});
