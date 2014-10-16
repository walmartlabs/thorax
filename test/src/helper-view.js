describe('helper-view', function() {
  var spy,
      view;
  beforeEach(function() {
    spy = this.spy(function(viewHelper) {
      //expect(view.cid).to.equal(viewHelper.parent.cid);
      return viewHelper;
    });
    Handlebars.registerViewHelper('test', spy);
  });
  afterEach(function() {
    delete Handlebars.helpers.test;
  });

  it('should handle deferred rendering', function(done) {
    this.clock.restore();

    view = new Thorax.View({
      name: 'outer',
      template: Handlebars.compile('{{#test}}{{#test}}{{#test}}{{key}}{{/test}}{{/test}}{{/test}}'),
      key: 'value'
    });
    view.on('append', function(scope, callback, deferred) {
      deferred.exec(function() {
        expect(_.values(view.children)[0]._renderCount).to.equal(0);
      });
    });
    view.render(undefined, function() {
      expect(view.$('[data-view-helper]').eq(2).html()).to.equal('value');
      done();
    });
  });

  it('should nest helper view instances', function() {
    view = new Thorax.View({
      name: 'outer',
      template: Handlebars.compile('{{#test}}{{#test}}{{#test}}{{key}}{{/test}}{{/test}}{{/test}}'),
      key: 'value'
    });
    view.render();
    expect(view.$('[data-view-helper]').eq(2).html()).to.equal('value');
  });
  it('should allow an empty template', function() {
    view = new Thorax.View({
      template: Handlebars.compile('{{test}}')
    });
    view.render();
    expect(spy.callCount).to.equal(1);
  });
  it('should render multiple identical calls', function() {
    view = new Thorax.View({
      template: Handlebars.compile('{{test a=1}}{{test a=1}}{{#test a=1}}{{/test}}')
    });
    view.render();
    expect(spy.callCount).to.equal(3);
    expect(_.keys(view.children).length).to.equal(3);
  });

  describe('container render', function() {
    it('should preserve itself in the DOM', function() {
      view = new Thorax.View({
        template: Handlebars.compile('{{#test}}{{/test}}')
      });
      view.render();
      expect(spy.callCount).to.equal(1);
      expect(_.keys(view.children).length).to.equal(1);
      var firstKey = _.keys(view.children)[0];
      view.render();
      expect(spy.callCount).to.equal(1);
      expect(_.keys(view.children).length).to.equal(1);
      var newFirstKey = _.keys(view.children)[0];
      expect(firstKey).to.equal(newFirstKey);
    });
    it('should rerender if an input parameter changes', function() {
      view = new Thorax.View({
        template: Handlebars.compile('{{#test key}}{{/test}}'),
        key: 1
      });
      view.render();
      expect(spy.callCount).to.equal(1);
      expect(_.keys(view.children).length).to.equal(1);
      var firstKey = _.keys(view.children)[0];

      view.key = 2;
      view.render();
      expect(spy.callCount).to.equal(2);
      expect(_.keys(view.children).length).to.equal(1);
      var newFirstKey = _.keys(view.children)[0];
      expect(firstKey).to.not.equal(newFirstKey);
    });
    it('should rerender a helper has depth', function() {
      view = new Thorax.View({
        template: Handlebars.compile('{{#test}}{{../foo}}{{/test}}')
      });
      view.render();
      expect(spy.callCount).to.equal(1);
      expect(_.keys(view.children).length).to.equal(1);
      var firstKey = _.keys(view.children)[0];

      view.render();
      expect(spy.callCount).to.equal(2);
      expect(_.keys(view.children).length).to.equal(1);
      var newFirstKey = _.keys(view.children)[0];
      expect(firstKey).to.not.equal(newFirstKey);
    });
    it('should cooperate with each loops', function() {
      view = new Thorax.View({
        template: Handlebars.compile('{{#each keys}}{{#test}}@index{{/test}}{{/each}}'),
        keys: _.range(5)
      });
      view.render();
      expect(spy.callCount).to.equal(5);
      expect(_.keys(view.children).length).to.equal(5);

      view.render();
      expect(spy.callCount).to.equal(5);
      expect(_.keys(view.children).length).to.equal(5);
    });

    it('should release old children on re-render', function() {
      view = new Thorax.View({
        template: Handlebars.compile('{{#test key}}{{/test}}'),
        key: 1
      });
      view.render();
      expect(spy.callCount).to.equal(1);
      expect(_.keys(view.children).length).to.equal(1);
      var child = _.first(_.values(view.children));
      this.spy(child, '_destroy');

      view.key = 2;
      view.render();
      expect(spy.callCount).to.equal(2);
      expect(child._destroy.callCount).to.equal(1);
    });

    it('id, class and tag passed to helper view', function() {
      view = new Thorax.View({
        template: Handlebars.compile('{{#test tagName="a" className="b" id="c"}}{{/test}}')
      });
      view.render();
      expect(view.$('a').length).to.equal(1);
      expect(view.$('.b').length).to.equal(1);
      expect(view.$('#c').length).to.equal(1);
    });

    it('className and tagName re-written in helper view', function() {
      view = new Thorax.View({
        template: Handlebars.compile('{{#test tagName="a" className="b"}}{{/test}}')
      });
      view.render();
      expect(view.$('a').length).to.equal(1);
      expect(view.$('.b').length).to.equal(1);
    });

    it("should preserve a class template if no block is passed", function() {
      var ViewClass = Thorax.View.extend({
        template: Handlebars.compile('hello')
      });
      Handlebars.registerViewHelper('test-view-helper', ViewClass, function() {});
      var view = new Thorax.View({
        template: Handlebars.compile("{{test-view-helper}}")
      });
      view.render();
      expect(view.$('div').html()).to.equal('hello');
    });

    it("should preserve view's attributes if view class specified them", function() {
      var ViewClassWithObjectAttributes = Thorax.View.extend({
        attributes: {
          random: 'value'
        }
      });
      Handlebars.registerViewHelper('test-view-helper-attributes-object', ViewClassWithObjectAttributes, function() {});
      view = new Thorax.View({
        template: Handlebars.compile('{{test-view-helper-attributes-object}}')
      });
      view.render();
      expect(view.$('[random="value"]').length).to.equal(1);
    
      var ViewClassWithObjectAttributes = Thorax.View.extend({
        attributes: function() {
          return {
            random: 'value'
          };
        }
      });
      Handlebars.registerViewHelper('test-view-helper-attributes-callback', ViewClassWithObjectAttributes, function() {});
      
      view = new Thorax.View({
        template: Handlebars.compile('{{test-view-helper-attributes-callback}}')
      });
      view.render();
      expect(view.$('[random="value"]').length).to.equal(1);
    
    });
  });
});
