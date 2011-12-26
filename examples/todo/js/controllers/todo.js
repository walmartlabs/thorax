// setup the local cache
var cache = {
    todos: new Todo.Models.TodoList()
};

// create the router.  'module' is created by lumbar.
Thorax.Router.create(module, {

  list: function() {
    var view = this.view('TodoList');
    // render would need to be called if setCollection/setModel is not called
    view.setCollection(cache.todos);
    Todo.layout.setView(view);
  }
});