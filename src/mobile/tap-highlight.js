/*global isAndroid */

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
          $el.on('click', function() {});
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
  _tapHighlightEnd: function(/* event */) {
    $('.' + this._tapHighlightClassName).removeClass(this._tapHighlightClassName);
  }
});

//TODO: examine if these are still needed
var fixupTapHighlightCallback = function() {
  fixupTapHighlight.call(this);
};

Thorax.View.on({
  'rendered': fixupTapHighlightCallback,
  'rendered:collection': fixupTapHighlightCallback,
  'rendered:item': fixupTapHighlightCallback,
  'rendered:empty': fixupTapHighlightCallback
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
  if (params.type === "DOM") {
    this._domEvents.push(params.originalName);
  }
  return _addEvent.call(this, params);
};
