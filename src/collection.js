var _fetch = Backbone.Collection.prototype.fetch,
    _reset = Backbone.Collection.prototype.reset,
    collectionCidAttributeName = 'data-collection-cid',
    collectionNameAttributeName = 'data-collection-name',
    collectionEmptyAttributeName = 'data-collection-empty',
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
    collectionOptionNames.forEach(function(optionName) {
      options[optionName] && (this.options[optionName] = options[optionName]);
    }, this);
  },
  _setCollectionOptions: function(collection, options) {
    return _.extend({
      fetch: true,
      success: false,
      errors: true
      {{{override "collection-options" indent=6}}}
    }, options || {});
  },
  setCollection: function(collection, options) {
    this.collection = collection;
    if (collection) {
      collection.cid = collection.cid || _.uniqueId('collection');
      this.$el.attr(collectionCidAttributeName, collection.cid);
      collection.name && this.$el.attr(collectionNameAttributeName, collection.name);
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
    index && index.el && (index = this.$el.children().indexOf(index.el) + 1);
    //if argument is a view, or html string
    if (model.el || typeof model === 'string') {
      itemView = model;
      model = false;
    } else {
      index = index || this.collection.indexOf(model) || 0;
      itemView = this.renderItem(model, index);
    }
    if (itemView) {
      itemView.cid && this._addChild(itemView);
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
      model && $(itemElement).attr(modelCidAttributeName, model.cid);
      var previousModel = index > 0 ? this.collection.at(index - 1) : false;
      if (!previousModel) {
        this.$el.prepend(itemElement);
      } else {
        //use last() as appendItem can accept multiple nodes from a template
        var last = this.$el.find('[' + modelCidAttributeName + '="' + previousModel.cid + '"]').last();
        last.after(itemElement);
      }
      {{#has-plugin "helpers/view"}}
        this._appendViews(null, function(el) {
          el.setAttribute(modelCidAttributeName, model.cid);
        });
      {{/has-plugin}}
      {{#has-plugin "helpers/element"}}
        this._appendElements(null, function(el) {
          el.setAttribute(modelCidAttributeName, model.cid);
        });
      {{/has-plugin}}
      !options.silent && this.parent.trigger('rendered:item', this, this.collection, model, itemElement, index);
      applyItemVisiblityFilter.call(this, model);
    }
    return itemView;
  },
  //updateItem only useful if there is no item view, otherwise
  //itemView.render() provideds the same functionality
  updateItem: function(model) {
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
    if (this.collection) {
      if (this.collection.isEmpty()) {
        handleChangeFromNotEmptyToEmpty.call(this);
      } else {
        handleChangeFromEmptyToNotEmpty.call(this);
        this.collection.forEach(function(item, i) {
          this.appendItem(item, i);
        }, this);
      }
      this.parent.trigger('rendered:collection', this, this.collection);
      applyVisibilityFilter.call(this);
    }
    ++this._renderCount;
  },
  renderEmpty: function() {
    var viewOptions = {},
        emptyView = this.options['empty-view'],
        emptyContext = this.options['empty-context'],
        emptyTemplate = this.options['empty-template'];
    function getEmptyContext() {
      return (_.isFunction(emptyContext)
        ? emptyContext
        : this.parent[emptyContext]
      ).call(this.parent);
    }
    if (emptyView) {
      var viewOptions = {};
      emptyContext && (viewOptions.context = _.bind(getEmptyContext, this));
      var view = Thorax.Util.getViewInstance(emptyView, viewOptions);
      if (emptyTemplate) {
        view.render(this.renderTemplate(emptyTemplate, viewOptions.context ? viewOptions.context() : this.parent.context()));
      } else {
        view.render();
      }
      return view;
    } else {
      var emptyTemplate = emptyTemplate || (this.parent.name && Thorax.Util.getTemplate(this.parent.name + '-empty', true)),
          context;
      context = emptyContext ? getEmptyContext.call(this) : this.parent.context();
      return emptyTemplate && this.renderTemplate(emptyTemplate, context);
    }
  },
  renderItem: function(model, i) {
    var itemView = this.options['item-view'],
        itemTemplate = this.options['item-template'],
        itemContext = this.options['item-context'];
    function getItemContext() {
      return (_.isFunction(itemContext)
        ? itemContext
        : this.parent[itemContext]
      ).call(this.parent, model, i);
    }
    if (itemView) {
      var viewOptions = {
        model: model
      };
      itemContext && (viewOptions.context = _.bind(getItemContext, this));
      itemTemplate && (viewOptions.template = itemTemplate);
      var view = Thorax.Util.getViewInstance(itemView, viewOptions);
      view.ensureRendered();
      return view;
    } else {
      itemTemplate = itemTemplate || (this.parent.name && Thorax.Util.getTemplate(this.parent.name + '-item', true));
      if (!itemTemplate) {
        throw new Error('collection helper in View: ' + (this.parent.name || this.parent.cid) + ' requires an item template.');
      }
      return this.renderTemplate(itemTemplate, itemContext ? getItemContext.call(this) : model.attributes);
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

var collectionOptionNames = [
  'item-template',
  'empty-template',
  'item-view',
  'empty-view',
  'item-context',
  'empty-context',
  'empty-class',
  'filter'
  {{#has-plugin "loading"}}
  , 'loading-template'
  , 'loading-view'
  , 'loading-placement'
  {{/has-plugin}}
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

function applyVisibilityFilter() {
  if (this.options.filter) {
    this.collection.forEach(function(model) {
      applyItemVisiblityFilter.call(this, model);
    }, this);
  }
}

function applyItemVisiblityFilter(model) {
  if (this.options.filter) {
    $('[' + modelCidAttributeName + '="' + model.cid + '"]')[itemShouldBeVisible.call(this, model) ? 'show' : 'hide']();
  }
}

function itemShouldBeVisible(model, i) {
  return (typeof this.options.filter === 'string'
    ? this.parent[this.options.filter]
    : this.options.filter).call(this.parent, model, this.collection.indexOf(model))
  ;
}

function handleChangeFromEmptyToNotEmpty() {
  this.options['empty-class'] && this.$el.removeClass(this.options['empty-class']);
  this.$el.removeAttr(collectionEmptyAttributeName);
  this.$el.empty();
}

function handleChangeFromNotEmptyToEmpty() {
  this.options['empty-class'] && this.$el.addClass(this.options['empty-class']);
  this.$el.attr(collectionEmptyAttributeName, true);
  this.appendEmpty();
}

Thorax.View.on({
  collection: {
    filter: function(collectionView) {
      applyVisibilityFilter.call(collectionView);
    },
    change: function(collectionView, model) {
      //if we rendered with item views, model changes will be observed
      //by the generated item view but if we rendered with templates
      //then model changes need to be bound as nothing is watching
      if (!collectionView.options['item-view']) {
        collectionView.updateItem(model);
      }
      applyItemVisiblityFilter.call(collectionView, model);
    },
    add: function(collectionView, model, collection) {
      collectionView.collection.length === 1 && collectionView.$el.length && handleChangeFromEmptyToNotEmpty.call(collectionView);
      if (collectionView.$el.length) {
        var index = collection.indexOf(model);
        collectionView.appendItem(model, index);
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
      collectionView.collection.length === 0 && collectionView.$el.length && handleChangeFromNotEmptyToEmpty.call(collectionView);
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
