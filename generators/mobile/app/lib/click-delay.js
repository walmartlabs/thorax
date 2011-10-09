(function(){
  $(document).ready(function() {
    if (window.Touch) {
      var moved;
      var handleEvent = function(event) {
        switch(event.type) {
          case 'touchstart': onTouchStart(event); break;
          case 'touchmove': onTouchMove(event); break;
          case 'touchend': onTouchEnd(event); break;
        }
      };
      var onTouchStart = function(event) {
        var target = event.target;
        if (target.tagName !== 'SELECT' && (target.tagName !== 'INPUT' || (target.tagName === 'INPUT' && (target.type === 'button' || target.type === 'cancel' || target.type === 'submit'))) && target.tagName !== 'TEXTAREA') {
          moved = false;
          document.body.addEventListener('touchmove', onTouchMove, false);
          document.body.addEventListener('touchend', onTouchEnd, false);
        }
      };
      var onTouchMove = function() {
        moved = true;
      };
      var onTouchEnd = function(event) {
        document.body.removeEventListener('touchmove', onTouchMove, false);
        document.body.removeEventListener('touchend', onTouchEnd, false);
        if( !moved ) {
          var target = document.elementFromPoint(event.changedTouches[0].clientX, event.changedTouches[0].clientY);
          if(target.nodeType == 3) {
            target = target.parentNode;
          }
          var click_event = document.createEvent('MouseEvents');
          click_event.initEvent('click', true, true);
          event.target.dispatchEvent(click_event);
          event.preventDefault();
        }
      };
      document.body.addEventListener('touchstart', {
        handleEvent: handleEvent
      }, false);
    }
  });
})();
