    //_events not present on HelperView
    this.constructor._events && this.constructor._events.forEach(function(event) {
      this.on.apply(this, event);
    }, this);
    if (this.events) {
      _.each(Thorax.Util.getValue(this, 'events'), function(handler, eventName) {
        this.on(eventName, handler, this);
      }, this);
    }
