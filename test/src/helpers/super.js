describe('super helper', function() {

  it("super helper", function() {
    var parent, child;
    Thorax.templates['super-named-test'] = '<div class="parent"></div>';
    parent = Thorax.View.extend({
      name: 'super-named-test'
    });
    child = new (parent.extend({
      template: '<div class="child"></div>{{super}}'
    }))();
    child.render();
    expect(child.$('.parent').length).to.equal(1);
    expect(child.$('.child').length).to.equal(1);

    parent = Thorax.View.extend({
      name: 'super-test',
      template: '<div class="parent"></div>'
    });
    child = new (parent.extend({
      template: '<div class="child"></div>{{super}}'
    }))();
    child.render();
    expect(child.$('.parent').length).to.equal(1);
    expect(child.$('.child').length).to.equal(1);

    parent = Thorax.View.extend({
      template: '{{#collection letters tag="ul"}}<li>{{letter}}</li>{{/collection}}'
    });
    var instance = new (parent.extend({
      template: '{{super}}'
    }))({letters: new Thorax.Collection([{letter: 'a'}])});
    instance.render();
    expect(instance.$('li').length).to.equal(1);
    expect(instance.$('li').eq(0).html()).to.equal('a');
  });
});
