describe('input-value', function() {
  var view;
  before(function() {
    this.View = Thorax.View.extend({
      template: Handlebars.compile('<input name="foo" id="foo" value="{{myProp}}">')
    });
  });

  afterEach(function () {
    $('.layout').empty();
  });

  it('updates an input field value using DOM manipulation', function () {
    view = new this.View({
      context: function () {
        return {
          myProp: 'value'
        };
      }
    });
    view.appendTo($('.layout'));

    expect(view.$('input').attr('value')).to.equal('value');
    expect(view.$('input').prop('value')).to.equal('value');

    // Set a new value for the input.
    view.$('input').attr('value', 'new value');

    expect(view.$('input').attr('value')).to.equal('new value');
    expect(view.$('input').prop('value')).to.equal('new value');
  });

  it('updates an input field value using model binding', function () {
    var Model = Thorax.Model.extend();
    var model = new Model({ myProp: 'value' });
    view = new this.View({
      model: model
    });
    view.appendTo($('.layout'));

    expect(view.$('input').attr('value')).to.equal('value');
    expect(view.$('input').prop('value')).to.equal('value');

    // Set a new value for the input.
    view.model.set('myProp', 'new value');

    // This passes in jQuery, but fails in Zepto:
    expect(view.$('input').attr('value')).to.equal('new value');
    // This fails:
    expect(view.$('input').prop('value')).to.equal('new value');
  });

  it('updates an input field value using context method', function () {
    view = new this.View({
      myProp: 'value',
      context: function () {
        return {
          myProp: this.myProp
        };
      }
    });
    view.appendTo($('.layout'));

    expect(view.$('input').attr('value')).to.equal('value');
    expect(view.$('input').prop('value')).to.equal('value');

    // Set a new value for the input.
    view.myProp = 'new value';
    view.render();

    // This passes in jQuery and Zepto:
    expect(view.$('input').attr('value')).to.equal('new value');
    // This fails:
    expect(view.$('input').prop('value')).to.equal('new value');
  });

});