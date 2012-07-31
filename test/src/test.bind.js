$(function(){
  QUnit.module('Thorax bind');

  test("bind helper", function() {
    var callCount = 0;
    var view = new Thorax.View({
      i: 0,
      template: '<ul>{{bind "counter" tag="li"}}{{bind "counter" tagName="li"}}</ul>',
      counter: function(i) {
        ++callCount;
        if (arguments.length > 0) {
          this.i = i;
        }
        return this.i;
      }
    });
    view.render();
    equal(view.$('li')[0].innerHTML, '0');
    equal(view.$('li')[1].innerHTML, '0');
    equal(callCount, 2);
    view.counter(1);
    equal(view.$('li')[0].innerHTML, '1');
    equal(view.$('li')[1].innerHTML, '1');
    equal(callCount, 3);
    view.counter(undefined);
    equal(view.$('li')[0].innerHTML, '');
    equal(view.$('li')[1].innerHTML, '');

    //with block
    var view = new Thorax.View({
      i: 1,
      template: '{{#bind "obj" class="test"}}{{key}}{{/bind}}{{#bind "obj" tag="p"}}<span>{{key}}</span>{{/bind}}',
      obj: function(obj) {
        if (arguments.length === 1) {
          this._obj = obj;
        }
        return this._obj;
      }
    });

    view.render();
    equal(view.$('.test').html(), '');
    equal(view.$('p span').html(), null);
    view.obj({key: 'value'});
    equal(view.$('.test').html(), 'value');
    equal(view.$('p span').html(), 'value');

    var view = new Thorax.View({
      template: '<div>{{bind "key" tag="span"}}</div>'
    });
    var model = new Backbone.Model({
      key: 'value'
    });
    view.setModel(model, {
      render: false,
      watch: ['key']
    });
    view.render();
    equal(view.$('div span').html(), 'value');
    model.set({anotherKey: 'value'});
    model.set({key: ''});
    equal(view.$('div span').html(), '');
    //will only update the generated span
    model.set({key: 'new value'});
    equal(view.$('div span').html(), 'new value');
  });

  test("bindAttr helper", function() {
    var view = new Thorax.View({
      template: '<input class="test" {{bindAttr data-one="one" data-two="two" disabled="disabled"}}></div>',
      _one: 'one',
      one: function(value) {
        if (arguments.length > 0) {
          this._one = value;
        }
        return this._one;
      },
      _two: 'two',
      two: function(value) {
        if (arguments.length > 0) {
          this._two = value;
        }
        return this._two;
      },
      _disabled: true,
      disabled: function(disabled) {
        if (arguments.length > 0) {
          this._disabled = disabled;
        }
        return this._disabled;
      }
    });
    view.render();
    //use straight dom to avoid zepto / jquery differences
    var el = view.$('input')[0];
    equal(el.getAttribute('data-one'), 'one');
    equal(el.getAttribute('data-two'), 'two');
    equal(el.getAttribute('disabled'), 'true');
    view.one('three');
    equal(el.getAttribute('data-one'), 'three');
    equal(el.getAttribute('data-two'), 'two');
    view.disabled(false);
    equal(el.getAttribute('disabled'), null);

    //with model
    var model = new Thorax.Model({
      value: 'value',
      booleanKey: false
    });
    var view = new Thorax.View({
      template: '<input type="text" {{bindAttr value="value" disabled="booleanKey"}}>'
    });
    view.setModel(model, {
      render: false,
      watch: ['value', 'booleanKey']
    });
    view.render();
    //use straight dom to avoid zepto / jquery differences
    var el = view.$('input')[0];
    equal(el.getAttribute('value'), 'value');
    equal(el.getAttribute('disabled'), null);
    console.log(view.html());
    model.set({
      value: 'newValue'
    });
    equal(el.getAttribute('value'), 'newValue');
    equal(el.getAttribute('disabled'), null);
    model.set({
      booleanKey: true
    });
    equal(el.getAttribute('value'), 'newValue');
    equal(el.getAttribute('disabled'), 'true');
  });

});