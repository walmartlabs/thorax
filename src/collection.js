/*global assignView, assignTemplate, createRegistryWrapper, dataObject, getValue, modelCidAttributeName, viewCidAttributeName */
var _fetch = Backbone.Collection.prototype.fetch,
    _set = Backbone.Collection.prototype.set,
    _replaceHTML = Thorax.View.prototype._replaceHTML,
    collectionCidAttributeName = 'data-collection-cid',
    collectionEmptyAttributeName = 'data-collection-empty',
    collectionElementAttributeName = 'data-collection-element',
    ELEMENT_NODE_TYPE = 1;

Thorax.Collection = Backbone.Collection.extend({
  model: Thorax.Model || Backbone.Model,
  initialize: function() {
    this.cid = _.uniqueId('collection');
    return Backbone.Collection.prototype.initialize.apply(this, arguments);
  },
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
  shouldFetch: function(options) {
    return options.fetch && !!getValue(this, 'url') && !this.isPopulated();
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
  set: function(models, options) {
    this._fetched = !!models;
    return _set.call(this, models, options);
  }
});

_.extend(Thorax.View.prototype, {
  getCollectionViews: function(collection) {
    return _.filter(this.children, function(child) {
      if (!(child instanceof Thorax.CollectionView)) {
        return false;
      }

      return !collection || (child.collection === collection);
    });
  },
  updateFilter: function(collection) {
    _.invoke(this.getCollectionViews(collection), 'updateFilter');
  }
});

Thorax.Collections = {};
createRegistryWrapper(Thorax.Collection, Thorax.Collections);

dataObject('collection', {
  set: 'setCollection',
  bindCallback: onSetCollection,
  defaultOptions: {
    render: undefined,    // Default to deferred rendering
    fetch: true,
    success: false,
    invalid: true,
    change: true          // Wether or not to re-render on model:change
  },
  change: onCollectionReset,
  $el: 'getCollectionElement',
  cidAttrName: collectionCidAttributeName
});

Thorax.CollectionView = Thorax.View.extend({
  _defaultTemplate: Handlebars.VM.noop,
  _collectionSelector: '[' + collectionElementAttributeName + ']',

  // preserve collection element if it was not created with {{collection}} helper
  _replaceHTML: function(html) {
    if (this.collection && this.getObjectOptions(this.collection) && this._renderCount) {
      var element;
      var oldCollectionElement = this._collectionElement;
      element = _replaceHTML.call(this, html);

      this._lookupCollectionElement();

      if (!oldCollectionElement.attr('data-view-cid')) {
        this._collectionElement.replaceWith(oldCollectionElement);
      }
    } else {
      var ret = _replaceHTML.call(this, html);
      this._lookupCollectionElement();

      return ret;
    }
  },

  render: function() {
    var shouldRender = this.shouldRender();

    Thorax.View.prototype.render.apply(this, arguments);
    if (!shouldRender) {
      this.renderCollection();
    }
  },

  //appendItem(model [,index])
  //appendItem(html_string, index)
  //appendItem(view, index)
  appendItem: function(model, index, options) {
    //empty item
    if (!model) {
      return;
    }
    var itemView,
        $el = this._collectionElement,
        collection = this.collection,

        filter = !options || options.filter == null || options.filter;

    //if index argument is a view
    index && index.el && (index = $el.children().indexOf(index.el) + 1);

    //if argument is a view, or html string
    if (model.el || _.isString(model)) {
      itemView = model;
      model = false;
    } else {
      index = index || collection.indexOf(model) || 0;
      // Using call here to avoid v8 prototype inline optimization bug that helper views
      // expose under Android 4.3 (at minimum)
      // https://twitter.com/kpdecker/status/422149634929082370
      itemView = this.renderItem.call(this, model, index);
    }

    if (itemView) {
      if (itemView.cid) {
        itemView.ensureRendered();
        this._addChild(itemView);
      }

      //if the renderer's output wasn't contained in a tag, wrap it in a div
      //plain text, or a mixture of top level text nodes and element nodes
      //will get wrapped
      if (_.isString(itemView) && !itemView.match(/^\s*</m)) {
        itemView = '<div>' + itemView + '</div>';
      }
      var itemElement = itemView.$el || $($.trim(itemView)).filter(function() {
        // Only output nodes. DOM || Fruit Loops
        return this.nodeType === ELEMENT_NODE_TYPE || this.type === 'tag';
      });

      if (model) {
        itemElement.attr(modelCidAttributeName, model.cid);
      }
      var previousModel = index > 0 ? collection.at(index - 1) : false;
      if (!previousModel) {
        $el.prepend(itemElement);
      } else {
        //use last() as appendItem can accept multiple nodes from a template
        var last = $el.children('[' + modelCidAttributeName + '="' + previousModel.cid + '"]').last();
        last.after(itemElement);
      }

      this.trigger('append', null, function($el) {
        $el.attr(modelCidAttributeName, model.cid);
      });

      if (!options || !options.silent) {
        this.trigger('rendered:item', this, collection, model, itemElement, index);
      }
      if (filter) {
        applyItemVisiblityFilter.call(this, model);
      }
    }
    return itemView;
  },

  // updateItem only useful if there is no item view, otherwise
  // itemView.render() provides the same functionality
  updateItem: function(model) {
    var $el = this._collectionElement,
        viewEl = $el.find('[' + modelCidAttributeName + '="' + model.cid + '"]');

    // NOP For views
    if (viewEl.attr(viewCidAttributeName)) {
      return;
    }

    this.removeItem(viewEl);
    this.appendItem(model);
  },

  removeItem: function(model) {
    var self = this,
        $viewEl = model;

    if (model.cid) {
      var $el = this._collectionElement;
      $viewEl = $el.find('[' + modelCidAttributeName + '="' + model.cid + '"]');
    }
    if (!$viewEl.length) {
      return false;
    }

    function cleanCid($viewEl) {
      var cid = $viewEl.attr(viewCidAttributeName),
          child = self.children[cid];
      if (child) {
        self._removeChild(child);
      }
    }

    $viewEl.find('[' + viewCidAttributeName + ']').each(function(i, el) {
      cleanCid($(el));
    });
    cleanCid($viewEl);

    $viewEl.detach();

    return true;
  },

  renderCollection: function() {
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
    } else {
      handleChangeFromNotEmptyToEmpty.call(this);
    }
  },
  emptyClass: 'empty',
  renderEmpty: function() {
    if (!this.emptyView) {
      assignView.call(this, 'emptyView', {
        extension: '-empty'
      });
    }
    if (!this.emptyTemplate && !this.emptyView) {
      assignTemplate.call(this, 'emptyTemplate', {
        extension: '-empty',
        required: false
      });
    }
    if (this.emptyView) {
      var viewOptions = {};
      if (this.emptyTemplate) {
        viewOptions.template = this.emptyTemplate;
      }
      var view = Thorax.Util.getViewInstance(this.emptyView, viewOptions);
      view.ensureRendered();
      return view;
    } else {
      return this.emptyTemplate && this.renderTemplate(this.emptyTemplate);
    }
  },
  renderItem: function(model, i) {
    if (!this.itemView) {
      assignView.call(this, 'itemView', {
        extension: '-item',
        required: false
      });
    }
    if (!this.itemTemplate && !this.itemView) {
      assignTemplate.call(this, 'itemTemplate', {
        extension: '-item',
        // only require an itemTemplate if an itemView
        // is not present
        required: !this.itemView
      });
    }
    if (this.itemView) {
      var viewOptions = {
        model: model
      };
      if (this.itemTemplate) {
        viewOptions.template = this.itemTemplate;
      }
      return Thorax.Util.getViewInstance(this.itemView, viewOptions);
    } else {
      // Using call here to avoid v8 prototype inline optimization bug that helper views
      // expose under Android 4.3 (at minimum)
      // https://twitter.com/kpdecker/status/422149634929082370
      return this.renderTemplate(this.itemTemplate, this.itemContext.call(this, model, i));
    }
  },
  itemContext: function(model /*, i */) {
    return model.attributes;
  },
  appendEmpty: function() {
    var $el = this._collectionElement;
    $el.empty();

    // Using call here to avoid v8 prototype inline optimization bug that helper views
    // expose under Android 4.3 (at minimum)
    // https://twitter.com/kpdecker/status/422149634929082370
    var emptyContent = this.renderEmpty.call(this);
    emptyContent && this.appendItem(emptyContent, 0, {
      silent: true,
      filter: false
    });
    this.trigger('rendered:empty', this, this.collection);
  },
  getCollectionElement: function() {
    return this._collectionElement;
  },
  _lookupCollectionElement: function() {
    var $collectionElement = this.$(this._collectionSelector);
    this._collectionElement = $collectionElement.length ? $collectionElement : this.$el;
  },

  updateFilter: function() {
    applyVisibilityFilter.call(this);
  }
});

