/*global isMobile, registerClickHandler */

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
  if (typeof registerClickHandler !== 'undefined') {
    registerClickHandler && registerClickHandler();
  }
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
    } catch (e) {
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
          && Math.abs(touch.clientX - start.x) <= TAP_RANGE
          && Math.abs(touch.clientY - start.y) <= TAP_RANGE) {
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
    } catch (e) {
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

  // Use this instead of $(function() {}) so that jQuery
  // does not register a timeout
  $(document).ready(function() {
    Thorax.configureFastClick(isMobile);
  });
} else {
  if (typeof registerClickHandler !== 'undefined') {
    registerClickHandler && registerClickHandler();
  }
}
