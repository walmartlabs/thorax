$(function() {

  QUnit.module('Thorax Model Binding');

  test("model view binding", function() {
    var modelA = new Thorax.Model({letter: 'a'});
    var modelB = new Thorax.Model({letter: 'b'});
    var modelC = new Thorax.Model({letter: 'c'});
    
    var a = new Thorax.View({
      template: '<li>{{letter}}</li>',
      model: modelA
    });
    equal(a.el.firstChild.innerHTML, 'a', 'set via constructor');

    var b = new Thorax.View({
      template: '<li>{{letter}}</li>'
    });
    b.setModel(modelB);
    equal(b.el.firstChild.innerHTML, 'b', 'set via setModel');

    modelB.set({letter: 'B'});
    equal(b.el.firstChild.innerHTML, 'B', 'update attribute triggers render');
    modelB.set({letter: 'b'});
    
    var c = new Thorax.View({
      template: '<li>{{letter}}</li>'
    });
    c.setModel(modelC, {
      render: false
    });
    ok(!c.el.firstChild, 'did not render');
    c.render();
    equal(c.el.firstChild.innerHTML, 'c', 'manual render');
  });

  test("isPopulated", function() {
    ok(!(new Thorax.Model()).isPopulated());
    ok((new Thorax.Model({key: 'value'})).isPopulated());
  });

  test("$.fn.model", function() {
    var model = new Thorax.Model({
      key: 'value'
    });
    var view = new Thorax.View({
      model: model,
      template: '{{key}}'
    });
    view.render();
    equal(view.html(), 'value');
    equal(view.$el.model(), model);
  });
});
