/* global
    $serverSide,
    collectionElementAttributeName, createErrorMessage, getParent,
    helperViewPrototype, normalizeHTMLAttributeOptions,
    viewRestoreAttribute
*/

Thorax.CollectionHelperView = Thorax.CollectionView.extend({
  // Forward render events to the parent
  events: {
    'rendered:collection': forwardRenderEvent('rendered:collection'),
    'rendered:item': function(view, collection, model, itemEl, index) {
      this.parent.trigger('rendered:item', view, collection, model, itemEl, index);
    },
    'rendered:empty': forwardRenderEvent('rendered:empty'),
    'restore:collection': forwardRenderEvent('restore:collection'),
    'restore:item': forwardRenderEvent('restore:item'),
    'restore:empty': forwardRenderEvent('restore:empty')
  },

  // Thorax.CollectionView allows a collectionSelector
  // to be specified, disallow in a collection helper
  // as it will cause problems when neseted
  getCollectionElement: function() {
    return this.$el;
  },

  constructor: function(options) {
    var restorable = true;

    // need to fetch templates if template name was passed
    if (options.options['item-template']) {
      options.itemTemplate = Thorax.Util.getTemplate(options.options['item-template']);
    }
    if (options.options['empty-template']) {
      options.emptyTemplate = Thorax.Util.getTemplate(options.options['empty-template']);
    }

    // Handlebars.VM.noop is passed in the handlebars options object as
    // a default for fn and inverse, if a block was present. Need to
    // check to ensure we don't pick the empty / null block up.
    if (!options.itemTemplate && options.template && options.template !== Handlebars.VM.noop) {
      options.itemTemplate = options.template;
      options.template = Handlebars.VM.noop;

      // We can not restore if the item has a depthed reference, ../foo, so we need to
      // force a rerender on the client-side
      if (options.itemTemplate.depth) {
        restorable = false;
      }
    }
    if (!options.emptyTemplate && options.inverse && options.inverse !== Handlebars.VM.noop) {
      options.emptyTemplate = options.inverse;
      options.inverse = Handlebars.VM.noop;

      if (options.emptyTemplate.depth) {
        restorable = false;
      }
    }

    var shouldBindItemContext = _.isFunction(options.itemContext),
        shouldBindItemFilter = _.isFunction(options.itemFilter);

    var response = Thorax.HelperView.call(this, options);
    
    if (shouldBindItemContext) {
      this.itemContext = _.bind(this.itemContext, this.parent);
    } else if (_.isString(this.itemContext)) {
      this.itemContext = _.bind(this.parent[this.itemContext], this.parent);
    }

    if (shouldBindItemFilter) {
      this.itemFilter = _.bind(this.itemFilter, this.parent);
    } else if (_.isString(this.itemFilter)) {
      this.itemFilter = _.bind(this.parent[this.itemFilter], this.parent);
    }

    if (this.parent.name) {
      if (!this.emptyView && !this.parent.renderEmpty) {
        this.emptyView = Thorax.Util.getViewClass(this.parent.name + '-empty', true);
      }
      if (!this.emptyTemplate && !this.parent.renderEmpty) {
        this.emptyTemplate = Thorax.Util.getTemplate(this.parent.name + '-empty', true);
      }
      if (!this.itemView && !this.parent.renderItem) {
        this.itemView = Thorax.Util.getViewClass(this.parent.name + '-item', true);
      }
      if (!this.itemTemplate && !this.parent.renderItem) {
        // item template must be present if an itemView is not
        this.itemTemplate = Thorax.Util.getTemplate(this.parent.name + '-item', !!this.itemView);
      }
    }

    if ($serverSide && !restorable) {
      this.$el.attr(viewRestoreAttribute, 'false');

      this.trigger('restore:fail', {
        type: 'serialize',
        view: this,
        err: 'collection-depthed-query'
      });
    }

    return response;
  },
  setAsPrimaryCollectionHelper: function() {
    var self = this,
        parent = self.parent;
    _.each(forwardableProperties, function(propertyName) {
      forwardMissingProperty(self, propertyName);
    });

    _.each(['itemFilter', 'itemContext', 'renderItem', 'renderEmpty'], function(propertyName) {
      if (parent[propertyName]) {
        self[propertyName] = function(thing1, thing2) {
          return parent[propertyName](thing1, thing2);
        };
      }
    });
  }
});

_.extend(Thorax.CollectionHelperView.prototype, helperViewPrototype);


Thorax.CollectionHelperView.attributeWhiteList = {
  'item-context': 'itemContext',
  'item-filter': 'itemFilter',
  'item-template': 'itemTemplate',
  'empty-template': 'emptyTemplate',
  'item-view': 'itemView',
  'empty-view': 'emptyView',
  'empty-class': 'emptyClass'
};

function forwardRenderEvent(eventName) {
  return function(thing1, thing2) {
    this.parent.trigger(eventName, thing1, thing2);
  };
}

var forwardableProperties = [
  'itemTemplate',
  'itemView',
  'emptyTemplate',
  'emptyView'
];

function forwardMissingProperty(view, propertyName) {
  var parent = getParent(view);
  if (!view[propertyName]) {
    var prop = parent[propertyName];
    if (prop){
      view[propertyName] = prop;
    }
  }
}

Handlebars.registerViewHelper('collection', Thorax.CollectionHelperView, function(collection, view) {
  if (arguments.length === 1) {
    view = collection;
    collection = view.parent.collection;

    if (collection) {
      view.setAsPrimaryCollectionHelper();
    }
    view.$el.attr(collectionElementAttributeName, 'true');
    // propagate future changes to the parent's collection object
    // to the helper view
    view.listenTo(view.parent, 'change:data-object', function(type, dataObject) {
      if (type === 'collection') {
        view.setAsPrimaryCollectionHelper();
        view.setCollection(dataObject);
      }
    });
  }
  if (collection) {
    view.setCollection(collection);
  }
});

Handlebars.registerHelper('collection-element', function(options) {
  if (!options.data.view.renderCollection) {
    throw new Error(createErrorMessage('collection-element-helper'));
  }
  var hash = options.hash;
  normalizeHTMLAttributeOptions(hash);
  hash.tagName = hash.tagName || 'div';
  hash[collectionElementAttributeName] = true;
  return new Handlebars.SafeString(Thorax.Util.tag.call(this, hash, '', this));
});
