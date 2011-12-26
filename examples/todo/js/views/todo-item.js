Todo.Views.TodoItem = Thorax.View.extend({
  name: 'todo-item',
  events: {
    'change input.check': '_onCheckToggle',
    'dblclick .todo-text': '_onEdit',
    'keypress .todo-input': '_onKeyPress',
    'click .todo-destroy': 'removeItem',
    'blur .todo-input': 'close'
  },

  tagName: 'li',

  render: function() {
    Thorax.View.prototype.render.call(this);
    var self = this;
    this.$('.todo-input').bind('blur', function() {
      self.close();
    });
  },

  removeItem: function() {
    this.model.collection.remove(this.model);
  },

  _onCheckToggle: function(event) {
    this.model.set({"done": event.srcElement.checked});
  },

  _onEdit: function() {
    this.$('input').val(this.model.attributes.label);
    $(this.el).addClass('editing');
    this.$('input').focus();
  },

  _onKeyPress: function(event) {
    if (event.keyCode === 13) {
      event.preventDefault();
      this.close();
    }
  },

  close: function() {
    this.serialize(function(attributes) {
      this.model.set(attributes);
    });
    $(this.el).removeClass('editing');
  }
});