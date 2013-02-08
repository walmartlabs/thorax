describe('form', function() {
  it("serialize() / populate()", function() {
    var FormView = Thorax.View.extend({
      name: 'form',
      template: function() {
        return '<form><input name="one"/><select name="two"><option value="a">a</option><option value="b">b</option></select><input name="three[four]"/><input name="five" value="A" type="checkbox" /><input name="five" value="B" type="checkbox" checked /><input name="five" value="C" type="checkbox" checked /><input name="six" value="LOL" type="checkbox" checked /></form>';
      }
    });

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
    var errorCallbackCallCount = 0;
    view.on('error', function() {
      ++errorCallbackCallCount;
    });
    expect(view.serialize()).to.be.undefined;
    expect(errorCallbackCallCount).to.equal(1, "error event triggered when validateInput returned errors");
  });

  it("nested serialize / populate", function() {
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
});
