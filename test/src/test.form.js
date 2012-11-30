$(function() {
  QUnit.module('Thorax Form');

  test("serialize() / populate()", function() {
    var FormView = Thorax.View.extend({
      name: 'form',
      template: Handlebars.compile('<form><input name="one"/><select name="two"><option value="a">a</option><option value="b">b</option></select><input name="three[four]"/><input name="five" value="A" type="checkbox" /><input name="five" value="B" type="checkbox" checked /><input name="five" value="C" type="checkbox" checked /><input name="six" value="LOL" type="checkbox" checked /></form>')
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
    equal(attributes.one, "", 'serialize empty attributes');
    deepEqual(attributes.five, ['B', 'C'], 'serialize empty attributes');
    equal(attributes.six, 'LOL', 'serialize empty attributes');
    view.setModel(model);
    attributes = view.serialize();

    equal(attributes.one, 'a', 'serialize attributes from model');
    equal(attributes.two, 'b', 'serialize attributes from model');
    equal(attributes.three.four, 'c', 'serialize attributes from model');
  
    view.populate({
      one: 'aa',
      two: 'b',
      three: {
        four: 'cc'
      }
    });

    attributes = view.serialize();
    equal(attributes.one, 'aa', 'serialize attributes from populate()');
    equal(attributes.two, 'b', 'serialize attributes from populate()');
    equal(attributes.three.four, 'cc', 'serialize attributes from populate()');
  
    view.validateInput = function() {
      return ['error'];
    };
    var errorCallbackCallCount = 0;
    view.on('error', function() {
      ++errorCallbackCallCount;
    });
    ok(!view.serialize());
    equal(errorCallbackCallCount, 1, "error event triggered when validateInput returned errors");
  });

  test("nested serialize / populate", function() {
    //the test has a child view and a mock helper view fragment
    //the child view should act as a child view, the view fragment
    //should act as a part of the parent view
    var mockViewHelperFragment = '<div data-view-cid="mock" data-view-helper="mock"><input name="childKey"></div>';
    var view = new Thorax.View({
      child: new Thorax.View({
        template: '<input name="childKey">'
      }),
      template: '<input name="parentKey">{{view child}}' + mockViewHelperFragment
    });
    view.render();
    var model = new Backbone.Model({
      parentKey: 'parentValue',
      childKey: 'childValue'
    });
    view.setModel(model);
    equal(view.$('input[name="parentKey"]').val(), 'parentValue');
    equal(view.$('input[name="childKey"]').val(), 'childValue');

    view.populate({
      parentKey: '',
      childKey: ''
    });
    equal(view.$('input[name="parentKey"]').val(), '');
    equal(view.$('input[name="childKey"]').val(), '');

    view.setModel(false);
    view.setModel(model, {
      populate: {
        children: false
      }
    });
    equal(view.$('input[name="parentKey"]')[0].value, 'parentValue');
    equal(view.$('input[name="childKey"]')[1].value, 'childValue');
    equal(view.$('input[name="childKey"]')[0].value, '');

    view.populate({
      parentKey: '',
      childKey: ''
    });
    view.populate(model.attributes, {
      children: false
    });
    equal(view.$('input[name="parentKey"]')[0].value, 'parentValue');
    equal(view.$('input[name="childKey"]')[1].value, 'childValue');
    equal(view.$('input[name="childKey"]')[0].value, '');

    view.$('input[name="childKey"]')[0].value = 'childValue';

    //multuple childKey inputs should be serialized so there should be an array
    equal(view.serialize({
      children: true
    }).childKey[0], 'childValue');

    view.$('input[name="childKey"]')[0].value = '';

    //no children so only one childKey
    equal(view.serialize({
      children: false
    }).childKey, 'childValue');


  });

});