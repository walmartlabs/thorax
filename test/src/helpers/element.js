describe('element helper', function() {
  it("element helper", function() {
    var a = $('<li>one</li>');
    var view = new Thorax.View({
      template: Handlebars.compile('<ul>{{element a tag="li"}}{{element b tag="li"}}{{element c}}{{element d}}</ul>'),
      a: a,
      b: function() {
        if (document.createElement) {
          var li = document.createElement('li');
          li.innerHTML = 'two';
          return li;
        } else {
          return $('<li>two</li>');
        }
      },
      c: function() {
        return $('<li>three</li><li>four</li>');
      },
      d: $('<li>five</li>')
    });
    view.render();
    expect(view.$('li').eq(0).html()).to.equal('one');
    expect(view.$('li').eq(1).html()).to.equal('two');
    expect(view.$('li').eq(2).html()).to.equal('three');
    expect(view.$('li').eq(3).html()).to.equal('four');
    expect(view.$('li').eq(4).html()).to.equal('five');
    view.html('');
    expect(view.$('li').length).to.equal(0);
    view.render();
    expect(view.$('li').eq(0).html()).to.equal('one');
    expect(view.$('li').eq(1).html()).to.equal('two');
    expect(view.$('li').eq(2).html()).to.equal('three');
    expect(view.$('li').eq(3).html()).to.equal('four');
    expect(view.$('li').eq(4).html()).to.equal('five');
  });
});
