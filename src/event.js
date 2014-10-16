/*global $serverSide, createInheritVars, inheritVars, listenTo, objectEvents, walkInheritTree */
// Save a copy of the _on method to call as a $super method
var _on = Thorax.View.prototype.on;

var eventSplitter = /^(nested\s+)?(\S+)(?:\s+(.+))?/;

var domEvents = {},
    eventParamsCache = {};

(function(events) {
  _.each(events, function(event) { domEvents[event] = true; });
})([
  'touchstart', 'touchmove', 'touchend', 'touchcancel',
  'mouseenter', 'mouseleave', 'mousemove', 'mousedown', 'mouseup', 'mouseover', 'mouseout',
  'keydown', 'keyup', 'keypress',
  'contextmenu',
  'click', 'dblclick',
  'focusin', 'focusout', 'focus', 'blur',
  'submit', 'input', 'change',
  'dragstart', 'drag', 'dragenter', 'dragleave', 'dragover', 'drop', 'dragend',

  'singleTap', 'doubleTap', 'longTap',
  'swipe',
  'swipeUp', 'swipeDown',
  'swipeLeft', 'swipeRight'
]);

inheritVars.event = {
  name: '_events',

  configure: function(self) {
    walkInheritTree(self.constructor, '_events', true, function(event) {
      self.on.call(self, event[0], event[1]);
    });
    walkInheritTree(self, 'events', false, function(handler, eventName) {
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
      eventName = eventNameParams(eventName);

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
    var self = this;

    if (objectEvents(self, eventName, callback, context)) {
      return self;
    }

    if (_.isObject(eventName) && !eventName.type && arguments.length < 3) {
      //accept on({"rendered": callback})
      _.each(eventName, function(value, key) {
        self.on(key, value, callback || self);    // callback is context in this form of the call
      });
    } else {
      //accept on("rendered", callback, context)
      //accept on("click a", callback, context)
      function handleEvent(callback) {
        var params = eventParamsForInstance(eventName, self, callback, context || self);

        if (params.event.type === 'DOM') {
          // Avoid overhead of handling DOM events on the server
          if ($serverSide) {
            return;
          }

          //will call _addEvent during delegateEvents()
          if (!self._eventsToDelegate) {
            self._eventsToDelegate = [];
          }
          self._eventsToDelegate.push(params);
        }

        if (params.event.type !== 'DOM' || self._eventsDelegated) {
          self._addEvent(params);
        }
      }
      if (_.isArray(callback)) {
        _.each(callback, handleEvent);
      } else {
        handleEvent(callback);
      }
    }
    return self;
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
    _.each(this._eventsToDelegate, this._addEvent, this);
    this._eventsDelegated = true;
  },
  //params may contain:
  //- name
  //- originalName
  //- selector
  //- type "view" || "DOM"
  //- handler
  _addEvent: function(params) {
    // If this is recursvie due to listenTo delegate below then pass through to super class
    if (params.handler._thoraxBind) {
      return _on.call(this, params.event.name, params.handler, params.context || this);
    }

    // Shortcircuit DOM events on the server
    if ($serverSide && params.event.type !== 'view') {
      return;
    }

    var boundHandler = bindEventHandler(this, params.event.type + '-event:', params);

    if (params.event.type === 'view') {
      // If we have our context set to an outside view then listen rather than directly bind so
      // we can cleanup properly.
      if (params.context && params.context !== this && params.context instanceof Thorax.View) {
        listenTo(params.context, this, params.event.name, boundHandler, params.context);
      } else {
        _on.call(this, params.event.name, boundHandler, params.context || this);
      }
    } else {
      // DOM Events
      if (!params.event.nested) {
        boundHandler = containHandlerToCurentView(boundHandler, this);
      }

      var name = params.event.name + '.delegateEvents' + this.cid;
      if (params.event.selector) {
        this.$el.on(name, params.event.selector, boundHandler);
      } else {
        this.$el.on(name, boundHandler);
      }
    }
  }
});

Thorax.View.prototype.bind = Thorax.View.prototype.on;

// When view is ready trigger ready event on all
// children that are present, then register an
// event that will trigger ready on new children
// when they are added
Thorax.View.on('ready', function(options) {
  if (!this._isReady) {
    this._isReady = true;
    function triggerReadyOnChild(child) {
      child._isReady || child.trigger('ready', options);
    }
    _.each(this.children, triggerReadyOnChild);
    this.on('child', triggerReadyOnChild);
  }
});

function containHandlerToCurentView(handler, current) {
  // Passing the current view rather than just a cid to allow for updates to the view's cid
  // caused by the restore process.
  return function(event) {
    var view = $(event.target).view({el: true, helper: false});
    if (view[0] === current.el) {
      event.originalContext = this;
      return handler(event);
    }
  };
}

function bindEventHandler(view, eventName, params) {
  eventName += params.event.originalName;

  var callback = params.handler,
      method = typeof callback == 'string' ? view[callback] : callback;
  if (!method) {
    throw new Error('Event "' + callback + '" does not exist ' + (view.name || view.cid) + ':' + eventName);
  }

  var context = params.context || view,
      ret = Thorax.bindSection(
        'thorax-event',
        {view: context.name || context.cid, eventName: eventName},
        function() { return method.apply(context, arguments); });

  // Backbone will delegate to _callback in off calls so we should still be able to support
  // calling off on specific handlers.
  ret._callback = method;
  ret._thoraxBind = true;
  return ret;
}

function eventNameParams(name) {
  if (name.type) {
    return name;
  }

  var params = eventParamsCache[name];
  if (params) {
    return params;
  }

  params = eventNameParams[name] = {
    type: 'view',
    name: name,
    originalName: name,

    nested: false,
    selector: undefined
  };

  var match = name.match(eventSplitter);
  if (match && domEvents[match[2]]) {
    params.type = 'DOM';
    params.name = match[2];
    params.nested = !!match[1];
    params.selector = match[3];
  }
  return params;
}
function eventParamsForInstance(eventName, view, handler, context) {
  return {
    event: eventNameParams(eventName),
    context: context,
    handler: typeof handler == 'string' ? view[handler] : handler
  };
}
