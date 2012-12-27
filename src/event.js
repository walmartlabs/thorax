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
    _.each(this._boundDataObjectsByCid, this.unbindDataObject, this);
    options = _.defaults(options || {}, {
      dom: true,
      children: true
    });
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
  on: function(eventName, callback, context) {
    if (objectEvents(this, eventName, callback, context)) {
      return this;
    }

    if (typeof eventName === 'object' && arguments.length < 3) {
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
        _on.call(this, name, bindEventHandler.call(this, 'view-event:', params));
      }, this);
    } else {
      var boundHandler = bindEventHandler.call(this, 'dom-event:', params);
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

// propagate ready event to children
function triggerReady(view) {
  view.trigger('ready');
}

// When view is ready trigger ready event on all
// children that are present, then register an
// event that will trigger ready on new children
// when they are added
Thorax.View.on('ready', function() {
  if (!this._isReady) {
    this._isReady = true;
    _.each(this.children, triggerReady);
    this.on('child', triggerReady);
  }
});

var eventSplitter = /^(nested\s+)?(\S+)(?:\s+(.+))?/;

var domEvents = [],
    domEventRegexp;
function pushDomEvents(events) {
  domEvents.push.apply(domEvents, events);
  domEventRegexp = new RegExp('^(' + domEvents.join('|') + ')(?:\\s|$)');
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
      method = typeof callback === 'function' ? callback : this[callback];
  if (!method) {
    throw new Error('Event "' + callback + '" does not exist ' + (this.name || this.cid) + ':' + eventName);
  }
  return _.bind(function() {
    try {
      method.apply(this, arguments);
    } catch (e) {
      Thorax.onException('thorax-exception: ' + (this.name || this.cid) + ':' + eventName, e);
    }
  }, params.context || this);
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
