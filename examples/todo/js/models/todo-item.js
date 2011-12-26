// todo item model
Todo.Models.TodoItem = Thorax.Model.extend({
  validate: function(attributes) {
    for (name in attributes) {
      if (name === 'label' && !attributes[name]) {
        return [{'name': name, message: 'Enter the todo item'}];
      }
    }
  }
});
