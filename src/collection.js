var _fetch = Backbone.Collection.prototype.fetch,
    _reset = Backbone.Collection.prototype.reset,
    collectionCidAttributeName = 'data-collection-cid',
    collectionNameAttributeName = 'data-collection-name',
    collectionEmptyAttributeName = 'data-collection-empty',
    modelCidAttributeName = 'data-model-cid',
    modelNameAttributeName = 'data-model-name',
    ELEMENT_NODE_TYPE = 1;

Thorax.Collection = Backbone.Collection.extend({
  model: Thorax.Model || Backbone.Model,
  isEmpty: function() {
    if (this.length > 0) {
      return false;
    } else {
      return this.length === 0 && this.isPopulated();
    }
  },
  isPopulated: function() {
    return this._fetched || this.length > 0 || (!this.length && !Thorax.Util.getValue(this, 'url'));
  },
  fetch: function(options) {
    options = options || {};
    var success = options.success;
    options.success = function(collection, response) {
      collection._fetched = true;
      success && success(collection, response);
    };
    return _fetch.apply(this, arguments);
  },
  reset: function(models, options) {
    this._fetched = !!models;
    return _reset.call(this, models, options);
  }
});

Thorax.Collections = {};
Thorax.Util.createRegistryWrapper(Thorax.Collection, Thorax.Collections);

