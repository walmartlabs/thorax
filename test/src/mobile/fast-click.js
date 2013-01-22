var $event;
before(function() {
  // Rewrite click triggers if fast-click is enabled
  if (!$event && Thorax._fastClickEventName) {
    $event = $.Event
    $.Event = function(type, props) {
      if (type === 'click') {
        type = Thorax._fastClickEventName;
      }
      return $event(type, props);
    };
  }
});
