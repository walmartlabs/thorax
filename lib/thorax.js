(function(){

  //TODO check
  if (typeof this._ === 'undefined') {
    throw new Error('Underscore.js required to run Thorax');
  }

  if (typeof this.Backbone === 'undefined') {
    throw new Error('Backbone.js required to run Thorax');
  }

  var Thorax, scope;

  this.Thorax = Thorax = {
    configure: function(options, callback) {
      scope = options.scope || Thorax;

      _.extend(scope, {
        templates: {},
        Views: {},
        Mixins: {}
      });

      Backbone.history = new Thorax.History();

      $(document).ready(function() {
        scope.layout = createLayout(options);
        if (callback) {
          callback();
        }
      });
    }
  };

  //private methods / attributes used by Thorax.View
  var eventSplitter = /^(\S+)\s*(.*)$/,

    //load event setup
    pendingLoadSize = 0,
    loadStartEventEmitter = function() {
      pendingLoadSize++;
      this._loadStartTimeout = setTimeout(_.bind(function() {
        pendingLoadSize--;
        this.trigger('load:start');
      }, this), this._loadingTimeoutDuration * 1000);
    },
    loadEndEventEmitter = function() {
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
    },

    containHandlerToCurentView = function(handler, cid) {
      return function(event) {
        var containing_view_element = $(event.target).closest('[data-view]');
        if (containing_view_element.length === 0 || containing_view_element.length > 0 && containing_view_element[0].getAttribute('data-cid') == cid) {
          handler(event);
        }
      };
    },

    //model/collection events, to be bound/unbound on setModel/setCollection
    processModelOrCollectionEvent = function(events, type) {
      for (var _name in events[type] || {}) {
        if (_.isArray(events[type][_name])) {
          for (var i = 0; i < events[type][_name].length; ++i) {
            this._events[type].push([_name, this._bindEventHandler(events[type][_name][i])]);
          }
        } else {
          this._events[type].push([_name, this._bindEventHandler(events[type][_name])]);
        }
      }
    },

    //used by _processEvents
    processEvent = function(name, handler) {
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
    },

    //used by Thorax.View.addEvents for global event registration
    addEvent = function(target, name, handler) {
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
    },

    resetSubmitState = function() {
      this.$('form').removeAttr('data-submit-wait');
    },

    //called with context of input
    getInputValue = function() {
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
    },

    bindModelAndCollectionEvents = function(events) {
      if (!this._events) {
        this._events = {
          model: [],
          collection: []
        };
      }
      processModelOrCollectionEvent.call(this, events, 'model');
      processModelOrCollectionEvent.call(this, events, 'collection');
    },

    getCollectionElement = function() {
      var selector = this._collectionSelector || '.collection';
      var element = this.$(selector);
      if (element.length === 0) {
        console.error(this.name + ' collection element selector: "' + selector + '" returned empty.');
        return false;
      } else {
        return element;
      }
    },

    preserveCollectionElement = function(callback) {
      var old_collection_element = getCollectionElement.call(this);
      callback.call(this);
      var new_collection_element = getCollectionElement.call(this);
      if (old_collection_element.length && new_collection_element.length) {
        new_collection_element[0].parentNode.insertBefore(old_collection_element[0], new_collection_element[0]);
        new_collection_element[0].parentNode.removeChild(new_collection_element[0]);
      }
    },

    appendViews = function() {
      for (var id in this._views || {}) {
        var view_placeholder_element = this.$('[data-view-tmp="' + id + '"]')[0];
        if (view_placeholder_element) {
          var view = this._views[id];
          //has the view been rendered at least once? if not call render().
          //subclasses overriding render() that do not call the parent's render()
          //or set _rendered may be rendered twice but will not error
          if (!view._rendered) {
            view.render();
          }
          view_placeholder_element.parentNode.insertBefore(view.el, view_placeholder_element);
          view_placeholder_element.parentNode.removeChild(view_placeholder_element);
        }
      }
    };
  
  Thorax.View = Backbone.View.extend({
    _configure: function(options) {
      Backbone.View.prototype._configure.call(this, options);
      bindModelAndCollectionEvents.call(this, this.constructor.events);
      for (var i = 0; i < this.constructor.mixins.length; ++i) {
        this.mixin(this.constructor.mixins[i]);
      }
      if (this.events) {
        bindModelAndCollectionEvents.call(this, this.events);
      }
      if (options.model) {
        this.setModel(options.model);
      }
      if (options.collection) {
        this.setCollection(options.collection);
      }
    },

    //add class name, data-view and data-cid properties
    _ensureElement : function() {
      Backbone.View.prototype._ensureElement.call(this);
      if (this.name) {
        (this.el[0] || this.el).setAttribute('data-view', this.name);
      }
      (this.el[0] || this.el).setAttribute('data-cid', this.cid);      
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
      if (!this._views) {
        this._views = {};
      }
      var instance = typeof name === 'string' ? new scope.Views[name](options) : name;
      this._views[instance.cid] = instance;
      return instance;
    },
    
    template: function(file, data) {
      data = _.extend({}, (this.options ? this.options : {}), data || {}, {
        cid: _.uniqueId('t'),
        parentScope: this
      });
  
      var template, templateName, fileName = file + (file.match(/\.handlebars$/) ? '' : '.handlebars');  
      templateName = 'templates/' + fileName;
      template = scope.templates[templateName];
  
      if (!template) {
        console.warn('Unable to find template ' + templateName);
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
        if (this.collection) {
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
      options = _.extend({
        fetch: true,
        success: false,
        render: true,
        populate: true,
        errors: true,
        loading: true
      },options || {});
  
      if (this.model) {
        this._events.model.forEach(function(event) {
          this.model.unbind(event[0], event[1]);
        }, this);
      }
  
      this.model = model;
  
      this._modelOptions = options;
  
      if (this.model) {
        this._events.model.forEach(function(event) {
          this.model.bind(event[0], event[1]);
        }, this);
    
        if (this._shouldFetch(this.model, options)) {
          this.model.fetch({
            success: _.once(_.bind(function(){
              if (options.success) {
                options.success(model);
              }
            },this))
          });
        }
        this.model.trigger('change');
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
  
      if (this.collection) {
        this._events.collection.forEach(function(event) {
          this.collection.unbind(event[0], event[1]);
        }, this);
      }
  
      this.collection = collection;
      this._collectionOptions = options;
  
      if (this.collection) {
        this._events.collection.forEach(function(event) {
          this.collection.bind(event[0], event[1]);
        }, this);
      
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

    itemContext: function(item) {
      return item.attributes;
    },

    render: function() {
      this._rendered = true;
      var output = this.template(this.name + '.handlebars', this.context(this.model));
      this.html(output);
      this.trigger('rendered');
      return output;
    },
  
    renderCollection: function() {
      this.render();
      var collection_element = getCollectionElement.call(this);
      if (this.collection.length == 0) {
        var empty_view = this.renderEmpty();
        collection_element.html(empty_view.el || empty_view || '');
      } else {
        var cids = [];
        var elements = this.collection.map(function(model) {
          cids.push(model.cid);
          return this.renderItem(model);
        }, this);
        if (elements[0] && elements[0].el) {
          elements.forEach(function(view) {
            collection_element.append(view.el);
          });
        } else {
          collection_element.html(elements.join(''));
        }
        collection_element.children().each(function(i) {
          this.setAttribute('data-collection-item', cids[i]);
        });
      }
    },
  
    renderItem: function(item) {
      return this.template(this.name + '-item.handlebars', this.itemContext(item));
    },
  
    renderEmpty: function() {
      return this.template(this.name + '-empty.handlebars');
    },
  
    freeze: function() {
      if (this.collection && this._events && this._events.collection) {
        this._events.collection.forEach(function(event) {
          this.collection.unbind(event[0], event[1]);
        }, this);
      }

      if (this.model && this._events && this._events.model) {
        this._events.model.forEach(function(event) {
          this.model.unbind(event[0], event[1]);
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
  
      this.$('select,input,textarea').each(function(){
        if (this.type === 'button' || this.type === 'cancel' || this.type === 'submit') {
          return;
        }
        var object = attributes;
        var keys = this.name.split('[');
        var key;
        for(var i = 0; i < keys.length - 1; ++i) {
          key = keys[i].replace(']','');
          if (!object[key]) {
            object[key] = {};
          }
          object = object[key];
        }
        key = keys[keys.length - 1].replace(']','');
        var value = getInputValue.call(this);
        if (typeof value !== 'undefined') {
          object[key] = value;
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
      var attributes = attributes || (typeof this.attributes === 'function' ? this.attributes(this.model) : this.attributes || {});
      var iterate = function(object,prefix,nested) {
        _.each(object,function(value,key) {
          if (typeof value === 'object') {
            iterate.call(this,value,prefix + key + '[',true);
          } else {
            var inputs = this.$('[name="' + prefix + key + (nested ? ']' : '') + '"]');
            if (inputs.length) {
              inputs.each(function(){
                if (this.type === 'checkbox' && _.isBoolean(value)) {
                  this.checked = value;
                } else if (this.type === 'checkbox' || this.type === 'radio') {
                  this.checked = value == this.value;
                } else {
                  this.value = value;
                }
              });
            }
          }
        },this);
      };
  
      iterate.call(this,attributes,'',false);
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
      for (var id in this._views || {}) {
        if (this._views[id].destroy) {
          this._views[id].destroy();
        }
        this._views[id] = null;
      }
      this.trigger('destroyed');
    },

    //loading config
    _loadingClassName: 'loading',
    _loadingTimeoutDuration: 0.33
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
    error: function() {
      window.scrollTo(0, 0);
  
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
    'submit form': function(event) {
      // Hide any virtual keyboards that may be lingering around
      var focused = $(':focus')[0];
      focused && focused.blur();
    },
    'change .form-field input[type="checkbox"]': function(event) {
      // don't process the change events on checkboxes
      event.stopPropagation();
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
        var index = this.collection.indexOf(model);
        var collection_element = getCollectionElement.call(this);
        var item_view = this.renderItem(model);
        var previous_model = this.collection.at(index - 1);
        if (!previous_model) {
          collection_element.prepend(item_view.el || item_view || '');
          collection_element.children().first().attr('data-collection-item', model.cid);
        } else {
          var previous_model_element = collection_element.find('[data-collection-item="' + previous_model.cid + '"]');
          previous_model_element.append(item_view.el || item_view);
          previous_model_element.next().attr('data-collection-item', model.cid);
        }
      },
      remove: function(model) {
        this.$('[data-collection-item="' + model.cid + '"]').remove();
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
    var instance = this.parentScope.view(view, options);
    return '<div data-view-tmp="' + instance.cid + '"></div>';
  });
  
  Thorax.View.registerHelper('template', function(name) {
    return new SafeString(Thorax.View.prototype.template.call(this.parentScope, name, this));
  });

  var _resetElementAnimationStyles = function(element) {
    element.style.webkitTransition = null;
    element.style.webkitTransform = null;
    element.style.webkitTransitionDuration = null;
    element.style.webkitTransitionTimingFunction = null;
    element.style.webkitTransitionDelay = null;
  
    element.style.zIndex = '';
    element.style.left = '0px';
    element.style.top = '0px';
  };

  var createLayout = function(options) {
    var layout = Backbone.View.extend({
      el: options.layout || '.layout',
      initialize: function(){
        this.el = $(this.el)[0];
    
        //setup cards container
        this._viewsElement = this.make('div', {
          'class': 'views'
        });
        this.el.appendChild(this._viewsElement);
    
        //transition mode setup
        this._forceTransitionMode = false;
        this._transitionMode = this.forwardsTransitionMode;
    
        //track history direction for transition mode
        this._historyDirection = 'forwards';
        Backbone.history.bind('route',_.bind(function(fragment,index){
          this._historyDirection = index >= 0 ? 'forwards' : 'backwards';
        },this));
      },
      
      setNextTransitionMode: function(transition_mode){
        this._forceTransitionMode = true;
        this._transitionMode = transition_mode;
      },

      setView: function(view, params){
        var old_view = this.view;
    
        if(view == old_view){
          return;
        }
    
        if(params && params.transition){
          this.setNextTransitionMode(params.transition);
        }
    
        // Read any reflow possible fields that we may need prior to dirtying the layout
        var scrollTop = document.body.scrollTop,
            clientWidth = this.el.clientWidth,
            clientHeight = this.el.clientHeight;
    
        old_view && old_view.trigger('deactivated');
    
        this._viewsElement.appendChild(view.el);
        view.trigger('activated', params || {});
        
        //set transition mode
        var transition_mode = this._forceTransitionMode
          ? this._transitionMode
          : this._historyDirection === 'backwards'
            ? this.backwardsTransitionMode
            : this._transitionMode || this.forwardsTransitionMode
        ;
        this._forceTransitionMode = false;
    
        var completeTransition = function() {
          $(this.el).removeClass('transitioning');
          // Force a scroll again to prevent Android from attempting to restore the scroll
          // position for the back transitions.
          window.scrollTo(0, 0);
    
          if (old_view && old_view.el.parentNode) {
            $(old_view.el).remove();
          }
    
          this.view = view;
    
          this._transitionMode = this.forwardsTransitionMode;
    
          // Execute the events on the next iter. This gives things a chance
          // to settle and also protects us from NPEs in callback resulting in
          // an unremoved listeners
          setTimeout(_.bind(function() {
            if (old_view) {
              old_view.destroy();
            }
            this.view.trigger('ready');
            this.trigger('change:view:end', view, old_view);
          }, this), 0);
        };
    
        this.trigger('change:view:start', view, old_view);
        if (this._transitionMode == 'none' || !old_view) {
          // None or first view, no transition
          completeTransition.call(this);
        } else {
          $(this.el).addClass('transitioning');
          this._reset(view.el, scrollTop);
    
          //animated transition
          this['_' + transition_mode](old_view.el, view.el, clientWidth, clientHeight, _.bind(completeTransition, this));
        }
    
        return view;
      },

      //transitions
      //position next view on right and slide right to it
      _slideRight: function(old_view_element, new_view_element, clientWidth, clientHeight, callback){
        var _viewsElement = this._viewsElement;
        if(!_viewsElement.style.webkitTransform){
          _viewsElement.style.webkitTransform = 'translateX(' + clientWidth + 'px)';
        }
        _viewsElement.style.left = '-' + clientWidth + 'px';
        new_view_element.style.left = clientWidth + 'px';
    
        this._transitionCleanup(new_view_element, callback);
    
        _viewsElement.clientWidth;   // It flows and flows. Needed to trigger the transition
        _viewsElement.style.webkitTransform = 'translateX(0px)';
        _viewsElement.style.webkitTransition = '-webkit-transform ' + this.transition;
      },

      //position next view on left and slide left to it
      _slideLeft: function(old_view_element, new_view_element, clientWidth, clientHeight, callback){
        var _viewsElement = this._viewsElement;
        old_view_element.style.left = clientWidth + 'px';
        _viewsElement.style.left = '-' + clientWidth + 'px';
    
        this._transitionCleanup(new_view_element, callback);
    
        _viewsElement.clientWidth;   // It flows and flows. Needed to trigger the transition
        _viewsElement.style.webkitTransform = 'translateX(' + clientWidth + 'px)';
        _viewsElement.style.webkitTransition = '-webkit-transform ' + this.transition;
      },

      //position next view below and slide it up over the previous view
      _slideUp: function(old_view_element, new_view_element, clientWidth, clientHeight, callback){
        //TODO: slideUp and slide down happening faster on second pass
        old_view_element.style.zIndex = 1;
        new_view_element.style.zIndex = 2;
        new_view_element.style.top = clientHeight + 'px';
    
        this._transitionCleanup(new_view_element, callback);
    
        this._viewsElement.clientWidth;   // It flows and flows. Needed to trigger the transition
        new_view_element.style.webkitTransform = 'translateY(-' + clientHeight + 'px)';
        new_view_element.style.webkitTransition = '-webkit-transform ' + this.transition;
      },

      //position next view underneath the current view and slide the current view down
      _slideDown: function(old_view_element, new_view_element, clientWidth, clientHeight, callback){
        //TODO: slideUp and slide down happening faster on second pass
        old_view_element.style.zIndex = 2;
        new_view_element.style.zIndex = 1;
        new_view_element.style.top = '0px';
    
        this._transitionCleanup(new_view_element, callback);
    
        this._viewsElement.clientWidth;   // It flows and flows. Needed to trigger the transition
        old_view_element.style.webkitTransform = 'translateY(' + clientHeight + 'px)';
        old_view_element.style.webkitTransition = '-webkit-transform ' + this.transition;
      },
    
      _reset: function(new_view_element, scrollTop) {
        _resetElementAnimationStyles(new_view_element);
        _resetElementAnimationStyles(this._viewsElement);
        this.trigger('reset', new_view_element, scrollTop);
      },

      _transitionCleanup: function(new_view_element, callback) {
        var self = this;
        $(this._viewsElement).one('webkitTransitionEnd', function() {
          self._reset(new_view_element);
    
          callback();
        });
      },
      transition: '333ms ease-in-out',
      forwardsTransitionMode: 'slideRight',
      backwardsTransitionMode: 'slideLeft'
    });
    return new layout;
  };

  // Thorax.History
  // --------------

  // Handles cross-browser history management, based on URL fragments. If the
  // browser does not support `onhashchange`, falls back to polling.
  Thorax.History = function() {
    this.handlers = [];
    _.bindAll(this, 'checkUrl');
  };

  // Cached regex for cleaning hashes.
  var hashStrip = /^(?:#|%23)*\d*(?:#|%23)*/;

  // Cached regex for index extraction from the hash
  var indexMatch = /^(?:#|%23)*(\d+)(?:#|%23)/;

  // Cached regex for detecting MSIE.
  var isExplorer = /msie [\w.]+/;

  // Regex for detecting webkit version
  var webkitVersion = /WebKit\/([\d.]+)/;

  // Has the history handling already been started?
  var historyStarted = false;

  // Set up all inheritable **Backbone.History** properties and methods.
  _.extend(Thorax.History.prototype, Backbone.Events, {

    // The default interval to poll for hash changes, if necessary, is
    // twenty times a second.
    interval: 50,

    // Get the location of the current route within the backbone history.
    // This should be considered a hint
    // Returns -1 if history is unknown or disabled
    getIndex : function() {
      return this._directionIndex;
    },

    // Get the cross-browser normalized URL fragment, either from the URL,
    // the hash, or the override.
    getFragment : function(fragment, forcePushState) {
      if (fragment == null) {
        if (this._hasPushState || forcePushState) {
          fragment = window.location.pathname;
          var search = window.location.search;
          if (search) fragment += search;
        } else {
          fragment = window.location.hash;
        }
      }
      fragment = decodeURIComponent(fragment.replace(hashStrip, ''));
      if (!fragment.indexOf(this.options.root)) fragment = fragment.substr(this.options.root.length);
      return fragment;
    },

    // Start the hash change handling, returning `true` if the current URL matches
    // an existing route, and `false` otherwise.
    start : function(options) {

      // Figure out the initial configuration. Do we need an iframe?
      // Is pushState desired ... is it available?
      if (historyStarted) throw new Error("Backbone.history has already been started");
      this.options          = _.extend({}, {root: '/'}, this.options, options);
      this._wantsPushState  = !!this.options.pushState;
      this._hasPushState    = !!(this.options.pushState && window.history && window.history.pushState);
      var fragment          = this.getFragment();
      var docMode           = document.documentMode;
      var oldIE             = (isExplorer.exec(navigator.userAgent.toLowerCase()) && (!docMode || docMode <= 7));
      if (oldIE) {
        this.iframe = $('<iframe src="javascript:0" tabindex="-1" />').hide().appendTo('body')[0].contentWindow;
        this.navigate(fragment);
      }

      // If we are in hash mode figure out if we are on a browser that is hit by 63777
      //     https://bugs.webkit.org/show_bug.cgi?id=63777
      if (!this._hasPushState && window.history && window.history.replaceState) {
        var webkitVersion = /WebKit\/([\d.]+)/.exec(navigator.userAgent);
        if (webkitVersion) {
          webkitVersion = parseFloat(webkitVersion[1]);
          this._useReplaceState = webkitVersion < 535.2;
        }
      }

      // Depending on whether we're using pushState or hashes, and whether
      // 'onhashchange' is supported, determine how we check the URL state.
      if (this._hasPushState) {
        $(window).bind('popstate', this.checkUrl);
      } else if ('onhashchange' in window && !oldIE) {
        $(window).bind('hashchange', this.checkUrl);
      } else {
        setInterval(this.checkUrl, this.interval);
      }

      // Determine if we need to change the base url, for a pushState link
      // opened by a non-pushState browser.
      this.fragment = fragment;
      historyStarted = true;
      var loc = window.location;
      var atRoot  = loc.pathname == this.options.root;
      if (this._wantsPushState && !this._hasPushState && !atRoot) {
        this.fragment = this.getFragment(null, true);
        window.location.replace(this.options.root + '#' + this.fragment);
        // Return immediately as browser will do redirect to new url
        return true;
      } else if (this._wantsPushState && this._hasPushState && atRoot && loc.hash) {
        this.fragment = loc.hash.replace(hashStrip, '');
        window.history.replaceState({}, document.title, loc.protocol + '//' + loc.host + this.options.root + this.fragment);
      }

      // Direction tracking setup
      this._trackDirection  = !!this.options.trackDirection;
      if (this._trackDirection) {
        var loadedIndex = this.loadIndex();
        this._directionIndex  = loadedIndex || window.history.length;
        this._state = {index: this._directionIndex};

        // If we are tracking direction ensure that we have a direction field to play with
        if (!loadedIndex) {
          if (!this._hasPushState) {
            loc.replace(loc.pathname + (loc.search || '') + '#' + this._directionIndex + '#' + this.fragment);
          } else {
            window.history.replaceState({index: this._directionIndex}, document.title, loc);
          }
        }
      }
      if (!this.options.silent) {
        return this.loadUrl();
      }
    },

    // Add a route to be tested when the fragment changes. Routes added later may
    // override previous routes.
    route : function(route, callback) {
      this.handlers.unshift({route : route, callback : callback});
    },

    // Checks the current URL to see if it has changed, and if it has,
    // calls `loadUrl`, normalizing across the hidden iframe.
    checkUrl : function(e) {
      var current = this.getFragment();
      var fromIframe;
      if (current == this.fragment && this.iframe) {
        current = this.getFragment(this.iframe.location.hash);
        fromIframe = true;
      }
      if (current == this.fragment || current == decodeURIComponent(this.fragment)) return false;

      this._state = e && (e.originalEvent || e).state;
      var loadedIndex = this.loadIndex(fromIframe && this.iframe.location.hash);
      if (!loadedIndex) {
        this.navigate(current, false, true, this._directionIndex+1);
      } else if (this.iframe) {
        this.navigate(current, false, false, loadedIndex);
      }

      this.loadUrl() || this.loadUrl(window.location.hash);
    },

    // Attempt to load the current URL fragment. If a route succeeds with a
    // match, returns `true`. If no defined routes matches the fragment,
    // returns `false`.
    loadUrl : function(fragmentOverride) {
      var history = this;
      var fragment = this.fragment = this.getFragment(fragmentOverride);

      var matched = _.any(this.handlers, function(handler) {
        if (handler.route.test(fragment)) {
          if (history._ignoreChange) {
            history._ignoreChange = false;
            history._directionIndex  = history.loadIndex();
            return true;
          }

          var oldIndex = history._directionIndex;
          history._directionIndex  = history.loadIndex();
          history.trigger('route', fragment, history._directionIndex-oldIndex);

          handler.callback(fragment);
          return true;
        }
      });

      return matched;
    },

    // Pulls the direction index out of the state or hash
    loadIndex : function(fragmentOverride) {
      if (!this._trackDirection) return;
      if (!fragmentOverride && this._hasPushState) {
        return (this._state && this._state.index) || 0;
      } else {
        var match = indexMatch.exec(fragmentOverride || window.location.hash);
        return (match && parseInt(match[1], 10)) || 0;
      }
    },

    // Save a fragment into the hash history. You are responsible for properly
    // URL-encoding the fragment in advance. This does not trigger
    // a `hashchange` event.
    navigate : function(fragment, triggerRoute, replace, forceIndex) {
      var frag = (fragment || '').replace(hashStrip, '');
      var loc = window.location;
      if (this.fragment == frag || this.fragment == decodeURIComponent(frag)) return;

      // Figure out the direction index if enabled
      var newIndex;
      if (this._trackDirection) {
        newIndex = forceIndex || (this._directionIndex + (replace ? 0 : 1));
      }

      if (this._hasPushState) {
        if (frag.indexOf(this.options.root) != 0) frag = this.options.root + frag;
        this.fragment = frag;

        var history = window.history;
        this._state = {index: newIndex};
        history[replace ? 'replaceState' : 'pushState'](this._state, document.title, loc.protocol + '//' + loc.host + frag);
      } else {
        this.fragment = frag;
        if (this._trackDirection) frag = newIndex + '#' + frag;
        if (replace) {
          if (this._useReplaceState) {
            window.history.replaceState({}, document.title, loc.protocol + '//' + loc.host + loc.pathname + (loc.search || '') + '#' + frag);
          } else {
            loc.replace(loc.pathname + (loc.search || '') + '#' + frag);
          }
        } else {
          loc.hash = frag;
        }

        if (this.iframe && (frag != this.getFragment(this.iframe.location.hash))) {
          !replace && this.iframe.document.open().close();
          this.iframe.location.hash = frag;
        }
      }
      if (triggerRoute) this.loadUrl(fragment);
    },

    back : function(triggerRoute) {
      this.go(-1, triggerRoute);
    },
    foward : function(triggerRoute) {
      this.go(1, triggerRoute);
    },
    go : function(count, triggerRoute) {
      this._ignoreChange = !triggerRoute;

      window.history.go(count);
    }
  });

}).call(this);
