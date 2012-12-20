/*global createInheritVars, inheritVars, objectEvents, walkInheritTree */
// Save a copy of the _on method to call as a $super method
var _on = Thorax.View.prototype.on;

inheritVars.event = {
  name: '_events',

  configure: function() {
    this._isReady = false;

    var self = this;
    walkInheritTree(this.constructor, '_events', true, function(event) {
      self.on.apply(self, event);
    });
    walkInheritTree(this, 'events', false, function(handler, eventName) {
      self.on(eventName, handler, self);
    });
  }
};

_.extend(Thorax.View, {
  on: function(eventName, callback) {
    createInheritVars(this);

    if (objectEvents(this, eventName, callback)) {
      return this;
    }

    //accept on({"rendered": handler})
    if (typeof eventName === 'object') {
      _.each(eventName, function(value, key) {
        this.on(key, value);
      }, this);
    } else {
      //accept on({"rendered": [handler, handler]})
      if (_.isArray(callback)) {
        _.each(callback, function(cb) {
          this._events.push([eventName, cb]);
        }, this);
      //accept on("rendered", handler)
      } else {
        this._events.push([eventName, callback]);
      }
    }
    return this;
  }
});

_.extend(Thorax.View.prototype, {
  freeze: function(options) {
    _.each(inheritVars, function(obj) {
      if (obj.unbind) {
        _.each(this[obj.array], this[obj.unbind], this);
      }
    }, this);

    options = _.defaults(options || {}, {
      dom: true,
      children: true
    });
    this._eventArgumentsToUnbind && _.each(this._eventArgumentsToUnbind, function(args) {
      args[0].off(args[1], args[2], args[3]);
    });
    this._eventArgumentsToUnbind = [];
    this.off();
    if (options.dom) {
      this.undelegateEvents();
    }
    this.trigger('freeze');
    if (options.children) {
      _.each(this.children, function(child) {
        child.freeze(options);
      }, this);
    }
  },
  trigger: function(events) {
    var events = events.split(/\s+/),
        rest = Array.prototype.slice.call(arguments, 1),
        event;
    while (event = events.shift()) {
      if (event === 'ready') {
        if (!this._isReady) {
          onBeforeReady.apply(this, rest);
          Backbone.View.prototype.trigger.apply(this, [event].concat(rest));
          onAfterReady.apply(this, rest);
        }
      } else {
        Backbone.View.prototype.trigger.apply(this, [event].concat(rest));
      }
    }
    return this;
  },
  on: function(eventName, callback, context) {
    if (objectEvents(this, eventName, callback)) {
      return this;
    }

    if (typeof eventName === 'object') {
      //accept on({"rendered": callback})
      if (arguments.length === 1) {
        _.each(eventName, function(value, key) {
          this.on(key, value, this);
        }, this);
      //events on other objects to auto dispose of when view frozen
      //on(targetObj, 'eventName', callback, context)
      } else if (arguments.length > 1) {
        if (!this._eventArgumentsToUnbind) {
          this._eventArgumentsToUnbind = [];
        }
        var args = Array.prototype.slice.call(arguments);
        this._eventArgumentsToUnbind.push(args);
        args[0].on.apply(args[0], args.slice(1));
      }
    } else {
      //accept on("rendered", callback, context)
      //accept on("click a", callback, context)
      _.each((_.isArray(callback) ? callback : [callback]), function(callback) {
        var params = eventParamsFromEventItem.call(this, eventName, callback, context || this);
        if (params.type === 'DOM') {
          //will call _addEvent during delegateEvents()
          if (!this._eventsToDelegate) {
            this._eventsToDelegate = [];
          }
          this._eventsToDelegate.push(params);
        } else {
          this._addEvent(params);
        }
      }, this);
    }
    return this;
  },
  delegateEvents: function(events) {
    this.undelegateEvents();
    if (events) {
      if (_.isFunction(events)) {
        events = events.call(this);
      }
      this._eventsToDelegate = [];
      this.on(events);
    }
    this._eventsToDelegate && _.each(this._eventsToDelegate, this._addEvent, this);
  },
  //params may contain:
  //- name
  //- originalName
  //- selector
  //- type "view" || "DOM"
  //- handler
  _addEvent: function(params) {
    var boundHandler;
    if (params.type === 'view') {
      boundHandler = bindEventHandler.call(this, 'view-event:' + params.originalName, params.handler);
      _.each(params.name.split(/\s+/), function(name) {
        if (name === 'ready' && this._isReady) {
          boundHandler.call(params.context || this);
        } else {
          _on.call(this, name, boundHandler, params.context || this);
        }
      }, this);
    } else {
      boundHandler = bindEventHandler.call(this, 'dom-event:' + params.originalName, params.handler);
      if (!params.nested) {
        boundHandler = containHandlerToCurentView(boundHandler, this.cid);
      }
      if (params.selector) {
        var name = params.name + '.delegateEvents' + this.cid;
        this.$el.on(name, params.selector, boundHandler);
      } else {
        this.$el.on(params.name, boundHandler);
      }
    }
  }
});

var eventSplitter = /^(nested\s+)?(\S+)(?:\s+(.+))?/;

var domEvents = [],
    domEventRegexp;
function pushDomEvents(events) {
  domEvents.push.apply(domEvents, events);
  domEventRegexp = new RegExp('^(' + domEvents.join('|') + ')');
}
pushDomEvents([
  'mousedown', 'mouseup', 'mousemove', 'mouseover', 'mouseout',
  'touchstart', 'touchend', 'touchmove',
  'click', 'dblclick',
  'keyup', 'keydown', 'keypress',
  'submit', 'change',
  'focus', 'blur'
]);

function containHandlerToCurentView(handler, cid) {
  return function(event) {
    var view = $(event.target).view({helper: false});
    if (view && view.cid === cid) {
      event.originalContext = this;
      handler(event);
    }
  };
}

function bindEventHandler(eventName, callback) {
  var method = typeof callback === 'function' ? callback : this[callback];
  if (!method) {
    throw new Error('Event "' + callback + '" does not exist ' + (this.name || this.cid) + ':' + eventName);
  }
  return _.bind(function() {
    try {
      method.apply(this, arguments);
    } catch (e) {
      Thorax.onException('thorax-exception: ' + (this.name || this.cid) + ':' + eventName, e);
    }
  }, this);
}

function eventParamsFromEventItem(name, handler, context) {
  var params = {
    originalName: name,
    handler: typeof handler === 'string' ? this[handler] : handler
  };
  if (name.match(domEventRegexp)) {
    var match = eventSplitter.exec(name);
    params.nested = !!match[1];
    params.name = match[2];
    params.type = 'DOM';
    params.selector = match[3];
  } else {
    params.name = name;
    params.type = 'view';
  }
  params.context = context;
  return params;
}

Thorax.View.on({
  child: function(instance) {
    if (this._isReady) {
      instance.trigger('ready');
    } else {
      // TODO: once backbone-0.9.9 is merged
      // use 'once'
      var callback = function() {
        instance.trigger('ready');
        this.off('ready', callback, this);
      };
      this.on('ready', callback, this);
    }
  }
})

function onBeforeReady() {
  this.ensureRendered();
  this._isReady = true;
}

function onAfterReady() {
  _.each(this.children, function(child, cid) {
    if (!child._isReady) {
      child.trigger('ready');
    }
  });
}
