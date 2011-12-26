// todo items collection
Todo.Models.TodoList = Thorax.Collection.extend({
  model: Todo.Models.TodoItem,

  // list of items that are done
  done: function() {
    return this.filter(function(todo){ return todo.get('done'); });
  },

  // list of items that are not done
  remaining: function() {
    return this.without.apply(this, this.done());
  }
});