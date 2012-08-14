(function() {

  var root = this,
      Backbone = root.Backbone,
      Handlebars = root.Handlebars,
      Thorax = root.Thorax,
      _ = root._,
      $ = root.$,
      _fetch = Backbone.Collection.prototype.fetch,
      _reset = Backbone.Collection.prototype.reset,
      _configure = Thorax.View.prototype._configure,
      _on = Thorax.View.prototype.on,
      _extend = Thorax.View.extend,
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
  
  Thorax.Util.createRegistry(Thorax, '_collections', 'collection', 'Collection');

  function addEvents(target, source) {
    _.each(source, function(callback, eventName) {
      if (_.isArray(callback)) {
        callback.forEach(function(cb) {
          target.push([eventName, cb]);
        }, this);
      } else {
        target.push([eventName, callback]);
      }
    });
  }

  function generateOnWrapper(parent) {
    return function(eventName, callback) {
      if (eventName === 'collection' && typeof callback === 'object') {
        addEvents(this._collectionEvents, callback);
      } else {
        return parent.apply(this, arguments);
      }
    }
  }

  _.extend(Thorax.View, {
    _collectionEvents: [],
    on: generateOnWrapper(Thorax.View.on),
    extend: function() {
      var child = _extend.apply(this, arguments);
      Thorax.Util._cloneEvents(this, child, '_collectionEvents');
      return child;
    }
  });

  _.extend(Thorax.View.prototype, {
    on: generateOnWrapper(Thorax.View.prototype.on),
    _configure: function(options) {
      this._collectionEvents = [];
      return _configure.call(this, options);
    }
  });

  Thorax.CollectionView = Thorax.HelperView.extend({
    _setCollectionOptions: function(collection, options) {
      return _.extend({
        fetch: true,
        success: false,
        errors: true
      }, options || {});
    },
    _bindCollection: function(collection) {
      this.collection = collection;
      if (collection) {
        collection.cid = collection.cid || _.uniqueId('collection');
        this.$el.attr(collectionCidAttributeName, collection.cid);
        if (collection.name) {
          this.$el.attr(collectionNameAttributeName, collection.name);
        }
        this.options = this._setCollectionOptions(collection, this.options);
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
        //if we rendered with item views model changes will be observed
        //by the generated item view but if we rendered with templates
        //then model changes need to be bound as nothing is watching
        if (!this.options['item-view']) {
          this.on(collection, 'change', function(model) {
            this.$el.find('[' + modelCidAttributeName + '="' + model.cid +'"]').remove();
            this.appendItem(model, collection.indexOf(model));
          }, this);
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
            if (!this.options.filter || this.options.filter &&
              (typeof this.options.filter === 'string'
                  ? this.parent[this.options.filter]
                  : this.options.filter).call(this.parent, item, i)
              ) {
              this.appendItem(item, i);
            }
          }, this);
        }
        this.parent.trigger('rendered:collection', this, this.collection);
      }
      ++this._renderCount;
    },
    renderEmpty: function() {
      var context = (this.emptyContext && this.emptyContext()) || {};
      if (this.options['empty-view']) {
        var view = Thorax.Util.getViewInstance(this.options['empty-view'], context);
        if (this.options['empty-template']) {
          view.render(this.renderTemplate(this.options['empty-template'], context));
        } else {
          view.render();
        }
        return view;
      } else {
        var emptyTemplate = this.options['empty-template'] || (this.parent.name && this._loadTemplate(this.parent.name + '-empty', true));
        return emptyTemplate && this.renderTemplate(emptyTemplate, context);
      }
    },
    renderItem: function(model, i) {
      if (this.options['item-view']) {
        var viewOptions = {
          model: model
        };
        //itemContext deprecated
        if (this.itemContext) {
          viewOptions.context = this.itemContext;
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
        return this.renderTemplate(itemTemplate, (this.itemContext && this.itemContext(model, i)) || model.attributes);
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

  function bindCollectionEvents(collection, events) {
    events.forEach(function(event) {
      this.on(collection, event[0], function() {
        return event[1].apply(this, arguments);
      }, this);
    }, this);
  }

  Thorax.View.on({
    collection: {
      add: function(model, collection) {
        if (collection.length === 1) {
          if(this.$el.length) {
            this.$el.removeAttr(collectionEmptyAttributeName);
            this.$el.empty();
          }
        }
        if (this.$el.length) {
          var index = collection.indexOf(model);
          if (!this.options.filter || this.options.filter &&
            (typeof this.options.filter === 'string'
                ? this.parent[this.options.filter]
                : this.options.filter).call(this.parent, model, index)
            ) {
            this.appendItem(model, index);
          }
        }
      },
      remove: function(model, collection) {
        this.$el.find('[' + modelCidAttributeName + '="' + model.cid + '"]').remove();
        for (var cid in this.children) {
          if (this.children[cid].model && this.children[cid].model.cid === model.cid) {
            this.children[cid].destroy();
            delete this.children[cid];
            break;
          }
        }
        if (collection.length === 0) {
          if (this.$el.length) {
            this.$el.attr(collectionEmptyAttributeName, true);
            this.appendEmpty();
          }
        }
      },
      reset: function(collection) {
        this.reset();
      },
      error: function(message) {
        if (this.options.errors) {
          this.trigger('error', message);
          this.parent.trigger('error', message);
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
      _.extend(view.options, {
        'item-template': view.template && view.template !== Handlebars.VM.noop ? view.template : view.options['item-template'],
        'empty-template': view.inverse && view.inverse !== Handlebars.VM.noop ? view.inverse : view.options['empty-template'],
        'item-view': view.options['item-view'],
        'empty-view': view.options['empty-view'],
        filter: view.options['filter']
      });
      view._bindCollection(collection);
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

})();