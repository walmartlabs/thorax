/*global createRegistryWrapper, dataObject, getEventCallback, getValue, modelCidAttributeName, viewCidAttributeName */
var _fetch = Backbone.Collection.prototype.fetch,
    _reset = Backbone.Collection.prototype.reset,
    collectionCidAttributeName = 'data-collection-cid',
    collectionEmptyAttributeName = 'data-collection-empty',
    collectionElementAttributeName = 'data-collection-element',
    primaryCollectionAttributeName = 'data-collection-primary',
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
  setCallback: afterSetCollection,
  bind: 'bindCollection',
  unbind: 'unbindCollection',
  options: '_setCollectionOptions',
  change: '_onCollectionReset',
  $el: 'getCollectionElement',
  cidAttrName: collectionCidAttributeName
});

_.extend(Thorax.View.prototype, {
  _collectionSelector: '[' + collectionElementAttributeName + ']',
  //appendItem(model [,index])
  //appendItem(html_string, index)
  //appendItem(view, index)
  appendItem: function(model, index, options) {
    //empty item
    if (!model) {
      return;
    }
    var itemView,
        $el = this.getCollectionElement();
    options = options || {};
    //if index argument is a view
    index && index.el && (index = $el.children().indexOf(index.el) + 1);
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
      if (typeof itemView === 'string' && !itemView.match(/^\s*</m)) {
        itemView = '<div>' + itemView + '</div>';
      }
      var itemElement = itemView.el ? [itemView.el] : _.filter($(itemView), function(node) {
        //filter out top level whitespace nodes
        return node.nodeType === ELEMENT_NODE_TYPE;
      });
      model && $(itemElement).attr(modelCidAttributeName, model.cid);
      var previousModel = index > 0 ? this.collection.at(index - 1) : false;
      if (!previousModel) {
        $el.prepend(itemElement);
      } else {
        //use last() as appendItem can accept multiple nodes from a template
        var last = $el.find('[' + modelCidAttributeName + '="' + previousModel.cid + '"]').last();
        last.after(itemElement);
      }

      this.trigger('append', null, function(el) {
        el.setAttribute(modelCidAttributeName, model.cid);
      });

      !options.silent && this.trigger('rendered:item', this, this.collection, model, itemElement, index);
      applyItemVisiblityFilter.call(this, model);
    }
    return itemView;
  },
  // updateItem only useful if there is no item view, otherwise
  // itemView.render() provides the same functionality
  updateItem: function(model) {
    this.removeItem(model);
    this.appendItem(model);
  },
  removeItem: function(model) {
    var $el = this.getCollectionElement(),
        viewEl = $el.find('[' + modelCidAttributeName + '="' + model.cid + '"]');
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
  renderCollection: function() {
    this.ensureRendered();
    if (collectionHelperPresentForPrimaryCollection.call(this)) {
      return;
    }
    if (this.collection) {
      if (this.collection.isEmpty()) {
        handleChangeFromNotEmptyToEmpty.call(this);
      } else {
        handleChangeFromEmptyToNotEmpty.call(this);
        this.collection.forEach(function(item, i) {
          this.appendItem(item, i);
        }, this);
      }
      this.trigger('rendered:collection', this, this.collection);
      applyVisibilityFilter.call(this);
    } else {
      handleChangeFromNotEmptyToEmpty.call(this);
    }
  },
  emptyClass: 'empty',
  renderEmpty: function() {
    var context = this.emptyContext ? this.emptyContext.call(this) : this.context();
    if (this.emptyView) {
      var view = Thorax.Util.getViewInstance(this.emptyView, {});
      if (this.emptyTemplate) {
        view.render(this.renderTemplate(this.emptyTemplate, context));
      } else {
        view.render();
      }
      return view;
    } else {
      return this.emptyTemplate && this.renderTemplate(this.emptyTemplate, context);
    }
  },
  renderItem: function(model, i) {
    if (this.itemView) {
      var viewOptions = {
        model: model
      };
      this.itemTemplate && (viewOptions.template = this.itemTemplate);
      var view = Thorax.Util.getViewInstance(this.itemView, viewOptions);
      view.ensureRendered();
      return view;
    } else {
      if (!this.itemTemplate) {
        throw new Error('collection in View: ' + (this.name || this.cid) + ' requires an item template.');
      }
      return this.renderTemplate(this.itemTemplate, this.itemContext ? this.itemContext(model, i) : model.attributes);
    }
  },
  appendEmpty: function() {
    var $el = this.getCollectionElement();
    $el.empty();
    var emptyContent = this.renderEmpty();
    emptyContent && this.appendItem(emptyContent, 0, {
      silent: true
    });
    this.trigger('rendered:empty', this, this.collection);
  },
  getCollectionElement: function() {
    var element = this.$(this._collectionSelector);
    return element.length === 0 ? this.$el : element;
  },
  _onCollectionReset: function(collection) {
    if (collection === this.collection && this._collectionOptionsByCid[this.collection.cid].render) {
      this.renderCollection();
    }
  },
  // Events that will only be bound to "this.collection"
  _collectionRenderingEvents: {
    reset: '_onCollectionReset',
    sort: '_onCollectionReset',
    filter: function() {
      applyVisibilityFilter.call(this);
    },
    change: function(model) {
      // If we rendered with item views, model changes will be observed
      // by the generated item view but if we rendered with templates
      // then model changes need to be bound as nothing is watching
      !this.itemView && this.updateItem(model);
      applyItemVisiblityFilter.call(this, model);
    },
    add: function(model) {
      var $el = this.getCollectionElement();
      this.collection.length === 1 && $el.length && handleChangeFromEmptyToNotEmpty.call(this);
      if ($el.length) {
        var index = this.collection.indexOf(model);
        this.appendItem(model, index);
      }
    },
    remove: function(model) {
      var $el = this.getCollectionElement();
      $el.find('[' + modelCidAttributeName + '="' + model.cid + '"]').remove();
      for (var cid in this.children) {
        if (this.children[cid].model && this.children[cid].model.cid === model.cid) {
          this.children[cid].destroy();
          delete this.children[cid];
          break;
        }
      }
      this.collection.length === 0 && $el.length && handleChangeFromNotEmptyToEmpty.call(this);
    }
  }
});

