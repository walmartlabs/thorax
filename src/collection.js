/*global
    $serverSide,
    assignView, assignTemplate, createRegistryWrapper, dataObject, filterAncestors, getValue,
    modelCidAttributeName, modelIdAttributeName, viewCidAttributeName,
    Deferrable
*/
var _fetch = Backbone.Collection.prototype.fetch,
    _set = Backbone.Collection.prototype.set,
    _replaceHTML = Thorax.View.prototype._replaceHTML,
    collectionCidAttributeName = 'data-collection-cid',
    collectionEmptyAttributeName = 'data-collection-empty',
    collectionElementAttributeName = 'data-collection-element',
    ELEMENT_NODE_TYPE = 1;

Thorax.Collection = Backbone.Collection.extend({
  model: Thorax.Model || Backbone.Model,
  initialize: function(models, options) {
    this.cid = _.uniqueId('collection');
    return Backbone.Collection.prototype.initialize.call(this, models, options);
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
    options.success = function(collection, response, options) {
      collection._fetched = true;
      success && success(collection, response, options);
    };
    return _fetch.call(this, options);
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

  render: function(output, callback) {
    if (!this.shouldRender()) {
      var self = this;
      this.once('append', function(scope, _callback, deferrable) {
        deferrable.chain(function(next) {
          self.renderCollection(next);
        });
      });
    }

    return Thorax.View.prototype.render.call(this, output, callback);
  },

  restore: function(el, forceRerender) {
    this._forceRerender = forceRerender;
    Thorax.View.prototype.restore.call(this, el);
  },
  restoreCollection: function() {
    // This is called as an event so we don't force render our content when there are nested
    // child views.
    var self = this,
        children = this.$el.children(),
        toRemove = [],
        restored = 0;

    this._lookupCollectionElement();

    // Find any items annotated with server info and restore. Else rerender
    this.$('[' + modelIdAttributeName + ']').each(filterAncestors(self, function() {
      var id = this.getAttribute(modelIdAttributeName),
          model = self.collection.get(id);

      if (!model) {
        toRemove.push(this);
      } else {
        self.restoreItem(model, children.index(this), this, self._forceRerender);
        restored++;
      }
    }));

    var removeEmpty;
    this.$('[data-view-empty]').each(filterAncestors(self, function() {
      if (!self.collection.length) {
        self.restoreEmpty(this, self._forceRerender);
      } else {
        removeEmpty = true;
      }
    }));

    var needsRender = (restored !== this.collection.length) || toRemove.length || removeEmpty;
    if (needsRender && this.collection.isPopulated()) {
      // Kill off any now invalid nodes
      _.each(toRemove, function(el) {
        el.parentNode.removeChild(el);

        self.trigger('restore:fail', {
          type: 'collection-remove',
          element: el
        });
      });

      if (removeEmpty || !this.collection.length) {
        // Complete mismatch on expectations for empty state, etc. Rerender the entierty of the
        // content to be safe.
        this.renderCollection();

        self.trigger('restore:fail', {
          type: removeEmpty ? 'collection-empty-found' : 'collection-empty-missing'
        });
      } else {
        // Render anything that we might have locally but was missed
        var $el = this._collectionElement;
        this.collection.each(function(model) {
          if (!$el.find('[' + modelCidAttributeName + '="' + model.cid + '"]').length) {
            self.appendItem(model);

            self.trigger('restore:fail', {
              type: 'collection-missing',
              model: model
            });
          }
        });
      }
    } else if (needsRender) {
      this._pendingRestore = true;
      return;
    }

    this.trigger('restore:collection', this, this.el);
  },

  //appendItem(model [,index])
  //appendItem(html_string, index)
  //appendItem(view, index)
  appendItem: function(model, index, options, append, callback) {
    //empty item
    if (!model) {
      return;
    }
    var itemView,
        $el = this._collectionElement,
        collection = this.collection,

        filter = !options || options.filter == null || options.filter;

    //if index argument is a view
    if (index && index.el) {
      index = $el.children().indexOf(index.el) + 1;
    }

    //if argument is a view, or html string
    if (model.el || _.isString(model)) {
      itemView = model;
      model = false;
    } else {
      index = index != null ? index : (collection.indexOf(model) || 0);

      // Using call here to avoid v8 prototype inline optimization bug that helper views
      // expose under Android 4.3 (at minimum)
      // https://twitter.com/kpdecker/status/422149634929082370
      itemView = this.renderItem.call(this, model, index);
    }

    if (itemView) {
      if (itemView.cid) {
        this._addChild(itemView);
        itemView.ensureRendered();
      }

      //if the renderer's output wasn't contained in a tag, wrap it in a div
      //plain text, or a mixture of top level text nodes and element nodes
      //will get wrapped
      if (_.isString(itemView) && !/^\s*</m.test(itemView)) {
        itemView = '<div>' + itemView + '</div>';
      }
      var itemElement = itemView.$el || $($.trim(itemView)).filter(function() {
        // Only output nodes. DOM || Fruit Loops
        return this.nodeType === ELEMENT_NODE_TYPE || this.type === 'tag';
      });

      if (model) {
        itemElement.attr({
          'data-model-id': model.id,
          'data-model-cid': model.cid
        });
      }

      if (append) {
        $el.append(itemElement);
      } else {
        var previousModel = index > 0 ? collection.at(index - 1) : false;
        if (!previousModel) {
          $el.prepend(itemElement);
        } else {
          //use last() as appendItem can accept multiple nodes from a template
          var last = $el.children('[' + modelCidAttributeName + '="' + previousModel.cid + '"]').last();
          last.after(itemElement);
        }
      }

      this.triggerDeferrable('append', null, function($el) {
        $el.attr({
          'data-model-cid': model.cid,
          'data-model-id': model.id,
        });
      },
      callback);

      if (!options || !options.silent) {
        this.trigger('rendered:item', this, collection, model, itemElement, index);
      }
      if (filter) {
        applyItemVisiblityFilter(this, model);
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

  renderCollection: function(callback) {
    var deferrable = new Deferrable(callback),
        self = this;

    if (self.collection) {
      if (self.collection.isEmpty()) {
        deferrable.exec(function() {
          handleChangeFromNotEmptyToEmpty(self);
        });
      } else if (self._pendingRestore) {
        // If we had to delay the initial restore due to the local data set being loaded, then
        // we want to resume that operation where it left off.
        self._pendingRestore = false;
        self.restoreCollection(self._forceRerender);
      } else {
        deferrable.exec(function() {
          handleChangeFromEmptyToNotEmpty(self);
        });

        _.each(self.collection.models, function(item, i) {
          deferrable.chain(function(next) {
            self.appendItem(item, i, undefined, true, next);
          });
        });
      }
      deferrable.exec(function() {
        self.trigger('rendered:collection', self, self.collection);
      });
    } else {
      deferrable.exec(function() {
        handleChangeFromNotEmptyToEmpty(self);
      });
    }

    deferrable.run();
  },
  emptyClass: 'empty',
  renderEmpty: function() {
    if (!this.emptyView) {
      assignView(this, 'emptyView', {
        extension: '-empty'
      });
    }
    if (!this.emptyTemplate && !this.emptyView) {
      assignTemplate(this, 'emptyTemplate', {
        extension: '-empty',
        required: false
      });
    }
    if (this.emptyView) {
      var viewOptions = {};
      if (this.emptyTemplate) {
        viewOptions.template = this.emptyTemplate;
      }
      return Thorax.Util.getViewInstance(this.emptyView, viewOptions);
    } else {
      return this.emptyTemplate && this.renderTemplate(this.emptyTemplate);
    }
  },
  restoreEmpty: function(el, forceRerender) {
    var child = this.renderEmpty();

    child.restore(el, forceRerender);
    this._addChild(child);

    this.trigger('restore:empty', this, el);

    return child;
  },

  renderItem: function(model, i) {
    if (!this.itemView) {
      assignView(this, 'itemView', {
        extension: '-item',
        required: false
      });
    }
    if (!this.itemTemplate && !this.itemView) {
      assignTemplate(this, 'itemTemplate', {
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
  restoreItem: function(model, i, el, forceRerender) {
    // Associate the element with the proper model.
    el.setAttribute(modelCidAttributeName, model.cid);

    // If we are dealing with something other than a template then reinstantiate the view.
    if (this.itemView || this.renderItem !== Thorax.CollectionView.prototype.renderItem) {
      var child = this.renderItem(model, i);

      // If we are passed a string assume that the upstream implementation has a consistent
      // rendering.
      if (!_.isString(child)) {
        child.restore(el, forceRerender);
        this._addChild(child);
      }
    }

    this.trigger('restore:item', this, el);
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
    if (emptyContent && emptyContent.$el) {
      emptyContent.$el.attr('data-view-empty', 'true');
    }
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
    var $collectionElement = this.$(this._collectionSelector).filter(filterAncestors(this, function() { return true; }));
    this._collectionElement = $collectionElement.length ? $collectionElement : this.$el;
  },

  updateFilter: function() {
    var view = this;
    if (view.itemFilter) {
      _.each(view.collection.models, function(model) {
        applyItemVisiblityFilter(view, model);
      });
    }
  }
});

Thorax.CollectionView.on({
  restore: 'restoreCollection',

  collection: {
    'reset': function(collection) {
      onCollectionReset(this, collection);
    },
    'sort': function(collection) {
      onCollectionReset(this, collection);
    },
    change: function(model) {
      var options = this.getObjectOptions(this.collection);
      if (options && options.change) {
        this.updateItem(model);
      }
      applyItemVisiblityFilter(this, model);
    },
    add: function(model) {
      var $el = this._collectionElement;
      if ($el.length) {
        if (this.collection.length === 1) {
          handleChangeFromEmptyToNotEmpty(this);
        }

        var index = this.collection.indexOf(model);
        this.appendItem(model, index);
      }
    },
    remove: function(model) {
      var $el = this._collectionElement;
      this.removeItem(model);

      if (this.collection.length === 0 && $el.length) {
        handleChangeFromNotEmptyToEmpty(this);
      }
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

function onCollectionReset(view, collection) {
  // Undefined to force conditional render
  var options = view.getObjectOptions(collection) || undefined;
  if (view.shouldRender(options && options.render)) {
    view.renderCollection && view.renderCollection();
  }
}

// Even if the view is not a CollectionView
// ensureRendered() to provide similar behavior
// to a model
function onSetCollection(view, collection) {
  // Undefined to force conditional render
  var options = view.getObjectOptions(collection) || undefined;
  if (view.shouldRender(options && options.render)) {
    // Ensure that something is there if we are going to render the collection.
    view.ensureRendered();
  }
}

function applyItemVisiblityFilter(view, model) {
  var $el = view._collectionElement;
  view.itemFilter && $el.find('[' + modelCidAttributeName + '="' + model.cid + '"]')[itemShouldBeVisible(view, model) ? 'show' : 'hide']();
}

function itemShouldBeVisible(view, model) {
  // Using call here to avoid v8 prototype inline optimization bug that helper views
  // expose under Android 4.3 (at minimum)
  // https://twitter.com/kpdecker/status/422149634929082370
  return view.itemFilter.call(view, model, view.collection.indexOf(model));
}

function handleChangeFromEmptyToNotEmpty(view) {
  var $el = view._collectionElement;
  view.emptyClass && $el.removeClass(view.emptyClass);
  $el.removeAttr(collectionEmptyAttributeName);
  $el.empty();
}

function handleChangeFromNotEmptyToEmpty(view) {
  var $el = view._collectionElement;
  view.emptyClass && $el.addClass(view.emptyClass);
  $el.attr(collectionEmptyAttributeName, true);
  view.appendEmpty();
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
