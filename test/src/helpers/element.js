describe('element helper', function() {
  it("element helper", function() {
    var a = document.createElement('li');
    a.innerHTML = 'one';
    var view = new Thorax.View({
      template: Handlebars.compile('<ul>{{element a tag="li"}}{{element b tag="li"}}{{element c}}{{element d}}</ul>'),
      a: a,
      b: function() {
        var li = document.createElement('li');
        li.innerHTML = 'two';
        return li;
      },
      c: function() {
        return $('<li>three</li><li>four</li>');
      },
      d: $('<li>five</li>')
    });
    view.render();
    expect(view.$('li')[0].innerHTML).to.equal('one');
    expect(view.$('li')[1].innerHTML).to.equal('two');
    expect(view.$('li')[2].innerHTML).to.equal('three');
    expect(view.$('li')[3].innerHTML).to.equal('four');
    expect(view.$('li')[4].innerHTML).to.equal('five');
    view.html('');
    expect(view.$('li').length).to.equal(0);
    view.render();
    expect(view.$('li')[0].innerHTML).to.equal('one');
    expect(view.$('li')[1].innerHTML).to.equal('two');
    expect(view.$('li')[2].innerHTML).to.equal('three');
    expect(view.$('li')[3].innerHTML).to.equal('four');
    expect(view.$('li')[4].innerHTML).to.equal('five');
  });
});
