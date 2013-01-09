describe("context", function() {
  it("should expose key in template", function() {
    var view = new (Thorax.View.extend({
      template: '{{key}}'
    }))({key: 'value'});
    view.render();
    expect(view.html()).to.equal('value');
  });

  it("should re-render view when render option is true", function() {
    var view = new (Thorax.View.extend({
      template: '{{key}}'
    }));
    view.render();
    expect(view.html()).to.equal('');
    view.set({key: 'value'});
    expect(view.html()).to.equal('');
    view.render();
    expect(view.html()).to.equal('value');
    view.set({key: 'value2'}, {render: true});
    expect(view.html()).to.equal('value2');
    // Keep changing to ensure "render" option is not stored
    view.set('key', 'value');
    expect(view.html()).to.equal('value2');
    view.render();
    expect(view.html()).to.equal('value');
  });

  it("should trigger change attribute events on view", function() {
    var view = new (Thorax.View.extend({
      events: {
        'change:key': function() {
          this.set('lowerCaseKey', this.get('key').toLowerCase());
        }
      },
      template: '{{lowerCaseKey}}'
    }));
    view.set({key: 'VALUE'}, {render: true});
    expect(view.html()).to.equal('value');
  });

  it("should set model attributes on context", function() {
    var spy = this.spy(),
        model = new Thorax.Model({key: 'value'});
    var view = new (Thorax.View.extend({
      template: '{{key}}',
      events: {
        rendered: spy
      }
    }));
    view.set('model', model, {render: false});
    expect(spy.callCount).to.equal(0, 'render option set to false');
    expect(view.html()).to.equal('', 'render option set to false');
    view.render();
    expect(spy.callCount).to.equal(1, 'after manual render when render option is false');
    expect(view.html()).to.equal('value', 'after manual render when render option is false');

    // update key should not re-render
    model.set({key: 'value2'});
    expect(spy.callCount).to.equal(1, 'after set when render option is false');
    expect(view.html()).to.equal('value', 'after set when render option is false');

    // render option should default to true
    model.set({key: 'value'});
    spy = this.spy();
    view = new (Thorax.View.extend({
      template: '{{key}}',
      events: {
        rendered: spy
      }
    }));
    view.set('model', model);
    expect(spy.callCount).to.equal(1, 'no options passed to set model');
    expect(view.html()).to.equal('value', 'no options passed to set model');
  
    // update key should re-render
    model.set({key: 'value2'});
    expect(spy.callCount).to.equal(2, 'after set when render option is true');
    expect(view.html()).to.equal('value2', 'after set when render option is true');
  });

  it("should only render once for multiple bound models", function() {
    var spy = this.spy(),
        a = new Thorax.Model({key: 'a'}),
        b = new Thorax.Model({key: 'b'});
    var view = new (Thorax.View.extend({
      template: '{{a.key}}{{b.key}}',
      events: {
        rendered: spy
      }
    }));
    view.set({a: a, b: b}, {render: true});
    expect(view.html()).to.equal('ab');
    expect(spy.callCount).to.equal(1);
  });

  it("should accept a merge option on a model", function() {
    var spy = this.spy(),
        model = new Thorax.Model({key: 'a'}),
        b = new Thorax.Model({key: 'b'});
    var view = new (Thorax.View.extend({
      template: '{{model.key}}{{b.key}}',
      events: {
        rendered: spy
      }
    }));

    view.set('model', model, {merge: false});
    expect(spy.callCount).to.equal(1, 'model with merge: false');
    expect(view.html()).to.equal('a', 'model with merge: false');
    // merge key on non primary models should default to true
    view.set('b', b);
    expect(spy.callCount).to.equal(2, 'non primary model');
    expect(view.html()).to.equal('ab', 'non primary model');
  });
  
  it("should accept a modifyContext object", function() {
    var view = new (Thorax.View.extend({
      template: '{{a}}{{model.b}}',
      modifyContext: {
        a: function(value) {
          return value.toUpperCase();
        },
        model: function(model) {
          return {
            b: model.attributes.b.toUpperCase()
          };
        }
      }
    }));
    view.set({
      a: 'a',
      model: new Thorax.Model({
        b: 'b'
      })
    }, {
      merge: false
    });
    expect(view.html()).to.equal('AB');
  });

  /*
    it("context may be an object", function() {
    var view = new (Thorax.View.extend({
      context: {
        a: 'a',
        b: 'b',
        c: function() {
          return 'c';
        }
      },
      template: '{{a}}{{b}}{{c}}'
    }))();
    view.render();
    expect(view.html()).to.equal('abc');
  });
  */

  it("deffered load on model will render when loaded", function() {
    var server = sinon.fakeServer.create();
    var spy = this.spy();
    var View = Thorax.View.extend({
      events: {
        rendered: spy
      },
      template: '{{model.key}}{{key}}'
    });

    var view = new View(),
        model = new (Thorax.Model.extend({
          urlRoot: '/test'
        }));
    view.set({model: model, key: 'value'}, {merge: false});
    expect(spy.callCount).to.equal(0);
    server.requests[0].respond(
      200,
      { "Content-Type": "application/json" },
      JSON.stringify({ key: 'value' })
    );
    expect(spy.callCount).to.equal(1);
    expect(view.html()).to.equal('valuevalue');

    spy.callCount = 0;
    view = new View();
    model = new (Thorax.Model.extend({
      urlRoot: '/test'
    }));
    view.set({model: model, key: 'value'}, {merge: false, render: true});
    expect(spy.callCount).to.equal(1);
    server.requests[1].respond(
      200,
      { "Content-Type": "application/json" },
      JSON.stringify({ key: 'value' })
    );
    expect(spy.callCount).to.equal(2);
    expect(view.html()).to.equal('valuevalue');
    server.restore();
  });
});