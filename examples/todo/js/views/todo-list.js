Todo.Views.TodoList = Thorax.View.extend({
  name: 'todo-list',
  events: {
    'activated': '_resetStatus',
    'keypress #new-todo': '_onKeyPress',
    'click .remove-items': '_removeCheckedItems',
    collection: {
      'add': '_resetStatus',
      'remove': '_resetStatus',
      'change': '_resetStatus'
    }
  },

  renderEmpty: function() {
    return '';
  },

  // by default, this would return the contents of the item template (list/all-item.handlebars).
  // we'll override to use use a sub-view to show how that would work
  renderItem: function(model, index) {
    var view = this.view('TodoItem');
    view.setModel(model, {fetch: false});
    return view;
  },

  // set the item count status correctly on initial render
  render: function() {
    Thorax.View.prototype.render.call(this);
    this._resetStatus();
  },

  // reset the item count status
  _resetStatus: function() {
    var numberDone = this.collection.done().length;
    var textDone = itemWord(numberDone);
    var numberRemaining = this.collection.remaining().length;
    var textRemaining = itemWord(numberRemaining);
    this.$('#todo-stats').html(this.template('todo-status', {
      number: numberRemaining,
      word: itemWord(numberRemaining),
      numberDone: numberDone,
      wordDone: itemWord(numberDone)
    }));
    this.$('.todo-clear')[(numberDone > 0) ? 'show' : 'hide']();
  },

  // remove this item from the collection
  _removeCheckedItems: function(event) {
    var self = this;
    _.each(this.collection.done(), function(item) {
      self.collection.remove(item.destroy());
    });
  },

  _onKeyPress: function(event) {
    if (event.keyCode === 13) {
      // add a new todo item (when the enter key is pressed)
      var val = $(event.srcElement).val();
      if (val) {
        this.collection.add(new this.collection.model({label: val}));
        $(event.srcElement).val('');
      }
    }
  },

  // make sure we don't add any items with empty labels
  // (the message isn't currently shown because we only have empty string validation)
  _validateInput: function(data) {
    var errors = [];
    if (!data.label) {
      errors.push({key: label, message: 'Please enter the list name'});
    }
    return errors;
  }
});

function itemWord(plurality) {
  if (plurality === 1) return 'item';
  else return 'items';
}