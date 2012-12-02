var isMobile = 'ontouchstart' in document.documentElement,
    isiOS = navigator.userAgent.match(/(iPhone|iPod|iPad)/i),
    isAndroid = navigator.userAgent.toLowerCase().indexOf("android") > -1 ? 1 : 0,
    minimumScrollYOffset = isAndroid ? 1 : 0;

Thorax.Util.scrollTo = function(x, y) {
  y = y || minimumScrollYOffset;
  function _scrollTo() {
    window.scrollTo(x, y);
  }
  if (isiOS) {
    // a defer is required for ios
    _.defer(_scrollTo);
  } else {
    _scrollTo();
  }
  return [x, y];
};
  
Thorax.Util.scrollToTop = function() {
  // android will use height of 1 because of minimumScrollYOffset in scrollTo()
  return this.scrollTo(0, 0);
};

//built in dom events
Thorax.View.on({
  'submit form': function(event) {
    // Hide any virtual keyboards that may be lingering around
    var focused = $(':focus')[0];
    focused && focused.blur();
  }
});

//removal of click delay on mobile webkit
var TAP_RANGE = 5;    // +-5px is still considered a tap

Thorax._fastClickEventName = 'click';
Thorax.configureFastClick = function(useFastClick) {
  var body = document.body;
  if (useFastClick && isMobile) {
    Thorax._fastClickEventName = 'fast-click';
    body.addEventListener('touchstart', onTouchStart, true);
    body.addEventListener('touchmove', onTouchMove, true);
    body.addEventListener('touchend', onTouchEnd, true);
    body.addEventListener('click', clickKiller, true);  
  } else {
    Thorax._fastClickEventName = 'click';
    body.removeEventListener('touchstart', onTouchStart, true);
    body.removeEventListener('touchmove', onTouchMove, true);
    body.removeEventListener('touchend', onTouchEnd, true);
    body.removeEventListener('click', clickKiller, true);  
  }
  registerClickHandler && registerClickHandler();
};

if (isMobile) {
  var start,
      clickRedRum;
  
  function onTouchStart(event) {
    try {
      if (event.touches.length === 1) {
        var touch = event.touches[0];
        start = {x: touch.clientX, y: touch.clientY};
      } else {
        start = false;
      }
      clickRedRum = false;
    } catch(e) {
      Thorax.onException('fast-click start', e);
    }
  }
  
  function onTouchMove() {
    if (!event.touches || event.touches.length > 1) {
      start = false;
    }
  }
  
  function defaultPrevented(event) {
    return event.isDefaultPrevented ? event.isDefaultPrevented() : event.defaultPrevented;
  }
  
  function onTouchEnd(event) {
    try {
      var touch = event.changedTouches[0];
      if (start
          && Math.abs(touch.clientX-start.x) <= TAP_RANGE
          && Math.abs(touch.clientY-start.y) <= TAP_RANGE) {
        var target = touch.target;
      
        // see if target element or ancestor is disabled as click would not be triggered in this case
        var disabled = !!($(target).closest('[disabled]').length);
        if (!disabled) {
          event = $.Event(Thorax._fastClickEventName, {original: event});
          $(target).trigger(event);
          if (!defaultPrevented(event) && (target.control || target.htmlFor)) {
            if (target.control) {
              $(target.control).trigger(event);
            } else {
              $("#" + target.htmlFor).trigger(event);
            }
          }
          if (defaultPrevented(event)) {
            // If the fast-click was handled, prevent futher operations
            clickRedRum = true;
            event.original.preventDefault();
            event.defaultPrevented = true;
          } 
        }
      }
    } catch(e) {
      Thorax.onException('fast-click end', e);
    }
  }
  
  function clickKiller(event) {
    if (clickRedRum) {
      event.preventDefault();
      event.stopPropagation();
      clickRedRum = false;
    }
  }

  Thorax.configureFastClick(isMobile);
} else {
  registerClickHandler && registerClickHandler();
}


//tap highlight