Thorax.View.on({
  collection: {
    error: function(collection, message) {
      if (this._collectionOptionsByCid[collection.cid].errors) {
        this.trigger('error', message, collection);
      }
    }
  }
});

function afterSetCollection(collection) {
  if (!collectionHelperPresentForPrimaryCollection.call(this) && collection) {
    _.each(this._collectionRenderingEvents, function(callback, eventName) {
      // getEventCallback will resolve if it is a string or a method
      // and return a method
      this.listenTo(collection, eventName, getEventCallback(callback, this));
    }, this);
  }
}

function collectionHelperPresentForPrimaryCollection() {
  return this.collection && this.$('[' + primaryCollectionAttributeName + '="' + this.collection.cid + '"]').length;
}

function preserveCollectionElement(callback) {
  var oldCollectionElement = this.getCollectionElement();
  callback.call(this);
  this.getCollectionElement().replaceWith(oldCollectionElement);
}

function applyVisibilityFilter() {
  if (this.itemFilter) {
    this.collection.forEach(function(model) {
      applyItemVisiblityFilter.call(this, model);
    }, this);
  }
}

function applyItemVisiblityFilter(model) {
  var $el = this.getCollectionElement();
  this.itemFilter && $el.find('[' + modelCidAttributeName + '="' + model.cid + '"]')[itemShouldBeVisible.call(this, model) ? 'show' : 'hide']();
}

function itemShouldBeVisible(model) {
  return this.itemFilter(model, this.collection.indexOf(model));
}

function handleChangeFromEmptyToNotEmpty() {
  var $el = this.getCollectionElement();
  this.emptyClass && $el.removeClass(this.emptyClass);
  $el.removeAttr(collectionEmptyAttributeName);
  $el.empty();
}

function handleChangeFromNotEmptyToEmpty() {
  var $el = this.getCollectionElement();
  this.emptyClass && $el.addClass(this.emptyClass);
  $el.attr(collectionEmptyAttributeName, true);
  this.appendEmpty();
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
