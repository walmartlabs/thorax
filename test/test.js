$(function() {

  Thorax.configure({
    templatePathPrefix: ''
  });
  Application.templates = {
    'letter-item.handlebars': Handlebars.compile("<li>{{letter}}</li>")
  };

  var LetterModel = Thorax.Model.extend({});
  LetterModel.letters = ['a','b','c','d'].map(function(letter) {
    return new LetterModel({letter: letter});
  });

  var LetterItemView = Thorax.View.extend({
    name: 'letter-item'
  });

  test("Model View binding", function() {
    var a = new LetterItemView({
      model: LetterModel.letters[0]
    });
    console.log(a.el);
    equal(a.el.firstChild.innerHTML, 'a');
    var b = new LetterItemView();
    b.setModel(LetterModel.letters[1]);
    equal(b.el.firstChild.innerHTML, 'b');
  });

});

