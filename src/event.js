/*global createInheritVars, inheritVars, objectEvents, walkInheritTree */
// Save a copy of the _on method to call as a $super method
var _on = Thorax.View.prototype.on;

inheritVars.event = {
  name: '_events',

  configure: function() {
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
    if (_.isObject(eventName)) {
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
  on: function(eventName, callback, context) {
    if (objectEvents(this, eventName, callback, context)) {
      return this;
    }

    if (_.isObject(eventName) && arguments.length < 3) {
      //accept on({"rendered": callback})
      _.each(eventName, function(value, key) {
        this.on(key, value, callback || this);    // callback is context in this form of the call
      }, this);
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
    if (params.type === 'view') {
      _.each(params.name.split(/\s+/), function(name) {
        // Must pass context here so stopListening will clean up our junk
        _on.call(this, name, bindEventHandler.call(this, 'view-event:', params), params.context || this);
      }, this);
    } else {
      var boundHandler = bindEventHandler.call(this, 'dom-event:', params);
      if (!params.nested) {
        boundHandler = containHandlerToCurentView(boundHandler, this.cid);
      }

      var name = params.name + '.delegateEvents' + this.cid;
      if (params.selector) {
        this.$el.on(name, params.selector, boundHandler);
      } else {
        this.$el.on(name, boundHandler);
      }
    }
  }
});

// When view is ready trigger ready event on all
// children that are present, then register an
// event that will trigger ready on new children
// when they are added
Thorax.View.on('ready', function(options) {
  if (!this._isReady) {
    this._isReady = true;
    function triggerReadyOnChild(child) {
      child.trigger('ready', options);
    }
    _.each(this.children, triggerReadyOnChild);
    this.on('child', triggerReadyOnChild);
  }
});

var eventSplitter = /^(nested\s+)?(\S+)(?:\s+(.+))?/;

var domEvents = [],
    domEventRegexp;
function pushDomEvents(events) {
  domEvents.push.apply(domEvents, events);
  domEventRegexp = new RegExp('^(nested\\s+)?(' + domEvents.join('|') + ')(?:\\s|$)');
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

function bindEventHandler(eventName, params) {
  eventName += params.originalName;

  var callback = params.handler,
      method = _.isFunction(callback) ? callback : this[callback];
  if (!method) {
    throw new Error('Event "' + callback + '" does not exist ' + (this.name || this.cid) + ':' + eventName);
  }

  var context = params.context || this;
  function ret() {
    try {
      method.apply(context, arguments);
    } catch (e) {
      Thorax.onException('thorax-exception: ' + (context.name || context.cid) + ':' + eventName, e);
    }
  }
  // Backbone will delegate to _callback in off calls so we should still be able to support
  // calling off on specific handlers.
  ret._callback = method;
  return ret;
}

function eventParamsFromEventItem(name, handler, context) {
  var params = {
    originalName: name,
    handler: _.isString(handler) ? this[handler] : handler
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
