(function(outerScope){
  if (typeof this.$ === 'undefined') {
    throw new Error('jquery.js/zepto.js required to run Thorax');
  } else {
    if (!$.fn.forEach) {
      // support jquery/zepto iterators
      $.fn.forEach = $.fn.each;
     }
  }

  if (typeof this._ === 'undefined') {
    throw new Error('Underscore.js required to run Thorax');
  }

  if (typeof this.Backbone === 'undefined') {
    throw new Error('Backbone.js required to run Thorax');
  }

  var TemplateEngine = {
    extension: 'handlebars',
    safeString: function(string) {
      return new Handlebars.SafeString(string);
    },
    registerHelper: function(name, callback) {
      return Handlebars.registerHelper(name, callback);
    }
  };
  TemplateEngine.extensionRegExp = new RegExp('\\.' + TemplateEngine.extension + '$');

  var Thorax, scope, templatePathPrefix;

  this.Thorax = Thorax = {
    configure: function(options) {
      scope = (options && options.scope) || (typeof exports !== 'undefined' && exports);

      if (!scope) {
        scope = outerScope.Application = {};
      }

      _.extend(scope, Backbone.Events, {
        templates: {},
        Views: {},
        Mixins: {},
        Models: {},
        Collections: {},
        Routers: {}
      });

      templatePathPrefix = options && typeof options.templatePathPrefix !== 'undefined' ? options.templatePathPrefix : '';
      
      Backbone.history || (Backbone.history = new Backbone.History);

      scope.layout = new Thorax.Layout({
        el: options && options.layout || '.layout'
      });

    },
    //used by "template" and "view" template helpers, not thread safe though it shouldn't matter in browser land
    _currentTemplateContext: false
  };

  //private vars for Thorax.View
  var view_name_attribute_name = 'data-view-name',
      view_cid_attribute_name = 'data-view-cid',
      view_placeholder_attribute_name = 'data-view-tmp',
      model_cid_attribute_name = 'data-model-cid',
      collection_cid_attribute_name = 'data-collection-cid',
      default_collection_selector = '[' + collection_cid_attribute_name + ']',
      old_backbone_view = Backbone.View,
      //android scrollTo(0, 0) shows url bar, scrollTo(0, 1) hides it
      minimumScrollYOffset = (navigator.userAgent.toLowerCase().indexOf("android") > -1) ? 1 : 0,
      ELEMENT_NODE_TYPE = 1;

  //wrap Backbone.View constructor to support initialize event
  Backbone.View = function(options) {
    this._childEvents = [];
    this.cid = _.uniqueId('view');
    this._configure(options || {});
    this._ensureElement();
    this.delegateEvents();
    this.trigger('initialize:before', options);
    this.initialize.apply(this, arguments);
    this.trigger('initialize:after', options);
  };

  Backbone.View.prototype = old_backbone_view.prototype;
  Backbone.View.extend = old_backbone_view.extend;

  Thorax.View = Backbone.View.extend({
    _configure: function(options) {
      //this.options is removed in Thorax.View, we merge passed
      //properties directly with the view and template context
      _.extend(this, options || {});
            
      //will be called again by Backbone.View(), after _configure() is complete but safe to call twice
      this._ensureElement();

      //model and collection events
      bindModelAndCollectionEvents.call(this, this.constructor.events);
      if (this.events) {
        bindModelAndCollectionEvents.call(this, this.events);
      }

      //mixins
      for (var i = 0; i < this.constructor.mixins.length; ++i) {
        applyMixin.call(this, this.constructor.mixins[i]);
      }
      if (this.mixins) {
        for (var i = 0; i < this.mixins.length; ++i) {
          applyMixin.call(this, this.mixins[i]);
        }
      }

      //views
      this._views = {};
      if (this.views) {
        for (var local_name in this.views) {
          if (_.isArray(this.views[local_name])) {
            this[local_name] = this.view.apply(this, this.views[local_name]);
          } else {
            this[local_name] = this.view(this.views[local_name]);
          }
        }
      }
    },

    _ensureElement : function() {
      Backbone.View.prototype._ensureElement.call(this);
      (this.el[0] || this.el).setAttribute(view_name_attribute_name, this.name || this.cid);
      (this.el[0] || this.el).setAttribute(view_cid_attribute_name, this.cid);      
    },

    mixin: function(name) {
      if (!this._appliedMixins) {
        this._appliedMixins = [];
      }
      if (this._appliedMixins.indexOf(name) == -1) {
        this._appliedMixins.push(name);
        if (typeof name === 'function') {
          name.call(this);
        } else {
          var mixin = scope.Mixins[name];
          _.extend(this, mixin[1]);
          //mixin callback may be an array of [callback, arguments]
          if (_.isArray(mixin[0])) {
            mixin[0][0].apply(this, mixin[0][1]);
          } else {
            mixin[0].apply(this, _.toArray(arguments).slice(1));
          }
        }
      }
    },
  
    view: function(name, options) {
      var instance;
      if (typeof name === 'object' && name.hash && name.hash.name) {
        // named parameters
        options = name.hash;
        name = name.hash.name;
        delete options.name;
      }

      if (typeof name === 'string') {
        if (!scope.Views[name]) {
          throw new Error('view: ' + name + ' does not exist.');
        }
        instance = new scope.Views[name](options);
      } else {
        instance = name;
      }
      this._views[instance.cid] = instance;
      this._childEvents.forEach(function(params) {
        params = _.clone(params);
        if (!params.parent) {
          params.parent = this;
        }
        instance._addEvent(params);
      }, this);
      return instance;
    },
    
    template: function(file, data, ignoreErrors) {
      Thorax._currentTemplateContext = this;
      
      var view_context = {};
      for (var key in this) {
        if (typeof this[key] !== 'function') {
          view_context[key] = this[key];
        }
      }
      data = _.extend({}, view_context, data || {}, {
        cid: _.uniqueId('t')
      });

      var template = this.loadTemplate(file, data, scope);
      if (!template) {
        if (ignoreErrors) {
          return ''
        } else {
          throw new Error('Unable to find template ' + file);
        }
      } else {
        return template(data);
      }
    },

    loadTemplate: function(file, data, scope) {
      var fileName = templatePathPrefix + file + (file.match(TemplateEngine.extensionRegExp) ? '' : '.' + TemplateEngine.extension);
      return scope.templates[fileName];
    },
  
    html: function(html) {
      if (typeof html === 'undefined') {
        return this.el.innerHTML;
      } else {
        var element;
        if (this._collectionOptions && this._renderCount) {
          //preserveCollectionElement calls the callback after it has a reference
          //to the collection element, calls the callback, then re-appends the element
          preserveCollectionElement.call(this, function() {
            element = $(this.el).html(html);
          });
        } else {
          element = $(this.el).html(html);
        }
        appendViews.call(this);
        return element;
      }
    },
  
    //allow events hash to specify view, collection and model events
    //as well as DOM events. Merges Thorax.View.events with this.events
    delegateEvents: function(events) {
      this.undelegateEvents && this.undelegateEvents();
      //bindModelAndCollectionEvents on this.constructor.events and this.events
      //done in _configure
      this.registerEvents(this.constructor.events);
      if (this.events) {
        this.registerEvents(this.events);
      }
      if (events) {
        this.registerEvents(events);
        bindModelAndCollectionEvents.call(this, events);
      }
    },

    registerEvents: function(events) {
      processEvents.call(this, events).forEach(this._addEvent, this);
    },

    //params may contain:
    //- name
    //- originalName
    //- selector
    //- type "view" || "DOM"
    //- handler
    _addEvent: function(params) {
      if (params.nested) {
        this._childEvents.push(params);
      }
      if (params.type === 'view') {
        if (params.nested) {
          this.bind(params.name, _.bind(params.handler, params.parent || this, this));
        } else {
          this.bind(params.name, params.handler, this);
        }
      } else {
        var boundHandler = containHandlerToCurentView(bindEventHandler.call(this, params.handler), this.cid);
        if (params.selector) {
          $(this.el).delegate(params.selector, params.name, boundHandler);
        } else {
          $(this.el).bind(params.name, boundHandler);
        }
      }
    },

    _shouldFetch: function(model_or_collection, options) {
      return model_or_collection.url && options.fetch && (
        typeof model_or_collection.isPopulated === 'undefined' || !model_or_collection.isPopulated()
      );
    },
  
    setModel: function(model, options) {
      (this.el[0] || this.el).setAttribute(model_cid_attribute_name, model.cid);
  
      var old_model = this.model;

      this.freeze({
        model: old_model, //may be false
        collection: false
      });
    
      this.model = model;
      this.setModelOptions(options);
  
      if (this.model) {
        this._events.model.forEach(function(event) {
          this.model.bind(event[0], event[1]);
        }, this);

        this.model.trigger('set', this.model, old_model);
    
        if (this._shouldFetch(this.model, this._modelOptions)) {
          var success = this._modelOptions.success;
          this.model.load(function(){
              success && success(model);
            }, this._modelOptions);
        } else {
          //want to trigger built in event handler (render() + populate())
          //without triggering event on model
          onModelChange.call(this);
        }
      }
  
      return this;
    },

    setModelOptions: function(options) {
      if (!this._modelOptions) {
        this._modelOptions = {
          fetch: true,
          success: false,
          render: true,
          populate: true,
          errors: true
        };
      }
      _.extend(this._modelOptions, options || {});
      return this._modelOptions;
    },
      
    setCollection: function(collection, options) {
      var old_collection = this.collection;

      this.freeze({
        model: false, //may be false
        collection: old_collection
      });
      
      this.collection = collection;
      this.collection.cid = _.uniqueId('collection');
      this.setCollectionOptions(options);
  
      if (this.collection) {
        this._events.collection.forEach(function(event) {
          this.collection.bind(event[0], event[1]);
        }, this);
      
        this.collection.trigger('set', this.collection, old_collection);

        if (this._shouldFetch(this.collection, this._collectionOptions)) {
          var success = this._collectionOptions.success;
          this.collection.load(function(){
              success && success(this.collection);
            }, this._collectionOptions);
        } else {
          //want to trigger built in event handler (render())
          //without triggering event on collection
          onCollectionReset.call(this);
        }
      }
  
      return this;
    },

    setCollectionOptions: function(options) {
      if (!this._collectionOptions) {
        this._collectionOptions = {
          fetch: true,
          success: false,
          errors: true
        };
      }
      _.extend(this._collectionOptions, options || {});
      return this._collectionOptions;
    },

    context: function(model) {
      return model ? model.attributes : {};
    },

    itemContext: function(item, i) {
      return item.attributes;
    },

    emptyContext: function() {},

    render: function(output) {
      if (typeof output === 'undefined' || (!_.isElement(output) && !_.isArray(output) && !(output && output.el) && typeof output !== 'string')) {
        ensureViewHasName.call(this);
        output = this.template(this.name, this.context(this.model));
      }
      //accept a view, string, or DOM element
      this.html((output && output.el) || output);
      if (!this._renderCount) {
        this._renderCount = 1;
      } else {
        ++this._renderCount;
      }
      this.trigger('rendered');
      return output;
    },

    renderCollection: function() {
      this.render();
      var collection_element = getCollectionElement.call(this).empty();
      collection_element.attr(collection_cid_attribute_name, this.collection.cid);
      if (this.collection.length === 0 && this.collection.isPopulated()) {
        appendEmpty.call(this);
      } else {
        this.collection.forEach(this.appendItem, this);
      }
      this.trigger('rendered:collection', collection_element);
    },

    renderItem: function(item, i) {
      ensureViewHasName.call(this);
      return this.template(this.name + '-item', this.itemContext(item, i));
    },
  
    renderEmpty: function() {
      ensureViewHasName.call(this);
      return this.template(this.name + '-empty', this.emptyContext());
    },

    //appendItem(model [,index])
    //appendItem(html_string, index)
    //appendItem(view, index)
    appendItem: function(model, index, options) {
      //empty item
      if (!model) {
        return;
      }

      var item_view,
          collection_element = getCollectionElement.call(this);

      options = options || {};

      //if index argument is a view
      if (index && index.el) {
        index = collection_element.find('> *').indexOf(index.el) + 1;
      }

      //if argument is a view, or html string
      if (model.el || typeof model === 'string') {
        item_view = model;
      } else {
        index = index || this.collection.indexOf(model) || 0;
        item_view = this.renderItem(model, index);
      }

      if (item_view) {

        if (item_view.cid) {
          this._views[item_view.cid] = item_view;
        }

        var item_element = item_view.el ? [item_view.el] : _.filter($(item_view), function(node) {
          //filter out top level whitespace nodes
          return node.nodeType === ELEMENT_NODE_TYPE;
        });

        $(item_element).attr(model_cid_attribute_name, model.cid);
        var previous_model = index > 0 ? this.collection.at(index - 1) : false;
        if (!previous_model) {
          collection_element.prepend(item_element);
        } else {
          //use last() as appendItem can accept multiple nodes from a template
          collection_element.find('[' + model_cid_attribute_name + '="' + previous_model.cid + '"]').last().after(item_element);
        }

        appendViews.call(this, item_element);

        if (!options.silent) {
          this.trigger('rendered:item', item_element);
        }
      }
      return item_view;
    },
  
    freeze: function(options) {
      var model, collection;
      if (typeof options === 'undefined') {
        model = this.model;
        collection = this.collection;
      } else {
        model = options.model;
        collection = options.collection;
      }

      if (collection && this._events && this._events.collection) {
        this._events.collection.forEach(function(event) {
          collection.unbind(event[0], event[1]);
        }, this);
      }

      if (model && this._events && this._events.model) {
        this._events.model.forEach(function(event) {
          model.unbind(event[0], event[1]);
        }, this);
      }
    },
  
    //serializes a form present in the view, returning the serialized data
    //as an object
    //pass {set:false} to not update this.model if present
    //can pass options, callback or event in any order
    //if event is passed, _preventDuplicateSubmission is called
    serialize: function() {
      var callback, options, event;
      //ignore undefined arguments in case event was null
      for (var i = 0; i < arguments.length; ++i) {
        if (typeof arguments[i] === 'function') {
          callback = arguments[i];
        } else if (typeof arguments[i] === 'object') {
          if ('stopPropagation' in arguments[i] && 'preventDefault' in arguments[i]) {
            event = arguments[i];
          } else {
            options = arguments[i];
          }
        }
      }

      if (event && !this._preventDuplicateSubmission(event)) {
        return;
      }

      options = _.extend({
        set: true,
        validate: true
      },options || {});
  
      var attributes = options.attributes || {};
      
      //callback has context of element
      eachNamedInput.call(this, options, function() {
        var value = getInputValue.call(this);
        if (typeof value !== 'undefined') {
          objectAndKeyFromAttributesAndName(attributes, this.name, {mode: 'serialize'}, function(object, key) {
            object[key] = value;
          });
        }
      });
  
      this.trigger('serialize', attributes);

      if (options.validate) {
        var errors = this.validateInput(attributes) || [];
        this.trigger('validate', attributes, errors);
        if (errors.length) {
          this.trigger('error', errors);
          return;
        }
      }
  
      if (options.set && this.model) {
        if (!this.model.set(attributes, {silent: true})) {
          return false;
        };
      }
      
      callback && callback.call(this,attributes);
      return attributes;
    },
  
    _preventDuplicateSubmission: function(event, callback) {
      event.preventDefault();

      var form = $(event.target);
      if ((event.target.tagName || '').toLowerCase() !== 'form') {
        // Handle non-submit events by gating on the form
        form = $(event.target).closest('form');
      }

      if (!form.attr('data-submit-wait')) {
        form.attr('data-submit-wait', 'true');
        if (callback) {
          callback.call(this, event);
        }
        return true;
      } else {
        return false;
      }
    },

    //populate a form from the passed attributes or this.model if present
    populate: function(attributes) {
      if (!this.$('form').length) {
        return;
      }
      var value, attributes = attributes || this.context(this.model);
      
      //callback has context of element
      eachNamedInput.call(this, {}, function() {
        objectAndKeyFromAttributesAndName.call(this, attributes, this.name, {mode: 'populate'}, function(object, key) {
          if (object && typeof (value = object[key]) !== 'undefined') {
            //will only execute if we have a name that matches the structure in attributes
            if (this.type === 'checkbox' && _.isBoolean(value)) {
              this.checked = value;
            } else if (this.type === 'checkbox' || this.type === 'radio') {
              this.checked = value == this.value;
            } else {
              this.value = value;
            }
          }
        });
      });

      this.trigger('populate', attributes);
    },
  
    //perform form validation, implemented by child class
    validateInput: function() {},
  
    destroy: function(){
      this.freeze();
      this.trigger('destroyed');
      if (this.undelegateEvents) {
        this.undelegateEvents();
      }
      this.unbind();
      this._events = {};
      this.el = null;
      this.collection = null;
      this.model = null;
      destroyChildViews.call(this);
    },

    scrollTo: function(x, y) {
      y = y || minimumScrollYOffset;
      window.scrollTo(x, y);
      return [x, y];
    }
  }, {
    registerHelper: function(name, callback) {
      this[name] = callback;
      TemplateEngine.registerHelper(name, this[name]);
    },
    registerMixin: function(name, callback, methods) {
      scope.Mixins[name] = [callback, methods];
    },
    mixins: [],
    mixin: function(mixin) {
      this.mixins.push(mixin);
    },
    //events for all views
    events: {
      model: {},
      collection: {}
    },
    registerEvents: function(events) {
      for(var name in events) {
        if (name === 'model' || name === 'collection') {
          for (var _name in events[name]) {
            addEvent(this.events[name], _name, events[name][_name]);
          }
        } else {
          addEvent(this.events, name, events[name]);
        }
      }
    },
    unregisterEvents: function(events) {
      if (typeof events === 'undefined') {
        this.events = {
          model: {},
          collection: {}
        };
      } else if (typeof events === 'string' && arguments.length === 1) {
        if (events === 'model' || events === 'collection') {
          this.events[events] = {};
        } else {
          this.events[events] = [];
        }
      //remove collection or model events
      } else if (arguments.length === 2) {
        this.events[arguments[0]][arguments[1]] = [];
      }
    }
  });

  //events and mixins properties need act as inheritable, not static / shared
  Thorax.View.extend = function(protoProps, classProps) {
    var child = Backbone.View.extend.call(this, protoProps, classProps);
    if (child.prototype.name) {
      scope.Views[child.prototype.name] = child;
    }
    child.mixins = _.clone(this.mixins);
    cloneEvents(this, child, 'events');
    cloneEvents(this.events, child.events, 'model');
    cloneEvents(this.events, child.events, 'collection');
    return child;
  };

  function cloneEvents(source, target, key) {
    source[key] = _.clone(target[key]);
    //need to deep clone events array
    _.each(source[key], function(value, _key) {
      if (_.isArray(value)) {
        target[key][_key] = _.clone(value);
      }
    });
  }

  Thorax.View.registerEvents({
    //built in dom events
    'submit form': function(event) {
      // Hide any virtual keyboards that may be lingering around
      var focused = $(':focus')[0];
      focused && focused.blur();
    },

    'initialize:after': function(options) {
      //bind model or collection if passed to constructor
      if (options && options.model) {
        this.setModel(options.model);
      }
      if (options && options.collection) {
        this.setCollection(options.collection);
      }
    },

    error: function() {  
      resetSubmitState.call(this);
    
      // If we errored with a model we want to reset the content but leave the UI
      // intact. If the user updates the data and serializes any overwritten data
      // will be restored.
      if (this.model && this.model.previousAttributes) {
        this.model.set(this.model.previousAttributes(), {
          silent: true
        });
      }
    },
    deactivated: function() {
      resetSubmitState.call(this);
    },
    model: {
      error: function(model, errors){
        if (this._modelOptions.errors) {
          this.trigger('error', errors);
        }
      },
      change: function() {
        onModelChange.call(this);
      }
    },
    collection: {
      add: function(model, collection) {
        //if collection was empty, clear empty view
        if (this.collection.length === 1) {
          getCollectionElement.call(this).empty();
        }
        this.appendItem(model, collection.indexOf(model));
      },
      remove: function(model) {
        this.$('[' + model_cid_attribute_name + '="' + model.cid + '"]').remove();
        for (var cid in this._views) {
          if (this._views[cid].model && this._views[cid].model.cid === model.cid) {
            this._views[cid].destroy();
            delete this._views[cid];
            break;
          }
        }
        if (this.collection.length === 0) {
          appendEmpty.call(this);
        }
      },
      reset: function() {
        onCollectionReset.call(this);
      },
      error: function(collection, message) {
        if (this._collectionOptions.errors) {
          this.trigger('error', message);
        }
      }
    }
  });

  Thorax.View.registerHelper('view', function(view, options) {
    if (!view) {
      return '';
    }
    var instance = Thorax._currentTemplateContext.view(view, options ? options.hash : {});
    return TemplateEngine.safeString('<div ' + view_placeholder_attribute_name + '="' + instance.cid + '"></div>');
  });
  
  Thorax.View.registerHelper('template', function(name, options) {
    var context = _.extend({}, this, options ? options.hash : {});
    var output = Thorax.View.prototype.template.call(Thorax._currentTemplateContext, name, context);
    return TemplateEngine.safeString(output);
  });

  Thorax.View.registerHelper('collection', function(options) {
    var collectionHelperOptions = _.clone(options.hash),
        tag = (collectionHelperOptions.tag || 'div');
    collectionHelperOptions[collection_cid_attribute_name] = "";
    if (collectionHelperOptions.tag) {
      delete collectionHelperOptions.tag;
    }
    var htmlAttributes = _.map(collectionHelperOptions, function(value, key) {
      return key + '="' + value + '"';
    }).join(' ');
    return TemplateEngine.safeString('<' + tag + ' ' + htmlAttributes + '></' + tag + '>');
  });

  Thorax.View.registerHelper('link', function(url) {
    return (Backbone.history._hasPushState ? Backbone.history.options.root : '#') + url;
  });

  //private Thorax.View methods

  function ensureViewHasName() {
    if (!this.name) {
      throw new Error(this.cid + " requires a 'name' attribute.");
    }
  }

  function onModelChange() {
    if (this._modelOptions.render) {
      this.render();
    }
    if (this._modelOptions.populate) {
      this.populate();
    }
  }

  function onCollectionReset() {
    this.renderCollection();
  }

  function containHandlerToCurentView(handler, cid) {
    return function(event) {
      var containing_view_element = $(event.target).closest('[' + view_name_attribute_name + ']');
      if (!containing_view_element.length || containing_view_element[0].getAttribute(view_cid_attribute_name) == cid) {
        handler(event);
      }
    };
  }

  //model/collection events, to be bound/unbound on setModel/setCollection
  function processModelOrCollectionEvent(events, type) {
    for (var _name in events[type] || {}) {
      if (_.isArray(events[type][_name])) {
        for (var i = 0; i < events[type][_name].length; ++i) {
          this._events[type].push([_name, bindEventHandler.call(this, events[type][_name][i])]);
        }
      } else {
        this._events[type].push([_name, bindEventHandler.call(this, events[type][_name])]);
      }
    }
  }

  //used by processEvents
  var domEvents = [
    'mousedown', 'mouseup', 'mousemove', 'mouseover', 'mouseout',
    'touchstart', 'touchend', 'touchmove',
    'click', 'dblclick',
    'keyup', 'keydown', 'keypress',
    'submit', 'change',
    'focus', 'blur'
  ];

  function bindEventHandler(callback) {
    var method = typeof callback === 'function' ? callback : this[callback];
    if (!method) {
      throw new Error('Event "' + callback + '" does not exist');
    }
    return _.bind(method, this);
  }

  function processEvents(events) {
    if (_.isFunction(events)) {
      events = events.call(this);
    }
    var processedEvents = [];
    for (var name in events) {
      if (name !== 'model' && name !== 'collection') {
        if (name.match(/,/)) {
          name.split(/,/).forEach(function(fragment) {
            processEventItem.call(this, fragment.replace(/(^[\s]+|[\s]+$)/g, ''), events[name], processedEvents);
          }, this);
        } else {
          processEventItem.call(this, name, events[name], processedEvents);
        }
      }
    }
    return processedEvents;
  }

  function processEventItem(name, handler, target) {
    if (_.isArray(handler)) {
      for (var i = 0; i < handler.length; ++i) {
        target.push(eventParamsFromEventItem.call(this, name, handler[i]));
      }
    } else {
      target.push(eventParamsFromEventItem.call(this, name, handler));
    }
  }

  var eventSplitter = /^(nested\s+)?(\S+)(?:\s+(.+))?/;

  function eventParamsFromEventItem(name, handler) {
    var params = {
      originalName: name,
      handler: typeof handler === 'string' ? this[handler] : handler
    };
    var match = eventSplitter.exec(name);
    params.nested = !!match[1];
    params.name = match[2];
    if (isDOMEvent(params.name)) {
      params.type = 'DOM';
      params.name += '.delegateEvents' + this.cid;
      params.selector = match[3];
    } else {
      params.type = 'view';
    }
    return params;
  }

  function isDOMEvent(name) {
    return !(!name.match(/\s+/) && domEvents.indexOf(name) === -1);
  }

  //used by Thorax.View.registerEvents for global event registration
  function addEvent(target, name, handler) {
    if (!target[name]) {
      target[name] = [];
    }
    if (_.isArray(handler)) {
      for (var i = 0; i < handler.length; ++i) {
        target[name].push(handler[i]);
      }
    } else {
      target[name].push(handler);
    }
  }

  function resetSubmitState() {
    this.$('form').removeAttr('data-submit-wait');
  }

  //called with context of input
  function getInputValue() {
    if (this.type === 'checkbox' || this.type === 'radio') {
      if ($(this).attr('data-onOff')) {
        return this.checked;
      } else if (this.checked) {
        return this.value;
      }
    } else if (this.multiple === true) {
      var values = [];
      $('option',this).each(function(){
        if (this.selected) {
          values.push(this.value);
        }
      });
      return values;
    } else {
      return this.value;
    }
  }

  //calls a callback with the correct object fragment and key from a compound name
  function objectAndKeyFromAttributesAndName(attributes, name, options, callback) {
    var key, i, object = attributes, keys = name.split('['), mode = options.mode;
    for(i = 0; i < keys.length - 1; ++i) {
      key = keys[i].replace(']','');
      if (!object[key]) {
        if (mode == 'serialize') {
          object[key] = {};
        } else {
          return callback.call(this, false, key);
        }
      }
      object = object[key];
    }
    key = keys[keys.length - 1].replace(']', '');
    callback.call(this, object, key);
  }

  function eachNamedInput(options, iterator, context) {
    var i = 0;
    $('select,input,textarea', options.root || this.el).each(function() {
      if (this.type !== 'button' && this.type !== 'cancel' && this.type !== 'submit' && this.name && this.name !== '') {
        iterator.call(context || this, i, this);
        ++i;
      }
    });
  }

  function bindModelAndCollectionEvents(events) {
    if (!this._events) {
      this._events = {
        model: [],
        collection: []
      };
    }
    processModelOrCollectionEvent.call(this, events, 'model');
    processModelOrCollectionEvent.call(this, events, 'collection');
  }

  function getCollectionElement() {
    var selector = this._collectionSelector || default_collection_selector;
    var element = this.$(selector);
    if (element.length === 0) {
      return $(this.el);
    } else {
      return element;
    }
  }

  function preserveCollectionElement(callback) {
    var old_collection_element = getCollectionElement.call(this);
    callback.call(this);
    var new_collection_element = getCollectionElement.call(this);
    if (old_collection_element.length && new_collection_element.length) {
      new_collection_element[0].parentNode.insertBefore(old_collection_element[0], new_collection_element[0]);
      new_collection_element[0].parentNode.removeChild(new_collection_element[0]);
    }
  }

  function appendViews(scope) {
    var self = this;
    if (!self._views) {
      return;
    }

    $('[' + view_placeholder_attribute_name + ']', scope || self.el).forEach(function(el) {
      var view = self._views[el.getAttribute(view_placeholder_attribute_name)];
      if (view) {
        //has the view been rendered at least once? if not call render().
        //subclasses overriding render() that do not call the parent's render()
        //or set _rendered may be rendered twice but will not error
        if (!view._renderCount) {
          view.render();
        }
        el.parentNode.insertBefore(view.el, el);
        el.parentNode.removeChild(el);
      }
    });
  }

  function destroyChildViews() {
    for (var id in this._views || {}) {
      if (this._views[id].destroy) {
        this._views[id].destroy();
      }
      this._views[id] = null;
    }
  }

  function appendEmpty() {
    getCollectionElement.call(this).empty();
    this.appendItem(this.renderEmpty(), 0, {silent: true});
    this.trigger('rendered:empty');
  }

  function applyMixin(mixin) {
    if (_.isArray(mixin)) {
      this.mixin.apply(this, mixin);
    } else {
      this.mixin(mixin);
    }
  }
  
  //main layout class, instance of which is available on scope.layout
  Thorax.Layout = Backbone.View.extend({
    events: {
      'click a': 'anchorClick'
    },

    initialize: function() {
      this.el = $(this.el)[0];
      this.views = this.make('div', {
        'class': 'views'
      });
      this.el.appendChild(this.views);
    },
    
    setView: function(view, params){
      var old_view = this.view;
      if (view == old_view){
        return false;
      }
      this.trigger('change:view:start', view, old_view);
      old_view && old_view.trigger('deactivated');
      view && view.trigger('activated', params || {});
      if (old_view && old_view.el && old_view.el.parentNode) {
        $(old_view.el).remove();
      }
      //make sure the view has been rendered at least once
      view && !view._renderCount && view.render();
      view && this.views.appendChild(view.el);
      window.scrollTo(0, minimumScrollYOffset);
      this.view = view;
      old_view && old_view.destroy();
      this.view && this.view.trigger('ready');
      this.trigger('change:view:end', view, old_view);
      return view;
    },

    anchorClick: function(event) {
      var target = $(event.currentTarget);
      if (target.attr("data-external")) {
        return;
      }
      var href = target.attr("href");
      // Route anything that starts with # or / (excluding //domain urls)
      if (href && (href[0] === '#' || (href[0] === '/' && href[1] !== '/'))) {
        Backbone.history.navigate(href, {trigger: true});
        event.preventDefault();
      }
    }
  });

  Thorax.Router = Backbone.Router.extend({
    view: function(name, attributes) {
      if (!scope.Views[name]) {
        throw new Error('view: ' + name + ' does not exist.');
      }
      return new scope.Views[name](attributes);
    },
    setView: function() {
      return scope.layout.setView.apply(scope.layout, arguments);
    },
    bindToRoute: bindToRoute
  },{
    create: function(module, protoProps, classProps) {
      return scope.Routers[module.name] = new (this.extend(_.extend({}, module, protoProps), classProps));
    },
    bindToRoute: bindToRoute
  });

  function bindToRoute(callback, failback) {
    var fragment = Backbone.history.getFragment(),
        completed;

    function finalizer(isCanceled) {
      var same = fragment === Backbone.history.getFragment();

      if (completed) {
        // Prevent multiple execution, i.e. we were canceled but the success callback still runs
        return;
      }

      if (isCanceled && same) {
        // Ignore the first route event if we are running in newer versions of backbone
        // where the route operation is a postfix operation.
        return;
      }

      completed = true;
      Backbone.history.unbind('route', resetLoader);

      var args = Array.prototype.slice.call(arguments, 1);
      if (!isCanceled && same) {
        callback.apply(this, args);
      } else {
        failback && failback.apply(this, args);
      }
    }

    var resetLoader = _.bind(finalizer, this, true);
    Backbone.history.bind('route', resetLoader);

    return _.bind(finalizer, this, false);
  }

  Thorax.Model = Backbone.Model.extend({
    isPopulated: function() {
      // We are populated if we have attributes set
      var attributes = _.clone(this.attributes);
      var defaults = _.isFunction(this.defaults) ? this.defaults() : (this.defaults || {});
      for (var default_key in defaults) {
        if (attributes[default_key] != defaults[default_key]) {
          return true;
        }
        delete attributes[default_key];
      }
      var keys = _.keys(attributes);
      return keys.length > 1 || (keys.length === 1 && keys[0] !== 'id');
    },
    fetch: function(options) {
      fetchQueue.call(this, options || {}, Backbone.Model.prototype.fetch);
    },
    load: loadData
  });

  Thorax.Model.extend = function(protoProps, classProps) {
    var child = Backbone.Model.extend.call(this, protoProps, classProps);
    if (child.prototype.name) {
      scope.Models[child.prototype.name] = child;
    }
    return child;
  };

  Thorax.Collection = Backbone.Collection.extend({
    model: Thorax.Model,
    isPopulated: function() {
      return this._fetched || this.length > 0;
    },
    fetch: function(options) {
      options = options || {};
      var success = options.success;
      options.success = function(collection, response) {
        collection._fetched = true;
        success && success(collection, response);
      };
      fetchQueue.call(this, options || {}, Backbone.Collection.prototype.fetch);
    },
    reset: function(models, options) {
      this._fetched = !!models;
      return Backbone.Collection.prototype.reset.call(this, models, options);
    },
    load: loadData
  });

  Thorax.Collection.extend = function(protoProps, classProps) {
    var child = Backbone.Collection.extend.call(this, protoProps, classProps);
    if (child.prototype.name) {
      scope.Collections[child.prototype.name] = child;
    }
    return child;
  };

  function loadData(callback, failback, options) {
    if (this.isPopulated()) {
      return callback(this);
    }

    if (arguments.length === 2 && typeof failback !== 'function' && _.isObject(failback)) {
      options = failback;
      failback = false;
    }

    this.fetch(_.defaults({
      success: bindToRoute(callback, failback && _.bind(failback, this, false)),
      error: failback && _.bind(failback, this, true)
    }, options));
  }

  function fetchQueue(options, $super) {
    if (options.resetQueue) {
      // WARN: Should ensure that loaders are protected from out of band data
      //    when using this option
      this.fetchQueue = undefined;
    }

    if (!this.fetchQueue) {
      // Kick off the request
      this.fetchQueue = [options];
      options = _.defaults({
        success: flushQueue(this, this.fetchQueue, 'success'),
        error: flushQueue(this, this.fetchQueue, 'error')
      }, options);
      $super.call(this, options);
    } else {
      // Currently fetching. Queue and process once complete
      this.fetchQueue.push(options);
    }
  }

  function flushQueue(self, fetchQueue, handler) {
    return function() {
      var args = arguments;

      // Flush the queue. Executes any callback handlers that
      // may have been passed in the fetch options.
      fetchQueue.forEach(function(options) {
        if (options[handler]) {
          options[handler].apply(this, args);
        }
      }, this);

      // Reset the queue if we are still the active request
      if (self.fetchQueue === fetchQueue) {
        self.fetchQueue = undefined;
      }
    }
  }
}).call(this, this);