{{#inject "extend"}}
  Thorax.Util._cloneEvents(this, child, '_collectionEvents');
{{/inject}}

{{#inject "beforeConfigure"}}
  this._collectionEvents = [];
{{/inject}}

{{#inject "on"}}
  if (eventName === 'collection' && typeof callback === 'object') {
    return addEvents(this._collectionEvents, callback);
  }
{{/inject}}

Thorax.View._collectionEvents = [];

//collection view is meant to be initialized via the collection
//helper but can alternatively be initialized programatically
//constructor function handles this case, no logic except for
//super() call will be exectued when initialized via collection helper

Thorax.CollectionView = Thorax.HelperView.extend({
  constructor: function(options) {
    Thorax.CollectionView.__super__.constructor.call(this, options);
    //collection helper will initialize this.options, so need to mimic
    this.options || (this.options = {});
    this.collection && this.setCollection(this.collection);
    Thorax.CollectionView._optionNames.forEach(function(optionName) {
      options[optionName] && (this.options[optionName] = options[optionName]);
    }, this);
  },
  _setCollectionOptions: function(collection, options) {
    return _.extend({
      fetch: true,
      success: false,
      errors: true
    }, options || {});
  },
  setCollection: function(collection, options) {
    this.collection = collection;
    if (collection) {
      collection.cid = collection.cid || _.uniqueId('collection');
      this.$el.attr(collectionCidAttributeName, collection.cid);
      if (collection.name) {
        this.$el.attr(collectionNameAttributeName, collection.name);
      }
      this.options = this._setCollectionOptions(collection, _.extend({}, this.options, options));
      bindCollectionEvents.call(this, collection, this.parent._collectionEvents);
      bindCollectionEvents.call(this, collection, this.parent.constructor._collectionEvents);
      collection.trigger('set', collection);
      if (Thorax.Util.shouldFetch(collection, this.options)) {
        this._loadCollection(collection);
      } else {
        //want to trigger built in event handler (render())
        //without triggering event on collection
        this.reset();
      }
    }
    return this;
  },
  _loadCollection: function(collection) {
    collection.fetch(this.options);
  },
  //appendItem(model [,index])
  //appendItem(html_string, index)
  //appendItem(view, index)
  appendItem: function(model, index, options) {
    //empty item
    if (!model) {
      return;
    }
    var itemView;
    options = options || {};
    //if index argument is a view
    if (index && index.el) {
      index = this.$el.children().indexOf(index.el) + 1;
    }
    //if argument is a view, or html string
    if (model.el || typeof model === 'string') {
      itemView = model;
      model = false;
    } else {
      index = index || this.collection.indexOf(model) || 0;
      itemView = this.renderItem(model, index);
    }
    if (itemView) {
      if (itemView.cid) {
        this._addChild(itemView);
      }
      //if the renderer's output wasn't contained in a tag, wrap it in a div
      //plain text, or a mixture of top level text nodes and element nodes
      //will get wrapped
      if (typeof itemView === 'string' && !itemView.match(/^\s*\</m)) {
        itemView = '<div>' + itemView + '</div>'
      }
      var itemElement = itemView.el ? [itemView.el] : _.filter($(itemView), function(node) {
        //filter out top level whitespace nodes
        return node.nodeType === ELEMENT_NODE_TYPE;
      });
      if (model) {
        $(itemElement).attr(modelCidAttributeName, model.cid);
      }
      var previousModel = index > 0 ? this.collection.at(index - 1) : false;
      if (!previousModel) {
        this.$el.prepend(itemElement);
      } else {
        //use last() as appendItem can accept multiple nodes from a template
        this.$el.find('[' + modelCidAttributeName + '="' + previousModel.cid + '"]').last().after(itemElement);
      }
      this._appendViews(null, function(el) {
        el.setAttribute(modelCidAttributeName, model.cid);
      });
      this._appendElements(null, function(el) {
        el.setAttribute(modelCidAttributeName, model.cid);
      });
      if (!options.silent) {
        this.parent.trigger('rendered:item', this, this.collection, model, itemElement, index);
      }
    }
    return itemView;
  },
  //updateItem only useful if there is no item view, otherwise
  //itemView.render() provideds the same functionality
  updateItem: function(model) {
    var viewEl = this.$('[' + modelCidAttributeName + '="' + model.cid + '"]');
    var index = this.$('[' + modelCidAttributeName + ']').index(viewEl[0]);
    this.removeItem(model);
    this.appendItem(model);
  },
  removeItem: function(model) {
    var viewEl = this.$('[' + modelCidAttributeName + '="' + model.cid + '"]');
    if (!viewEl.length) {
      return false;
    }
    var viewCid = viewEl.attr(viewCidAttributeName);
    if (this.children[viewCid]) {
      delete this.children[viewCid];
    }
    viewEl.remove();
    return true;
  },
  reset: function() {
    this.render();
  },
  render: function() {
    this.$el.empty();
    if (this.collection) {
      if (this.collection.isEmpty()) {
        this.$el.attr(collectionEmptyAttributeName, true);
        this.appendEmpty();
      } else {
        this.$el.removeAttr(collectionEmptyAttributeName);
        this.collection.forEach(function(item, i) {
          if (filterCollectionItem(this.parent, this, item, i)) {
            this.appendItem(item, i);
          }
        }, this);
      }
      this.parent.trigger('rendered:collection', this, this.collection);
    }
    ++this._renderCount;
  },
  renderEmpty: function() {
    var viewOptions = {};
    if (this.options['empty-view']) {
      if (this.options['empty-context']) {
        viewOptions.context = _.bind(function() {
          return (_.isFunction(this.options['empty-context'])
            ? this.options['empty-context']
            : this.parent[this.options['empty-context']]
          ).call(this.parent);
        }, this);
      }
      var view = Thorax.Util.getViewInstance(this.options['empty-view'], viewOptions);
      if (this.options['empty-template']) {
        view.render(this.renderTemplate(this.options['empty-template'], viewOptions.context ? viewOptions.context() : {}));
      } else {
        view.render();
      }
      return view;
    } else {
      var emptyTemplate = this.options['empty-template'] || (this.parent.name && this._loadTemplate(this.parent.name + '-empty', true));
      var context;
      if (this.options['empty-context']) {
        context = (_.isFunction(this.options['empty-context'])
          ? this.options['empty-context']
          : this.parent[this.options['empty-context']]
        ).call(this.parent);
      } else {
        context = {};
      }
      return emptyTemplate && this.renderTemplate(emptyTemplate, context);
    }
  },
  renderItem: function(model, i) {
    if (this.options['item-view']) {
      var viewOptions = {
        model: model
      };
      //itemContext deprecated
      if (this.options['item-context']) {
        viewOptions.context = _.bind(function() {
          return (_.isFunction(this.options['item-context'])
            ? this.options['item-context']
            : this.parent[this.options['item-context']]
          ).call(this.parent, model, i);
        }, this);
      }
      if (this.options['item-template']) {
        viewOptions.template = this.options['item-template'];
      }
      var view = Thorax.Util.getViewInstance(this.options['item-view'], viewOptions);
      view.ensureRendered();
      return view;
    } else {
      var itemTemplate = this.options['item-template'] || (this.parent.name && this.parent._loadTemplate(this.parent.name + '-item', true));
      if (!itemTemplate) {
        throw new Error('collection helper in View: ' + (this.parent.name || this.parent.cid) + ' requires an item template.');
      }
      var context;
      if (this.options['item-context']) {
        context = (_.isFunction(this.options['item-context'])
          ? this.options['item-context']
          : this.parent[this.options['item-context']]
        ).call(this.parent, model, i);
      } else {
        context = model.attributes;
      }
      return this.renderTemplate(itemTemplate, context);
    }
  },
  appendEmpty: function() {
    this.$el.empty();
    var emptyContent = this.renderEmpty();
    emptyContent && this.appendItem(emptyContent, 0, {
      silent: true
    });
    this.parent.trigger('rendered:empty', this, this.collection);
  }
});

Thorax.CollectionView._optionNames = [
  'item-template',
  'empty-template',
  'item-view',
  'empty-view',
  'item-context',
  'empty-context',
  'filter'
];

function bindCollectionEvents(collection, events) {
  events.forEach(function(event) {
    this.on(collection, event[0], function() {
      //getEventCallback will resolve if it is a string or a method
      //and return a method
      var args = _.toArray(arguments);
      args.unshift(this);
      return getEventCallback(event[1], this.parent).apply(this.parent, args);
    }, this);
  }, this);
}

function handleChangeFromEmptyToNotEmpty() {
  if (this.collection.length === 1) {
    if(this.$el.length) {
      this.$el.removeAttr(collectionEmptyAttributeName);
      this.$el.empty();
    }
  }
}

function handleChangeFromNotEmptyToEmpty() {
  if (this.collection.length === 0) {
    if (this.$el.length) {
      this.$el.attr(collectionEmptyAttributeName, true);
      this.appendEmpty();
    }
  }
}

function filterCollectionItem(view, collectionView, item, i) {
  return (!collectionView.options.filter || collectionView.options.filter &&
    (typeof collectionView.options.filter === 'string'
        ? view[collectionView.options.filter]
        : collectionView.options.filter).call(view, item, i)
    );
}

Thorax.View.on({
  collection: {
    filter: function(collectionView) {
      if (collectionView.options.filter) {
        collectionView.render();
      }
    },
    change: function(collectionView, model) {
      function updateItem() {
        collectionView.updateItem(model);
      }

      //if we rendered with item views, model changes will be observed
      //by the generated item view but if we rendered with templates
      //then model changes need to be bound as nothing is watching
      if (!collectionView.options['item-view'] && !collectionView.options.filter) {
        updateItem();
      } else if (collectionView.options.filter) {
        var filterCallback = (typeof collectionView.options.filter === 'string'
          ? this[collectionView.options.filter]
          : collectionView.options.filter);
        var shouldBeVisible = filterCallback.call(this, model, collectionView.collection.indexOf(model));
        var isVisible = !!collectionView.$('[' + modelCidAttributeName + '="' + model.cid + '"]').length;
        if (!isVisible && shouldBeVisible) {
          //TODO: filtered indexing is not taken into account, need to re-render
          //to ensure proper order until filtered indexing is cached / calculated
          collectionView.render();
        } else if (isVisible && !shouldBeVisible) {
          collectionView.removeItem(model);
        } else if (isVisible && shouldBeVisible) {
          updateItem();
        }
      }
    },
    add: function(collectionView, model, collection) {
      handleChangeFromEmptyToNotEmpty.call(collectionView);
      if (collectionView.$el.length) {
        var index = collection.indexOf(model);
        if (filterCollectionItem(this, collectionView, model, index)) {
          collectionView.appendItem(model, index);
        }
      }
    },
    remove: function(collectionView, model, collection) {
      collectionView.$el.find('[' + modelCidAttributeName + '="' + model.cid + '"]').remove();
      for (var cid in collectionView.children) {
        if (collectionView.children[cid].model && collectionView.children[cid].model.cid === model.cid) {
          collectionView.children[cid].destroy();
          delete collectionView.children[cid];
          break;
        }
      }
      handleChangeFromNotEmptyToEmpty.call(collectionView);
    },
    reset: function(collectionView, collection) {
      collectionView.reset();
    },
    error: function(collectionView, message) {
      if (collectionView.options.errors) {
        collectionView.trigger('error', message);
        this.trigger('error', message);
      }
    }
  }
});

Handlebars.registerViewHelper('collection', Thorax.CollectionView, function(collection, view) {
  if (arguments.length === 1) {
    view = collection;
    collection = this._view.collection;
  }
  if (collection) {
    //item-view and empty-view may also be passed, but have no defaults
    _.extend(view.options, {
      'item-template': view.template && view.template !== Handlebars.VM.noop ? view.template : view.options['item-template'],
      'empty-template': view.inverse && view.inverse !== Handlebars.VM.noop ? view.inverse : view.options['empty-template'],
      'item-context': view.options['item-context'] || view.parent.itemContext,
      'empty-context': view.options['empty-context'] || view.parent.emptyContext,
      filter: view.options['filter']
    });
    view.setCollection(collection);
  }
});

//empty helper
Handlebars.registerViewHelper('empty', function(collection, view) {
  var empty, noArgument;
  if (arguments.length === 1) {
    view = collection;
    collection = false;
    noArgument = true;
  }

  var _render = view.render;
  view.render = function() {
    if (noArgument) {
      empty = !this.parent.model || (this.parent.model && !this.parent.model.isEmpty());
    } else if (!collection) {
      empty = true;
    } else {
      empty = collection.isEmpty();
    }
    if (empty) {
      this.parent.trigger('rendered:empty', this, collection);
      return _render.call(this, this.template);
    } else {
      return _render.call(this, this.inverse);
    }
  };

  //no model binding is necessary as model.set() will cause re-render
  if (collection) {
    function collectionRemoveCallback() {
      if (collection.length === 0) {
        view.render();
      }
    }
    function collectionAddCallback() {
      if (collection.length === 1) {
        view.render();
      }
    }
    function collectionResetCallback() {
      view.render();
    }

    view.on(collection, 'remove', collectionRemoveCallback);
    view.on(collection, 'add', collectionAddCallback);
    view.on(collection, 'reset', collectionResetCallback);
  }
  
  view.render();
});

//$(selector).collection() helper
$.fn.collection = function(view) {
  var $this = $(this),
      collectionElement = $this.closest('[' + collectionCidAttributeName + ']'),
      collectionCid = collectionElement && collectionElement.attr(collectionCidAttributeName);
  if (collectionCid) {
    view = view || $this.view();
    if (view) {
      return view.collection;
    }
  }
  return false;
};
