Thorax.CollectionHelperView = Thorax.CollectionView.extend({
  // Forward render events to the parent
  events: {
    'rendered:item': forwardRenderEvent('rendered:item'),
    'rendered:collection': forwardRenderEvent('rendered:collection'),
    'rendered:empty': forwardRenderEvent('rendered:empty')
  },

  constructor: function(options) {
    _.each(collectionOptionNames, function(viewAttributeName, helperOptionName) {
      if (options.options[helperOptionName]) {
        var value = options.options[helperOptionName];
        if (viewAttributeName === 'itemTemplate' || viewAttributeName === 'emptyTemplate') {
          value = Thorax.Util.getTemplate(value);
        }
        options[viewAttributeName] = value;
      }
    });
    // Handlebars.VM.noop is passed in the handlebars options object as
    // a default for fn and inverse, if a block was present. Need to
    // check to ensure we don't pick the empty / null block up.
    if (!options.itemTemplate && options.template && options.template !== Handlebars.VM.noop) {
      options.itemTemplate = options.template;
      options.template = Handlebars.VM.noop;
    }
    if (!options.emptyTemplate && options.inverse && options.inverse !== Handlebars.VM.noop) {
      options.emptyTemplate = options.inverse;
      options.inverse = Handlebars.VM.noop;
    }
    var response = Thorax.HelperView.call(this, options);
    if (this.parent.name) {
      if (!this.emptyTemplate) {
        this.emptyTemplate = Thorax.Util.getTemplate(this.parent.name + '-empty', true);
      }
      if (!this.itemTemplate) {
        // item template must be present if an itemView is not
        this.itemTemplate = Thorax.Util.getTemplate(this.parent.name + '-item', !!this.itemView);
      }
    }

    return response;
  },
  setAsPrimaryCollectionHelper: function() {
    _.each(forwardableProperties, function(propertyName) {
      forwardMissingProperty.call(this, propertyName);
    }, this);
    if (this.parent.itemFilter && !this.itemFilter) {
      this.itemFilter = function() {
        return this.parent.itemFilter.apply(this.parent, arguments);
      };
    }
    if (this.parent.itemContext) {
      this.itemContext = function() {
        return this.parent.itemContext.apply(this.parent, arguments);
      };
    }
  }
});

_.extend(Thorax.CollectionHelperView.prototype, helperViewPrototype);

var collectionOptionNames = {
  'item-template': 'itemTemplate',
  'empty-template': 'emptyTemplate',
  'item-view': 'itemView',
  'empty-view': 'emptyView',
  'empty-class': 'emptyClass'
};

function forwardRenderEvent(eventName) {
  return function() {
    var args = _.toArray(arguments);
    args.unshift(eventName);
    this.parent.trigger.apply(this.parent, args);
  }
}

var forwardableProperties = [
  'itemTemplate',
  'itemView',
  'emptyTemplate',
  'emptyView'
];

function forwardMissingProperty(propertyName) {
  var parent = getParent(this);
  if (!this[propertyName]) {
    var prop = parent[propertyName];
    if (prop){
      this[propertyName] = prop;
    }
  }
}

Handlebars.registerViewHelper('collection', Thorax.CollectionHelperView, function(collection, view) {
  if (arguments.length === 1) {
    view = collection;
    collection = view.parent.collection;
    collection && view.setAsPrimaryCollectionHelper();
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
  collection && view.setCollection(collection);
});

Handlebars.registerHelper('collection-element', function(options) {
  if (!getOptionsData(options).view.renderCollection) {
    throw new Error("collection-element helper must be declared inside of a CollectionView");
  }
  var hash = options.hash;
  normalizeHTMLAttributeOptions(hash);
  hash.tagName = hash.tagName || 'div';
  hash[collectionElementAttributeName] = true;
  return new Handlebars.SafeString(Thorax.Util.tag.call(this, hash, '', this));
});
