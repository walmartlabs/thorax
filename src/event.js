var _destroy = Thorax.View.prototype.destroy,
    _on = Thorax.View.prototype.on,
    _delegateEvents = Thorax.View.prototype.delegateEvents;

{{#inject "configure"}}
  //_events not present on HelperView
  this.constructor._events && this.constructor._events.forEach(function(event) {
    this.on.apply(this, event);
  }, this);
  if (this.events) {
    _.each(Thorax.Util.getValue(this, 'events'), function(handler, eventName) {
      this.on(eventName, handler, this);
    }, this);
  }
{{/inject}}

{{#inject "extend"}}
  Thorax.Util._cloneEvents(this, child, '_events');
{{/inject}}

_.extend(Thorax.View, {
  _events: [],
  on: function(eventName, callback) {
    {{{override.on}}}
    //accept on({"rendered": handler})
    if (typeof eventName === 'object') {
      _.each(eventName, function(value, key) {
        this.on(key, value);
      }, this);
    } else {
      //accept on({"rendered": [handler, handler]})
      if (_.isArray(callback)) {
        callback.forEach(function(cb) {
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
    options = _.defaults(options || {}, {
      dom: true,
      children: true
    });
    this._eventArgumentsToUnbind && this._eventArgumentsToUnbind.forEach(function(args) {
      args[0].off(args[1], args[2], args[3]);
    });
    this._eventArgumentsToUnbind = [];
    this.off();
    if (options.dom) {
      this.undelegateEvents();
    }
    this.trigger('freeze');
    if (options.children) {
      _.each(this.children, function(child, id) {
        child.freeze(options);
      }, this);
    }
  },
  destroy: function() {
    var response = _destroy.apply(this, arguments);
    this.freeze();
    return response;
  },
  on: function(eventName, callback, context) {
    {{{override.on}}}
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
      (_.isArray(callback) ? callback : [callback]).forEach(function(callback) {
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
    this._eventsToDelegate && this._eventsToDelegate.forEach(this._addEvent, this);
  },
  //params may contain:
  //- name
  //- originalName
  //- selector
  //- type "view" || "DOM"
  //- handler
  _addEvent: function(params) {
    if (params.type === 'view') {
      params.name.split(/\s+/).forEach(function(name) {
        _on.call(this, name, bindEventHandler.call(this, 'view-event:' + params.name, params.handler), params.context || this);
      }, this);
    } else {
      var boundHandler = containHandlerToCurentView(bindEventHandler.call(this, 'dom-event:' + params.name, params.handler), this.cid);
      if (params.selector) {
        //TODO: determine why collection views and some nested views
        //need defered event delegation
        var name = params.name + '.delegateEvents' + this.cid;
        if (typeof jQuery !== 'undefined' && $ === jQuery) {
          _.defer(_.bind(function() {
            this.$el.on(name, params.selector, boundHandler);
          }, this));
        } else {
          this.$el.on(name, params.selector, boundHandler);
        }
      } else {
        this.$el.on(name, boundHandler);
      }
    }
  }
});

var eventSplitter = /^(\S+)(?:\s+(.+))?/;

var domEvents = [
  'mousedown', 'mouseup', 'mousemove', 'mouseover', 'mouseout',
  'touchstart', 'touchend', 'touchmove',
  'click', 'dblclick',
  'keyup', 'keydown', 'keypress',
  'submit', 'change',
  'focus', 'blur'
  {{#has-plugin "mobile"}}
    ,
    'singleTap', 'doubleTap', 'longTap',
    'swipe',
    'swipeUp', 'swipeDown',
    'swipeLeft', 'swipeRight'
  {{/has-plugin}}
];
var domEventRegexp = new RegExp('^(' + domEvents.join('|') + ')');

function containHandlerToCurentView(handler, cid) {
  return function(event) {
    var view = $(event.target).view({helper: false});
    if (view && view.cid == cid) {
      handler(event);
    }
  }
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
    params.name = match[1];
    params.type = 'DOM';
    params.selector = match[2];
  } else {
    params.name = name;
    params.type = 'view';
  }
  params.context = context;
  return params;
}
