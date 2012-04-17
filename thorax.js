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

      templatePathPrefix = options && typeof options.templatePathPrefix !== 'undefined' ? options.templatePathPrefix : 'templates/';
      
      Backbone.history || (Backbone.history = new Backbone.History);

      scope.layout = new Thorax.Layout({
        el: options && options.layout || '.layout'
      });

    },
    //used by "template" and "view" template helpers, not thread safe though it shouldn't matter in browser land
    _currentTemplateContext: false,

    // Loading indicator helper. Note that only one load handler pair may be defined per object.
    throttleLoadStart: function(start) {
      return function(message, background) {
        var self = this;

        if (!self._loadStart) {
          var loadingTimeout = self._loadingTimeoutDuration;
          if (loadingTimeout === void 0) {
            // If we are running on a non-view object pull the default timeout
            loadingTimeout = Thorax.View.prototype._loadingTimeoutDuration;
          }

          self._loadStart = {
            timeout: setTimeout(function() {
                self._loadStart.run = true;
                start.call(self, self._loadStart.message, self._loadStart.background);
              },
              loadingTimeout*1000),
            message: message,
            background: background,
            pending: 1
          };
        } else {
          clearTimeout(self._loadStart.endTimeout);
          self._loadStart.pending++;

          self._loadStart.message = message;
          self._loadStart.background  = self._loadStart.background && background;
        }
      };
    },
    throttleLoadEnd: function(end, timeout) {
      return function(background) {
        var self = this;
        if (self._loadStart) {
          self._loadStart.pending--;

          // Reset the end timeout
          clearTimeout(self._loadStart.endTimeout);
          if (typeof timeout === 'undefined') {
            timeout = 100;
          }
          var callback = function(){
            if (self._loadStart.pending <= 0) {
              var run = self._loadStart.run;

              // If stopping make sure we don't run a start
              clearTimeout(self._loadStart.timeout);
              self._loadStart = undefined;

              if (run) {
                // Emit the end behavior, but only if there is a paired start
                end.call(self, background);
              }
            }
          };
          if (timeout) {
            self._loadStart.endTimeout = setTimeout(callback, timeout);
          } else {
            callback();
          }
        }
      };
    }
  };

  //private vars for Thorax.View
  var eventSplitter = /^(\S+)\s*(.*)$/,
    view_name_attribute_name = 'data-view-name',
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

      //setup
      if (!this.name) {
        console.error('All views extending Thorax.View should have a name property.');
      }
            
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
      (this.el[0] || this.el).setAttribute(view_name_attribute_name, this.name || 'unknown');
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
      return instance;
    },
    
    template: function(file, data) {
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
        console.error('Unable to find template ' + file);
        return '';
      } else {
        return template(data);
      }
    },
    loadTemplate: function(file, data, scope) {
      var fileName = templatePathPrefix + file + (file.match(/\.handlebars$/) ? '' : '.handlebars');
      return scope.templates[fileName];
    },
  
    html: function(html) {
      if (typeof html === 'undefined') {
        return this.el.innerHTML;
      } else {
        var element;
        if (this.collection && this._renderCount) {
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
      this.undelegateEvents();
      this._processEvents(this.constructor.events);
      if (this.events) {
        this._processEvents(this.events);
      }
      if (events) {
        this._processEvents(events);
        bindModelAndCollectionEvents.call(this, events);
      }
    },

    _bindEventHandler: function(callback) {
      var method = typeof callback === 'function' ? callback : this[callback];
      if (!method) {
        console.error('Event "' + callback + '" does not exist');
      }
      return _.bind(method, this);
    },

    _processEvents: function(events) {
      this._domEvents = this._domEvents || [];

      if (_.isFunction(events)) {
        events = events.call(this);
      }
      for (var name in events) {
        if (name !== 'model' && name !== 'collection') {
          if (_.isArray(events[name])) {
            for (var i = 0; i < events[name].length; ++i) {
              processEvent.call(this, name, events[name][i]);
            }
          } else {
            processEvent.call(this, name, events[name]);
          }
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
          this.model.fetch(_.extend({}, _.isObject(this._modelOptions.fetch) ? this._modelOptions.fetch : {}, {
            ignoreErrors: this.ignoreFetchError,
            success: _.once(_.bind(function(){
              if (this._modelOptions.success) {
                this._modelOptions.success(model);
              }
            },this))
          }));
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
          this.collection.fetch(_.extend({}, _.isObject(this._collectionOptions.fetch) ? this._collectionOptions.fetch : {}, {
            ignoreErrors: this.ignoreFetchError,
            success: _.once(_.bind(function(){
              if (this._collectionOptions.success) {
                this._collectionOptions.success(this.collection);
              }
            },this))
          }));
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

    render: function() {
      var output = this.template(this.name + '.handlebars', this.context(this.model));
      this.html(output);
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
      var collection_element = getCollectionElement.call(this);
      collection_element.attr(collection_cid_attribute_name, this.collection.cid);
      if (this.collection.length === 0 && this.collection.isPopulated()) {
        appendEmpty.call(this);
      } else {
        this.collection.forEach(this.appendItem, this);
      }
      this.trigger('rendered:collection', collection_element);
    },

    renderItem: function(item, i) {
      return this.template(this.name + '-item.handlebars', this.itemContext(item, i));
    },
  
    renderEmpty: function() {
      return this.template(this.name + '-empty.handlebars');
    },

    //appendItem(model [,index])
    //appendItem(html_string, index)
    //appendItem(view, index)
    appendItem: function(model, index, options) {
      //empty item
      if (!model) {
        if (!options.silent) {
          this.trigger('rendered:item', model);
        }
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
          return node.nodeType === ELEMENT_NODE_TYPE;
        });

        if (item_element) {
          $(item_element).attr(model_cid_attribute_name, model.cid);
          var previous_model = index > 0 ? this.collection.at(index - 1) : false;
          if (!previous_model) {
            collection_element.prepend(item_element);
          } else {
            collection_element.find('[' + model_cid_attribute_name + '="' + previous_model.cid + '"]').last().after(item_element);
          }

          appendViews.call(this, item_element);

          if (!options.silent) {
            this.trigger('rendered:item', item_element);
          }
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

    //loading config
    _loadingClassName: 'loading',
    _loadingTimeoutDuration: 0.33,

    scrollTo: function(x, y) {
      y = y || minimumScrollYOffset;
      window.scrollTo(x, y);
      return [x, y];
    }
  }, {
    registerHelper: function(name, callback) {
      this[name] = callback;
      Handlebars.registerHelper(name, this[name]);
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
    child.events = _.clone(this.events);
    child.events.model = _.clone(this.events.model);
    child.events.collection = _.clone(this.events.collection);
    return child;
  };

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
    'load:start': Thorax.throttleLoadStart(function(message, background) {
      $(this.el).addClass(this._loadingClassName);
    }),
    'load:end': Thorax.throttleLoadEnd(function(message, background) {
      $(this.el).removeClass(this._loadingClassName);
    }),
    model: {
      error: function(model, errors){
        if (this._modelOptions.errors) {
          this.trigger('error', errors);
        }
      },
      change: function() {
        onModelChange.call(this);
      },
      'load:start': function(message, background) {
        this.trigger('load:start', message, background);
      },
      'load:end': function(background) {
        this.trigger('load:end', background);
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
      },
      'load:start': function(message, background) {
        this.trigger('load:start', message, background);
      },
      'load:end': function(background) {
        this.trigger('load:end', background);
      }
    }
  });

  Thorax.View.registerHelper('view', function(view, options) {
    if (!view) {
      return '';
    }
    var instance = Thorax._currentTemplateContext.view(view, options ? options.hash : {});
    return new Handlebars.SafeString('<div ' + view_placeholder_attribute_name + '="' + instance.cid + '"></div>');
  });
  
  Thorax.View.registerHelper('template', function(name, options) {
    var context = _.extend({}, this, options ? options.hash : {});
    var output = Thorax.View.prototype.template.call(Thorax._currentTemplateContext, name, context);
    return new Handlebars.SafeString(output);
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
    return new Handlebars.SafeString('<' + tag + ' ' + htmlAttributes + '></' + tag + '>');
  });

  Thorax.View.registerHelper('link', function(url) {
    return (Backbone.history._hasPushState ? Backbone.history.options.root : '#') + url;
  });

  //private Thorax.View methods

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
          this._events[type].push([_name, this._bindEventHandler(events[type][_name][i])]);
        }
      } else {
        this._events[type].push([_name, this._bindEventHandler(events[type][_name])]);
      }
    }
  }

  //used by _processEvents
  var domEvents = [
    'mousedown', 'mouseup', 'mousemove', 'mouseover', 'mouseout',
    'touchstart', 'touchend', 'touchmove',
    'click', 'dblclick',
    'keyup', 'keydown', 'keypress',
    'submit',
    'focus', 'blur'
  ];

  function processEvent(name, handler) {
    if (name.match(/,/)) {
      _.each(name.split(/,/), function(fragment) {
        processEvent.call(this, fragment.replace(/(^[\s]+|[\s]+$)/g, ''), handler);
      }, this);
    } else {
      if (!name.match(/\s+/) && domEvents.indexOf(name) === -1) {
        //view events
        this.bind(name, this._bindEventHandler(handler));
      } else {
        //DOM events
        this._domEvents.push(name);

        var match = name.match(eventSplitter);
        var eventName = match[1] + '.delegateEvents' + this.cid, selector = match[2];
        if (selector === '') {
          $(this.el).bind(eventName, containHandlerToCurentView(this._bindEventHandler(handler), this.cid));
        } else {
          $(this.el).delegate(selector, eventName, containHandlerToCurentView(this._bindEventHandler(handler), this.cid));
        }
      }
    }
  }

  //used by Thorax.View.addEvents for global event registration
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
      console.error(this.name + '._collectionSelector: "' + selector + '" returned empty, returning ' + this.name + '.el');
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

      view.trigger('activated', params || {});

      if (old_view && old_view.el && old_view.el.parentNode) {
        $(old_view.el).remove();
      }

      //make sure the view has been rendered at least once
      if (!view._renderCount) {
        view.render();
      }

      this.views.appendChild(view.el);
  
      window.scrollTo(0, minimumScrollYOffset);

      this.view = view;
    
      if (old_view) {
        old_view.destroy();
      }
      this.view.trigger('ready');
      this.trigger('change:view:end', view, old_view);

      return view;
    },

    anchorClick: function(event) {
      var target = $(event.target);
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

  function bindToRoute(callback, failback, background) {
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

      background || scope.trigger('load:end');
      var args = Array.prototype.slice.call(arguments, 1);
      if (!isCanceled && same) {
        callback.apply(this, args);
      } else {
        failback && failback.apply(this, args);
      }
    }

    var resetLoader = _.bind(finalizer, this, true);
    Backbone.history.bind('route', resetLoader);

    background || scope.trigger('load:start');
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
    sync: sync,
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
    sync: sync,
    load: loadData
  });

  Thorax.Collection.extend = function(protoProps, classProps) {
    var child = Backbone.Collection.extend.call(this, protoProps, classProps);
    if (child.prototype.name) {
      scope.Collections[child.prototype.name] = child;
    }
    return child;
  };

  function sync(method, model_or_collection, options) {
    var complete = options.complete;
    options.complete = function() {
      complete && complete.apply(this, arguments);
      model_or_collection.trigger('load:end', options.background);
    };
    model_or_collection.trigger('load:start', undefined, options.background);
    var request = Backbone.sync.apply(this, arguments);
    this.trigger('request', request);
    return request;
  }
  Thorax.sync = sync;

  function loadData(callback, failback, options) {
    if (this.isPopulated()) {
      return callback(this);
    }

    if (arguments.length === 2 && typeof failback !== 'function' && _.isObject(failback)) {
      options = failback;
      failback = false;
    }
    options = options || {};

    function finalizer(isError) {
      this.unbind('error', errorHandler);
      if (isError && !options.background) {
        scope.trigger('load:end');
      }
      failback && failback.apply(this, arguments);
    }

    var errorHandler = _.bind(finalizer, this, true);
    this.bind('error', errorHandler);

    this.fetch(_.extend({}, options || {}, {
      success: bindToRoute(_.bind(function() {
          this.unbind('error', errorHandler);
          callback.apply(this, arguments);
        }, this),
        _.bind(finalizer, this, false),
        options.background)
    }));
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