Thorax.CollectionView.on({
  collection: {
    reset: onCollectionReset,
    sort: onCollectionReset,
    change: function(model) {
      var options = this.getObjectOptions(this.collection);
      if (options && options.change) {
        this.updateItem(model);
      }
      applyItemVisiblityFilter.call(this, model);
    },
    add: function(model) {
      var $el = this._collectionElement;
      if ($el.length) {
        if (this.collection.length === 1) {
          handleChangeFromEmptyToNotEmpty.call(this);
        }

        var index = this.collection.indexOf(model);
        this.appendItem(model, index);
      }
    },
    remove: function(model) {
      var $el = this._collectionElement;
      this.removeItem(model);
      this.collection.length === 0 && $el.length && handleChangeFromNotEmptyToEmpty.call(this);
    }
  }
});

Thorax.View.on({
  collection: {
    invalid: function(collection, message) {
      if (this.getObjectOptions(collection).invalid) {
        this.trigger('invalid', message, collection);
      }
    },
    error: function(collection, resp /*, options */) {
      this.trigger('error', resp, collection);
    }
  }
});

function onCollectionReset(collection) {
  // Undefined to force conditional render
  var options = this.getObjectOptions(collection) || undefined;
  if (this.shouldRender(options && options.render)) {
    this.renderCollection && this.renderCollection();
  }
}

