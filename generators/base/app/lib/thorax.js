(function(){

  if (typeof this._ === 'undefined') {
    throw new Error('Underscore.js required to run Thorax');
  }

  if (typeof this.Backbone === 'undefined') {
    throw new Error('Backbone.js required to run Thorax');
  }

  var Thorax, scope;

  this.Thorax = Thorax = {
    configure: function(options) {
      scope = options.scope || (typeof exports !== 'undefined' && exports);

      if (!scope) {
        throw new Error('No scope passed to Thorax.configure() and no "exports" was available inside of thorax.js');
      }

      _.extend(scope, Backbone.Events, {
        templates: {},
        Views: {},
        Mixins: {},
        Models: {},
        Collections: {},
        Routers: {}
      });
      
      Backbone.history || (Backbone.history = new Backbone.History);

      scope.layout = new Thorax.Layout({
        el: options.layout || '.layout'
      });

      scope.moduleMap = moduleMap;
    },
    //used by "template" and "view" template helpers, not thread safe though it shouldn't matter in browser land
    _currentTemplateContext: false 
  };

  //private functions for Thorax
  var moduleMapRouter;
  function moduleMap(map, loadPrefix) {
    if (typeof this.$script === 'undefined') {
      throw new Error('script.js required to run Thorax');
    }

    if (moduleMapRouter) {
      return;
    }
    var routes = {},
    handlers = {
      routes: routes
    };
    // For each route create a handler that will load the associated module on request
    for (var route in map) {
      var name = map[route];
      var handlerName = "loader" + name;
      routes[route] = handlerName
      handlers[handlerName] = generateLoader(name, loadPrefix);
    }
    moduleMapRouter = new (Backbone.Router.extend(handlers));
  };

  function generateLoader(name, loadPrefix) {
    return function() {
      loadStartEventEmitter.call(scope);
      $script((loadPrefix || '') + name, function() {
        loadEndEventEmitter.call(scope);
        // Reload with the new route
        Backbone.history.loadUrl();
      });
    };
  };

  //private vars for Thorax.View
  var eventSplitter = /^(\S+)\s*(.*)$/,
    view_name_attribute_name = 'data-view-name',
    view_cid_attribute_name = 'data-view-cid',
    view_placeholder_attribute_name = 'data-view-tmp',
    model_cid_attribute_name = 'data-model-cid',
    pendingLoadSize = 0,
    old_backbone_view = Backbone.View;

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
  
      var template, templateName, fileName = file + (file.match(/\.handlebars$/) ? '' : '.handlebars');  
      templateName = 'templates/' + fileName;
      template = scope.templates[templateName];
  
      if (!template) {
        console.error('Unable to find template ' + templateName);
        return '';
      } else {
        return template(data);
      }      
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
      return model_or_collection.url && options.fetch;
    },
  
    setModel: function(model, options) {
      (this.el[0] || this.el).setAttribute(model_cid_attribute_name, model.cid);

      options = _.extend({
        fetch: true,
        success: false,
        render: true,
        populate: true,
        errors: true,
        loading: true
      },options || {});
  
      var old_model = this.model;

      this.freeze({
        model: old_model, //may be false
        collection: false
      });
    
      this.model = model;
      this._modelOptions = options;
  
      if (this.model) {
        this._events.model.forEach(function(event) {
          this.model.bind(event[0], event[1]);
        }, this);

        this.model.trigger('set', this.model, old_model);
    
        if (this._shouldFetch(this.model, options)) {
          this.model.fetch({
            success: _.once(_.bind(function(){
              if (options.success) {
                options.success(model);
              }
            },this))
          });
        } else {
          this.model.trigger('change');
        }
      }
  
      return this;
    },
      
    setCollection: function(collection, options) {
      options = _.extend({
        fetch: true,
        success: false,
        errors: true,
        loading: true
      },options || {});
  
      var old_collection = this.collection;

      this.freeze({
        model: false, //may be false
        collection: old_collection
      });
      
      this.collection = collection;
      this._collectionOptions = options;
  
      if (this.collection) {
        this._events.collection.forEach(function(event) {
          this.collection.bind(event[0], event[1]);
        }, this);
      
        this.collection.trigger('set', this.collection, old_collection);

        if (this._shouldFetch(this.collection, options)) {
          this.collection.fetch({
            success: _.once(_.bind(function(){
              if (options.success) {
                options.success(this.collection);
              }
            },this))
          });
        } else {
          this.collection.trigger('reset');
        }
      }
  
      return this;
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
      if (this.collection.length == 0) {
        appendEmpty.call(this);
      } else {
        var cids = [];
        var elements = _.compact(this.collection.map(function(model, i) {
          cids.push(model.cid);
          return this.renderItem(model, i);
        }, this));
        if (elements[0] && elements[0].el) {
          elements.forEach(function(view) {
            this._views[view.cid] = view;
            collection_element.append(view.el);
          }, this);
        } else {
          collection_element.html(elements.join(''));
        }
        collection_element.children().each(function(i) {
          this.setAttribute(model_cid_attribute_name, cids[i]);
        });
      }
    },
  
    renderItem: function(item, i) {
      return this.template(this.name + '-item.handlebars', this.itemContext(item, i));
    },
  
    renderEmpty: function() {
      return this.template(this.name + '-empty.handlebars');
    },

    appendItem: function(model, index) {
      index = index || this.collection.indexOf(model) || 0;
      var collection_element = getCollectionElement.call(this)[0];
      var item_view = this.renderItem(model, index);
      if (item_view) {
        if (item_view.cid) {
          this._views[item_view.cid] = item_view.cid;
        }
        var previous_model = index > 0 ? this.collection.at(index - 1) : false;
        var item_element;
        if (item_view.el) {
          item_element = item_view.el;
        } else {
          //renderItem returned string
          var div = document.createElement('div');
          div.innerHTML = item_view;
          item_element = div.childNodes[0];
        }
        if (item_element) {
          $(item_element).attr(model_cid_attribute_name, model.cid);
          if (!previous_model) {
            collection_element.insertBefore(item_element, collection_element.firstChild);
          } else {
            var previous_model_element = $(collection_element).find('[' + model_cid_attribute_name + '="' + previous_model.cid + '"]');
            if (previous_model_element[0]) {
              collection_element.insertBefore(item_element, previous_model_element[0].nextSibling);
            }
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
      for (var i = 0; i < arguments.length; ++i) {
        if (typeof arguments[i] === 'function') {
          callback = arguments[i];
        } else if (typeof arguments[i] === 'object') {
          if ('stopPropagation' in arguments[i] && 'preventDefault' in arguments[i]) {
            event = arguments[i];
          } else {
            options = arguments[i];
          }
        } else {
          console.error('Invalid argument to serialize():' + (typeof arguments[i]));
        }
      }

      if (event && !this._preventDuplicateSubmission(event)) {
        return;
      }

      options = _.extend({
        set: true,
        validate: true
      },options || {});
  
      var attributes = {};
      
      //callback has context of element
      eachNamedInput.call(this, function() {
        var value = getInputValue.call(this);
        if (typeof value !== 'undefined') {
          objectAndKeyFromAttributesAndName(attributes, this.name, {mode: 'serialize'}, function(object, key) {
            object[key] = value;
          });
        }
      });
  
      if (options.validate) {
        var errors = this.validateInput(attributes) || [];
        this.trigger('validate', attributes, errors);
        if (errors.length) {
          this.trigger('error', errors);
          return;
        }
      }
  
      if (options.set && this.model) {
        this.model.set(attributes, {
          silent: true
        });
      }
      
      callback && callback.call(this,attributes);
      return attributes;
    },
  
    _preventDuplicateSubmission: function(event, callback) {
      event.preventDefault();
      var form = $(event.target);
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
      eachNamedInput.call(this, function() {
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
    },
  
    _checkFirstRadio: function(){
      // TODO : Use _.groupBy after upgrading to the latest underscore
      var fields = {};
      _.each(this.$('input[type=radio]:not([disabled])'), function(el) {
        var col = fields[el.name] = fields[el.name] || [];
        col.push(el);
      });
      _.each(fields, function(elements, name) {
        if (!_.detect(elements, function(element) { return element.checked; })) {
          elements[0].checked = true;
        }
      });
    },
  
    //perform form validation, implemented by child class
    validateInput: function() {},
  
    destroy: function(){
      this.freeze();
      this.undelegateEvents();
      this._events = {};
      this.unbind();
      this.el = null;
      this.collection = null;
      this.model = null;
      destroyChildViews.call(this);
      this.trigger('destroyed');
    },

    //loading config
    _loadingClassName: 'loading',
    _loadingTimeoutDuration: 0.33
  }, {
    create: function(name, protoProps, classProps) {
      protoProps.name = name;
      return scope.Views[name] = this.extend(protoProps, classProps);
    },
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
    }
  });

  //events and mixins properties need act as inheritable, not static / shared
  Thorax.View.extend = function(protoProps, classProps) {
    var child = Backbone.View.extend.call(this, protoProps, classProps);
    child.mixins = _.clone(this.mixins);
    child.events = _.clone(this.events);
    child.events.model = _.clone(this.events.model);
    child.events.collection = _.clone(this.events.collection);
    return child;
  };

  Thorax.View.registerEvents({
    //built in dom events
    'click a': function(event) {
      var target = $(event.target);
      if (target.attr("data-external")) {
        return;
      }
      var transition = target.attr('data-transition');
      if (transition && transition != '') {
        scope.layout.setNextTransitionMode(transition); 
      }
      var href = target.attr("href");
      // Route anything that starts with # or / (excluding //domain urls)
      if (href && (href[0] === '#' || (href[0] === '/' && href[1] !== '/'))) {
        Backbone.history.navigate(href, true);
        event.preventDefault();
      }
    },

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
    'load:start': function() {
      $(this.el).addClass(this._loadingClassName);
    },
    'load:end': function() {
      $(this.el).removeClass(this._loadingClassName);
    },
    model: {
      error: function(model, errors){
        if (this._modelOptions.errors) {
          this.trigger('error', errors);
        }
      },
      change: function() {
        if (this._modelOptions.render) {
          this.render();
        }
        if (this._modelOptions.populate) {
          this.populate();
        }
      },
      'load:start': function() {
        if (this._modelOptions.loading) {
          loadStartEventEmitter.call(this);
        }
      },
      'load:end': function() {
        if (this._modelOptions.loading) {
          loadEndEventEmitter.call(this);
        }
      } 
    },
    collection: {
      add: function(model) {
        this.appendItem(model);
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
        this.renderCollection();
      },
      error: function(collection, message) {
        if (this._collectionOptions.errors) {
          this.trigger('error', message);
        }
      },
      'load:start': function() {
        if (this._collectionOptions.loading) {
          loadStartEventEmitter.call(this);
        }
      },
      'load:end': function() {
        if (this._collectionOptions.loading) {
          loadEndEventEmitter.call(this);
        }
      }
    }
  });

  Thorax.View.registerHelper('view', function(view, options) {
    var instance = Thorax._currentTemplateContext.view(view, options ? options.hash : {});
    return new Handlebars.SafeString('<div ' + view_placeholder_attribute_name + '="' + instance.cid + '"></div>');
  });
  
  Thorax.View.registerHelper('template', function(name, options) {
    var context = _.extend({}, this, options ? options.hash : {});
    var output = Thorax.View.prototype.template.call(Thorax._currentTemplateContext, name, context);
    return new Handlebars.SafeString(output);
  });

  Thorax.View.registerHelper('link', function(url) {
    return (Backbone.history._hasPushState ? Backbone.history.options.root : '#') + url;
  });

  //private Thorax.View methods

  function loadStartEventEmitter() {
    pendingLoadSize++;
    this._loadStartTimeout = setTimeout(_.bind(function() {
      pendingLoadSize--;
      this.trigger('load:start');
    }, this), this._loadingTimeoutDuration * 1000);
  };

  function loadEndEventEmitter() {
    clearTimeout(this._loadStartTimeout);
    if (pendingLoadSize) {
      // this will cancel out the need to call load:end
      pendingLoadSize--;
      for (var i = 0; i < pendingLoadSize; i++) {
        // we need to make sure all load:start and load:end calls are balanced
        this.trigger('load:start');
      }
      pendingLoadSize = 0;
    } else {
      this.trigger('load:end');
    }
  };

  function containHandlerToCurentView(handler, cid) {
    return function(event) {
      var containing_view_element = $(event.target).closest('[' + view_name_attribute_name + ']');
      if (containing_view_element.length === 0 || containing_view_element.length > 0 && containing_view_element[0].getAttribute(view_cid_attribute_name) == cid) {
        handler(event);
      }
    };
  };

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
  };

  //used by _processEvents
  function processEvent(name, handler) {
    if (!name.match(/\s+/)) {
      //view events
      this.bind(name, this._bindEventHandler(handler));
    } else {
      //DOM events
      var match = name.match(eventSplitter);
      var eventName = match[1] + '.delegateEvents' + this.cid, selector = match[2];
      if (selector === '') {
        $(this.el).bind(eventName, containHandlerToCurentView(this._bindEventHandler(handler), this.cid));
      } else {
        $(this.el).delegate(selector, eventName, containHandlerToCurentView(this._bindEventHandler(handler), this.cid));
      }
    }
  };

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
  };

  function resetSubmitState() {
    this.$('form').removeAttr('data-submit-wait');
  };

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
  };

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
  };

  function eachNamedInput(iterator, context) {
    var i = 0;
    this.$('select,input,textarea').each(function() {
      if (this.type !== 'button' && this.type !== 'cancel' && this.type !== 'submit' && this.name && this.name !== '') {
        iterator.call(context || this, i, this);
        ++i;
      }
    });
  };

  function bindModelAndCollectionEvents(events) {
    if (!this._events) {
      this._events = {
        model: [],
        collection: []
      };
    }
    processModelOrCollectionEvent.call(this, events, 'model');
    processModelOrCollectionEvent.call(this, events, 'collection');
  };

  function getCollectionElement() {
    var selector = this._collectionSelector || '.collection';
    var element = this.$(selector);
    if (element.length === 0) {
      console.error(this.name + '._collectionSelector: "' + selector + '" returned empty, returning ' + this.name + '.el');
      return $(this.el);
    } else {
      return element;
    }
  };

  function preserveCollectionElement(callback) {
    var old_collection_element = getCollectionElement.call(this);
    callback.call(this);
    var new_collection_element = getCollectionElement.call(this);
    if (old_collection_element.length && new_collection_element.length) {
      new_collection_element[0].parentNode.insertBefore(old_collection_element[0], new_collection_element[0]);
      new_collection_element[0].parentNode.removeChild(new_collection_element[0]);
    }
  };

  function appendViews() {
    for (var id in this._views || {}) {
      var view_placeholder_element = this.$('[' + view_placeholder_attribute_name + '="' + id + '"]')[0];
      if (view_placeholder_element) {
        var view = this._views[id];
        //has the view been rendered at least once? if not call render().
        //subclasses overriding render() that do not call the parent's render()
        //or set _rendered may be rendered twice but will not error
        if (!view._renderCount) {
          view.render();
        }
        view_placeholder_element.parentNode.insertBefore(view.el, view_placeholder_element);
        view_placeholder_element.parentNode.removeChild(view_placeholder_element);
      }
    }
  };

  function destroyChildViews() {
    for (var id in this._views || {}) {
      if (this._views[id].destroy) {
        this._views[id].destroy();
      }
      this._views[id] = null;
    }
  };

  function appendEmpty() {
    var empty_view = this.renderEmpty();
    if (empty_view.cid) {
      this._views[empty_view.cid] = empty_view
    }
    var collection_element = getCollectionElement.call(this);
    if (collection_element.length) {
      collection_element.empty().append(empty_view.el || empty_view || '');
    }
  };

  function applyMixin(mixin) {
    if (_.isArray(mixin)) {
      this.mixin.apply(this, mixin);
    } else {
      this.mixin(mixin);
    }
  };

  //private / module vars for layout view
  function resetElementAnimationStyles(element) {
    element.style.webkitTransition = null;
    element.style.webkitTransform = null;
    element.style.webkitTransitionDuration = null;
    element.style.webkitTransitionTimingFunction = null;
    element.style.webkitTransitionDelay = null;
  
    element.style.zIndex = '';
    element.style.left = '0px';
    element.style.top = '0px';
  };

  function resetLayout(new_view_element, scrollTop) {
    resetElementAnimationStyles(new_view_element);
    resetElementAnimationStyles(this.views);
    this.trigger('reset', new_view_element, scrollTop);
  };

  function completeTransition(view, old_view, callback) {
    $(this.el).removeClass('transitioning');
    // Force a scroll again to prevent Android from attempting to restore the scroll
    // position for the back transitions.
    window.scrollTo(0, 0);

    if (old_view && old_view.el.parentNode) {
      $(old_view.el).remove();
    }
  
    this.view = view;
  
    // Execute the events on the next iter. This gives things a chance
    // to settle and also protects us from NPEs in callback resulting in
    // an unremoved listeners
    setTimeout(_.bind(function() {
      if (old_view) {
        old_view.destroy();
      }
      this.view.trigger('ready');
      this.trigger('change:view:end', view, old_view);
      if (callback) {
        callback();
      }
    }, this), 0);
  };

  function cleanupTransition(delta_x, delta_y, new_view_element, callback) {
    $(this.views).one('webkitTransitionEnd', _.bind(function() {
      resetLayout.call(this, new_view_element);
      callback();
    }, this));

    this.views.clientWidth;   // It flows and flows. Needed to trigger the transition

    var transform = [];
    if (delta_x !== false) {
      transform.push('translateX(' + String(delta_x) + 'px)');
    }
    if (delta_y !== false) {
      transform.push('translateY(' + String(delta_y) + 'px)');
    }
    this.views.style.webkitTransform = transform.join(' ');
    this.views.style.webkitTransition = '-webkit-transform ' + this.transition;
  };

  function onLayoutReset(view, scrollTop) {
    //for native
    if (scrollTop && this.transition != 'none') {
      var ua = navigator.userAgent.toLowerCase();
      if (view && ua.match(/ipod|iphone|ipad/)) {
        // Android flashes when attempting to adjust the offset in this manner
        // so only run it under ios.
        view.el.style.top = -scrollTop + 'px';
      } else {
        // For all others just jump to the top before beggining the transition
        // This seems more palatable than a flash of the same content.
        window.scrollTo(0, 0);
      }
    }
  };
  
  //main layout class, instance of which is available on scope.layout
  Thorax.Layout = Backbone.View.extend({
    initialize: function() {
      this.el = $(this.el)[0];
  
      //setup cards container
      this.views = this.make('div', {
        'class': 'views'
      });
      this.el.appendChild(this.views);
  
      //transition mode setup
      this._forceTransitionMode = false;
      this._transitionMode = this.forwardsTransitionMode;
  
      //track history direction for transition mode
      this._historyDirection = 'forwards';
      Backbone.history.bind('route',_.bind(function(fragment,index){
        this._historyDirection = index >= 0 ? 'forwards' : 'backwards';
      },this));

      this.bind('reset', _.bind(onLayoutReset, this));
    },
    
    setNextTransitionMode: function(transition_mode){
      this._forceTransitionMode = true;
      this._transitionMode = transition_mode;
    },

    setView: function(view, params){
      var old_view = this.view;
  
      if (view == old_view){
        return;
      }
      
      this.trigger('change:view:start', view, old_view);

      if(params && params.transition){
        this.setNextTransitionMode(params.transition);
      }
  
      // Read any reflow possible fields that we may need prior to dirtying the layout
      var scrollTop = document.body.scrollTop,
        clientWidth = this.el.clientWidth
        clientHeight = this.el.clientHeight;
  
      old_view && old_view.trigger('deactivated');
  
      this.views.appendChild(view.el);
      view.trigger('activated', params || {});
      
      //set transition mode
      var transition_mode = this._forceTransitionMode
        ? this._transitionMode
        : this._historyDirection === 'backwards'
          ? this.backwardsTransitionMode
          : this._transitionMode || this.forwardsTransitionMode
      ;
      
      if (this._transitionMode == 'none' || !old_view) {
        // None or first view, no transition
        completeTransition.call(this, view, old_view);
      } else {
        $(this.el).addClass('transitioning');
        resetLayout.call(this, view.el, scrollTop);
  
        //animated transition
        this[transition_mode](view, clientWidth, clientHeight);
      }

      //reset transition mode
      this._forceTransitionMode = false;
      this._transitionMode = this.forwardsTransitionMode;

      return view;
    },

    //transitions, in all transitions clientWidth, clientHeight are optional
    //and can receive an optional callback as the last argument
    //clientWidth, clientHeight are passed by setView as an optomization to avoid reflow

    //position next view on right and slide right to it
    slideRight: function(new_view, clientWidth, clientHeight) {
      var clientWidth = clientWidth || this.el.clientWidth,
        callback = typeof arguments[arguments.length - 1] === 'function' ? arguments[arguments.length - 1] : null;

      if (!this.views.style.webkitTransform){
        this.views.style.webkitTransform = 'translateX(' + clientWidth + 'px)';
      }
      this.views.style.left = '-' + clientWidth + 'px';
      new_view.el.style.left = clientWidth + 'px';

      cleanupTransition.call(this, 0, false, new_view.el, _.bind(completeTransition, this, new_view, this.view, callback));
    },

    //position next view on left and slide left to it
    slideLeft: function(new_view, clientWidth, clientHeight) {
      var clientWidth = clientWidth || this.el.clientWidth,
        callback = typeof arguments[arguments.length - 1] === 'function' ? arguments[arguments.length - 1] : null;

      this.view.el.style.left = clientWidth + 'px';
      this.views.style.left = '-' + clientWidth + 'px';

      cleanupTransition.call(this, clientWidth, false, new_view.el, _.bind(completeTransition, this, new_view, this.view, callback));
    },

    transition: '333ms ease-in-out',
    forwardsTransitionMode: 'slideRight',
    backwardsTransitionMode: 'slideLeft'
  });

  Thorax.Router = Backbone.Router.extend({
    view: function(name, attributes) {
      if (!scope.Views[name]) {
        throw new Error('view: ' + name + ' does not exist.');
      }
      return new scope.Views[name](attributes);
    }
  },{
    create: function(module, protoProps, classProps) {
      return scope.Routers[module.name] = new (this.extend(_.extend({}, module, protoProps), classProps));
    }
  });

  Thorax.Collection = Backbone.Collection.extend({
    
  },{
    create: function(name, protoProps, classProps) {
      protoProps.name = name;
      return scope.Collections[name] = this.extend(protoProps, classProps);
    }
  });

  Thorax.Model = Backbone.Model.extend({
    
  },{
    create: function(name, protoProps, classProps) {
      protoProps.name = name;
      return scope.Models[name] = this.extend(protoProps, classProps);
    }
  });

}).call(this);