$.fn.tapHoldAndEnd = function(selector, callbackStart, callbackEnd) {
  function triggerEvent(obj, eventType, callback, event) {
    var originalType = event.type,
        result;

    event.type = eventType;
    if (callback) {
      result = callback.call(obj, event);
    }
    event.type = originalType;
    return result;
  }

  var timers = [];
  return this.each(function() {
    var thisObject = this,
        tapHoldStart = false,
        $this = $(thisObject);

    $this.on('touchstart', selector, function(event) {
      tapHoldStart = false;
      var origEvent = event,
          timer;

      function clearTapTimer(event) {
        clearTimeout(timer);
             
        if (tapHoldStart) {
          var retval = false;
          if (event) {
            // We aren't sending any end events for touchcancel cases,
            // prevent an exception
            retval = triggerEvent(thisObject, 'tapHoldEnd', callbackEnd, event);
          }
          if (retval === false) {
            _.each(timers, clearTimeout);
            timers = [];
          } 
        }
      }

      $(document).one('touchcancel', function() {
        clearTapTimer();

        $this.off('touchmove', selector, clearTapTimer);
        $this.off('touchend', selector, clearTapTimer);
      });

      $this.on('touchend', selector, clearTapTimer);
      $this.on('touchmove', selector, clearTapTimer);

      timer = setTimeout(function() {
        tapHoldStart = true;
        var retval = triggerEvent(thisObject, 'tapHoldStart', callbackStart, origEvent);
        if (retval === false) {
          _.each(timers, clearTimeout);
          timers = [];
        } 
      }, 150);
      timers.push(timer);
    });
  });
};

//only enable on android
var useNativeHighlight = !isAndroid;
Thorax.configureTapHighlight = function(useNative) {
  useNativeHighlight = useNative;
};

var NATIVE_TAPPABLE = {
  'A': true,
  'INPUT': true,
  'BUTTON': true,
  'SELECT': true,
  'TEXTAREA': true
};

function fixupTapHighlight(scope) {
  _.each(this._domEvents || [], function(bind) {
    var components = bind.split(' '),
        selector = components.slice(1).join(' ') || undefined;  // Needed to make zepto happy

    if (components[0] === 'click') {
      // !selector case is for root click handlers on the view, i.e. 'click'
      $(selector || this.el, selector && (scope || this.el)).forEach(function(el) {
        var $el = $(el).data('tappable', true);

        if (useNativeHighlight && !NATIVE_TAPPABLE[el.tagName]) {
          // Add an explicit NOP bind to allow tap-highlight support
          $el.on('click', false);
        }
      });
    }
  }, this);
}

_.extend(Thorax.View.prototype, {
  _tapHighlightClassName: 'active',
  _tapHighlightStart: function(event) {
    var target = event.currentTarget,
        tagName = target && target.tagName.toLowerCase();
  
    // User input controls may be visually part of a larger group. For these cases
    // we want to give priority to any parent that may provide a focus operation.
    if (tagName === 'input' || tagName === 'select' || tagName === 'textarea') {
      target = $(target).closest('[data-tappable=true]')[0] || target;
    }
  
    if (target) {
      $(target).addClass(this._tapHighlightClassName);
      return false;
    }
  },
  _tapHighlightEnd: function(event) {
    $('.' + this._tapHighlightClassName).removeClass(this._tapHighlightClassName);
  }
});

//TODO: examine if these are still needed
Thorax.View.on({
  'rendered': fixupTapHighlight,
  'rendered:collection': fixupTapHighlight,
  'rendered:item': fixupTapHighlight,
  'rendered:empty': fixupTapHighlight
});

var _setElement = Thorax.View.prototype.setElement,
    tapHighlightSelector = '[data-tappable=true], a, input, button, select, textarea';

Thorax.View.prototype.setElement = function() {
  var response = _setElement.apply(this, arguments);
  if (!this.noTapHighlight) {
    if (!useNativeHighlight) {
      var self = this;
      function exec(name) {
        return function() {
          try {
            self[name].apply(self, arguments);
          } catch(e) {
            Thorax.onException(name, e);
          }
        };
      }
      this.$el.tapHoldAndEnd(tapHighlightSelector, exec('_tapHighlightStart'), exec('_tapHighlightEnd'));
    }
  }
  return response;
};

var _addEvent = Thorax.View.prototype._addEvent;
Thorax.View.prototype._addEvent = function(params) {
  this._domEvents = this._domEvents || [];
  (params.type === "DOM") && this._domEvents.push(params.originalName);
  isMobile && (params.name = params.name.replace(/^click\b/, Thorax._fastClickEventName));
  return _addEvent.call(this, params);
};