// Even if the view is not a CollectionView
// ensureRendered() to provide similar behavior
// to a model
function onSetCollection(collection) {
  // Undefined to force conditional render
  var options = this.getObjectOptions(collection) || undefined;
  if (this.shouldRender(options && options.render)) {
    // Ensure that something is there if we are going to render the collection.
    this.ensureRendered();
  }
}

function applyVisibilityFilter() {
  if (this.itemFilter) {
    this.collection.forEach(applyItemVisiblityFilter, this);
  }
}

function applyItemVisiblityFilter(model) {
  var $el = this._collectionElement;
  this.itemFilter && $el.find('[' + modelCidAttributeName + '="' + model.cid + '"]')[itemShouldBeVisible.call(this, model) ? 'show' : 'hide']();
}

function itemShouldBeVisible(model) {
  // Using call here to avoid v8 prototype inline optimization bug that helper views
  // expose under Android 4.3 (at minimum)
  // https://twitter.com/kpdecker/status/422149634929082370
  return this.itemFilter.call(this, model, this.collection.indexOf(model));
}

function handleChangeFromEmptyToNotEmpty() {
  var $el = this._collectionElement;
  this.emptyClass && $el.removeClass(this.emptyClass);
  $el.removeAttr(collectionEmptyAttributeName);
  $el.empty();
}

function handleChangeFromNotEmptyToEmpty() {
  var $el = this._collectionElement;
  this.emptyClass && $el.addClass(this.emptyClass);
  $el.attr(collectionEmptyAttributeName, true);
  this.appendEmpty();
}

//$(selector).collection() helper
$.fn.collection = function(view) {
  if (view && view.collection) {
    return view.collection;
  }
  var $this = $(this),
      collectionElement = $this.closest('[' + collectionCidAttributeName + ']'),
      collectionCid = collectionElement && collectionElement.attr(collectionCidAttributeName);
  if (collectionCid) {
    view = $this.view();
    if (view) {
      return view.collection;
    }
  }
  return false;
};
