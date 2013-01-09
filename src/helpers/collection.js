Thorax.CollectionHelperView = Thorax.HelperView.extend({
  // Forward render events to the parent
  events: {
    'rendered:item': forwardRenderEvent('rendered:item'),
    'rendered:collection': forwardRenderEvent('rendered:collection'),
    'rendered:empty': forwardRenderEvent('rendered:empty')
  },
  constructor: function(options) {
    var response = Thorax.CollectionHelperView.__super__.constructor.call(this, options);
    if (this.parent.name) {
      if (!this.emptyTemplate) {
        this.emptyTemplate = Thorax.Util.getTemplate(this.parent.name + '-empty', true);
      }
      if (!this.itemTemplate) {
        this.itemTemplate = Thorax.Util.getTemplate(this.parent.name + '-item', true);
      }
    }
    return response;
  },
  setAsPrimaryCollectionHelper: function(collection) {
    this.$el.attr(primaryCollectionAttributeName, collection.cid);
    _.each(forwardableProperties, function(propertyName) {
      forwardMissingProperty.call(this, propertyName);
    }, this);
  }
});

Thorax.CollectionHelperView.modifyClassAttributes = function(classAttrs) {
  _.each(collectionOptionNames, function(viewAttributeName, helperOptionName) {
    if (classAttrs.options[helperOptionName]) {
      var value = classAttrs.options[helperOptionName];
      if (viewAttributeName === 'itemTemplate' || viewAttributeName === 'emptyTemplate') {
        value = Thorax.Util.getTemplate(value);
      }
      classAttrs[viewAttributeName] = value;
    }
  });
  // Handlebars.VM.noop is passed in the handlebars options object as
  // a default for fn and inverse, if a block was present. Need to
  // check to ensure we don't pick the empty / null block up.
  if (!classAttrs.itemTemplate && classAttrs.template && classAttrs.template !== Handlebars.VM.noop) {
    classAttrs.itemTemplate = classAttrs.template;
    classAttrs.template = Handlebars.VM.noop;
  }
  if (!classAttrs.emptyTemplate && classAttrs.inverse && classAttrs.inverse !== Handlebars.VM.noop) {
    classAttrs.emptyTemplate = classAttrs.inverse;
    classAttrs.inverse = Handlebars.VM.noop;
  }
  !classAttrs.template && (classAttrs.template = Handlebars.VM.noop);
  return classAttrs;
};

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
  'itemContext',
  'itemFilter',
  'itemTemplate',
  'itemView',
  'emptyTemplate',
  'emptyView'
];

function forwardMissingProperty(methodName, force) {
  if (!this[methodName] || force) {
    var method = getParent(this)[methodName];
    if (method){
      this[methodName] = method;
    }
  }
}

Handlebars.registerViewHelper('collection', Thorax.CollectionHelperView, function(collection, view) {
  if (arguments.length === 1) {
    view = collection;
    collection = view.declaringView.collection;
  }
  // Need additional check here to see if it is the
  // primary collection as templates can do:
  // #collection this.collection
  if (collection && collection === view.declaringView.collection) {
    ensureDataObjectCid('collection', collection);
    view.setAsPrimaryCollectionHelper(collection);
  }
  collection && view.set('collection', collection);
});

Handlebars.registerHelper('collection-element', function(options) {
  options.hash.tag = options.hash.tag || options.hash.tagName || 'div';
  options.hash[collectionElementAttributeName] = true;
  return new Handlebars.SafeString(Thorax.Util.tag.call(this, options.hash, '', this));
});
