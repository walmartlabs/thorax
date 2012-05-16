//removal of click delay on mobile webkit
(function() {
  var TAP_RANGE = 5;    // +-5px is still considered a tap

  var _configure = Thorax.configure;
  Thorax.configure = function() {
    if ('ontouchstart' in document.documentElement) {
      Thorax.fastClick = 'fast-click';

      var events = Thorax.Layout.prototype.events;
      events['fast-click a'] = events['click a']; 
      delete events['click a'];

      var start,
          clickRedRum;
      function onTouchStart(event) {
        if (event.touches.length === 1) {
          var touch = event.touches[0];
          start = {x: touch.clientX, y: touch.clientY};
        } else {
          start = false;
        }
        clickRedRum = false;
      }
      function onTouchMove() {
        if (event.touches.length > 1) {
          start = false;
        }
      }
      function onTouchEnd(event) {
        var touch = event.changedTouches[0];
        if (start
            && Math.abs(touch.clientX-start.x) <= TAP_RANGE
            && Math.abs(touch.clientY-start.y) <= TAP_RANGE) {
          var target = document.elementFromPoint(touch.clientX, touch.clientY);
          if(target.nodeType == 3) {
            target = target.parentNode;
          }

          event = $.Event(Thorax.fastClick, {original: event});
          $(target).trigger(event);
          // If the fast-click was handled, prevent futher operations
          if (event.defaultPrevented) {
            clickRedRum = true;
            event.original.preventDefault();
          }
        }
      }
      function clickKiller(event) {
        if (clickRedRum) {
          event.preventDefault();
          event.stopPropagation();
          clickRedRum = false;
        }
      }

      document.body.addEventListener('touchstart', onTouchStart, true);
      document.body.addEventListener('touchmove', onTouchMove, true);
      document.body.addEventListener('touchend', onTouchEnd, true);
      document.body.addEventListener('click', clickKiller, true);

      var _addEvent = Thorax.View.prototype._addEvent;
      Thorax.View.prototype._addEvent = function(params) {
        params.name = params.name.replace(/^click\b/, Thorax.fastClick);
        _addEvent.call(this, params);
      };
    } else {
      Thorax.fastClick = 'click';
    }

    _configure.apply(this, arguments);
  };
})();
