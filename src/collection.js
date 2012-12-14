/*global createRegistryWrapper, dataObject, getValue, modelCidAttributeName, viewCidAttributeName */
var _fetch = Backbone.Collection.prototype.fetch,
    _reset = Backbone.Collection.prototype.reset,
    collectionCidAttributeName = 'data-collection-cid',
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
    return this._fetched || this.length > 0 || (!this.length && !getValue(this, 'url'));
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
createRegistryWrapper(Thorax.Collection, Thorax.Collections);

dataObject('collection', {
  name: '_collectionEvents',
  array: '_collections',
  hash: '_collectionOptionsByCid',

  set: 'setCollection',
  bind: 'bindCollection',
  unbind: 'unbindCollection',
  cidAttrName: collectionCidAttributeName
});

Thorax.CollectionView = Thorax.HelperView.extend({
  constructor: function(options) {
    Thorax.CollectionView.__super__.constructor.call(this, options);
    if (!this.parent) {
      throw new Error("CollectionView requires a 'parent' view to be set");
    }
    //collection helper will initialize this.options, so need to mimic
    this.options || (this.options = {});
    _.each(collectionOptionNames, function(optionName) {
      options[optionName] && (this.options[optionName] = options[optionName]);
    }, this);
    configureCollectionViewOptions(this);
    this.collection && this.setCollection(this.collection);
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
        itemView = '<div>' + itemView + '</div>';
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
    } else {
      handleChangeFromNotEmptyToEmpty.call(this);
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
];

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

function itemShouldBeVisible(model) {
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

var sharedCollectionEvents = {
  collection: {
    reset: function(collection) {
      var options = this._collectionOptionsByCid[collection.cid];
      options.render && this.render();
    },
    error: function(collection, message) {
      var options = this._collectionOptionsByCid[collection.cid];
      options.errors && this.trigger('error', message);
    }
  }
};

// Sub-classes have already been declared, so need
// to call `on` on all classes that should get the
// events
Thorax.View.on(sharedCollectionEvents);
Thorax.HelperView.on(sharedCollectionEvents);
Thorax.CollectionView.on(sharedCollectionEvents);

Thorax.CollectionView.on({
  collection: {
    filter: function() {
      applyVisibilityFilter.call(this);
    },
    change: function(model) {
      //if we rendered with item views, model changes will be observed
      //by the generated item view but if we rendered with templates
      //then model changes need to be bound as nothing is watching
      if (!this.options['item-view']) {
        this.updateItem(model);
      }
      applyItemVisiblityFilter.call(this, model);
    },
    add: function(model, collection) {
      this.collection.length === 1 && this.$el.length && handleChangeFromEmptyToNotEmpty.call(this);
      if (this.$el.length) {
        var index = collection.indexOf(model);
        this.appendItem(model, index);
      }
    },
    remove: function(model /*, collection */) {
      this.$el.find('[' + modelCidAttributeName + '="' + model.cid + '"]').remove();
      for (var cid in this.children) {
        if (this.children[cid].model && this.children[cid].model.cid === model.cid) {
          this.children[cid].destroy();
          delete this.children[cid];
          break;
        }
      }
      this.collection.length === 0 && this.$el.length && handleChangeFromNotEmptyToEmpty.call(this);
    }
    // collection.reset event registered in Thorax.View class
  }
});

//item-template and empty-template are configured in the collection helper
function configureCollectionViewOptions(view) {
  _.extend(view.options, {
    'item-context': view.options['item-context'] || view.parent.itemContext,
    'empty-context': view.options['empty-context'] || view.parent.emptyContext,
    'empty-class': ('empty-class' in view.options) ? view.options['empty-class'] : 'empty'
  });
}

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
