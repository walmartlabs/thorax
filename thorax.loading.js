var loadStart = 'load:start',
    loadEnd = 'load:end';

/**
 * load:start / load:end handler.
 *
 * Generates an load:start event handler that when triggered will
 * then monitor the associated object for a load:end event. If the
 * duration between the start and and the end events exceed
 * `_loadingTimeoutDuration` then the `start` and `end` callbacks
 * will be triggered at the appropriate times to allow the display
 * of a loading UI.
 *
 * Example:
 *    object.bind('load:start', Thorax.loadHandler(
 *      function(message, background, object) {
 *        element.addClass('loading');
 *      },
 *      function(background, object) {
 *        element.removeClass('loading');
 *      }));
 *
 */
Thorax.loadHandler = function(start, end) {
  return function(message, background, object) {
    var self = this;

    if (!self._loadStart) {
      var loadingTimeout = self._loadingTimeoutDuration;
      if (loadingTimeout === void 0) {
        // If we are running on a non-view object pull the default timeout
        loadingTimeout = Thorax.View.prototype._loadingTimeoutDuration;
      }

      self._loadStart = _.extend({
        events: [],
        timeout: setTimeout(function() {
            self._loadStart.run = true;
            start.call(self, self._loadStart.message, self._loadStart.background, self._loadStart);
          },
          loadingTimeout*1000),
        message: message,
        background: background
      }, Backbone.Events);
    } else {
      clearTimeout(self._loadStart.endTimeout);

      self._loadStart.message = message;
      self._loadStart.background  = self._loadStart.background && background;
    }

    self._loadStart.events.push(object);
    object.bind(loadEnd, function endCallback() {
      object.unbind(loadEnd, endCallback);

      var events = self._loadStart.events,
          index = events.indexOf(object);
      if (index >= 0) {
        events.splice(index, 1);
      }
      if (!events.length) {
        self._loadStart.endTimeout = setTimeout(function(){
          if (!events.length) {
            var run = self._loadStart.run;

            if (run) {
              // Emit the end behavior, but only if there is a paired start
              end.call(self, self._loadStart.background, self._loadStart);
              self._loadStart.trigger(loadEnd, self._loadStart);
            }

            // If stopping make sure we don't run a start
            clearTimeout(self._loadStart.timeout);
            self._loadStart = undefined;
          }
        }, 100);
      }
    });
  };
};

/**
 * Helper method for propagating load:start events to other objects.
 *
 * Forwards load:start events that occur on `source` to `dest`.
 */
Thorax.forwardLoadEvents = function(source, dest, once) {
  function load(message, backgound, object) {
    if (once) {
      source.unbind(loadStart, load);
    }
    dest.trigger(loadStart, message, backgound, object);
  }
  source.bind(loadStart, load);
  return {
    unbind: function() {
      source.unbind(loadStart, load);
    }
  };
};

//
// Data load event generation
//

/**
 * Mixing for generating load:start and load:end events.
 */
Thorax.LoadableMixin = {
  loadStart: function(message, background) {
    this.trigger(loadStart, message, background, this);
  },
  loadEnd: function() {
    this.trigger(loadEnd, this);
  }
};


Thorax.sync = function(method, dataObj, options) {
  var self = this,
      complete = options.complete;

  options.complete = function() {
    self._request = undefined;
    self._aborted = false;

    complete && complete.apply(this, arguments);
    dataObj.loadEnd();
  };
  dataObj.loadStart(undefined, options.background);
  this._request = Backbone.sync.apply(this, arguments);

  // TODO : Reevaluate this event... Seems too indepth to expose as an API
  this.trigger('request', this._request);
  return this._request;
};


_.each([Thorax.Collection, Thorax.Model], function(DataClass) {
  var $load = DataClass.prototype.load;

  _.extend(DataClass.prototype, Thorax.LoadableMixin, {
    sync: Thorax.sync,

    load: function(callback, failback, options) {
      if (arguments.length === 2 && typeof failback !== 'function') {
        options = failback;
        failback = false;
      }
      options = options || {};

      if (!options.background && !this.isPopulated()) {
        // Make sure that the global scope sees the proper load events here
        // if we are loading in standalone mode
        Thorax.forwardLoadEvents(this, exports, true);
      }

      var self = this;
      $load.call(this, callback,
        function(isError) {
          // Route changed, kill it
          if (!isError) {
            if (self._request) {
              self._aborted = true;
              self._request.abort();
            }
          }

          failback && failback.apply && failback.apply(this, arguments);
        },
        options);
    }
  });
});

//
// View load event handling
//
_.extend(Thorax.View.prototype, {
  //loading config
  _loadingClassName: 'loading',
  _loadingTimeoutDuration: 0.33,

  setCollectionOptions: setThoraxBackgroundOptions(Thorax.View.prototype.setCollectionOptions),
  setModelOptions: setThoraxBackgroundOptions(Thorax.View.prototype.setModelOptions),

  onLoadStart: function(message, background, object) {
    if (!this.nonBlockingLoad && !background) {
      exports.trigger(loadStart, message, background, object);
    }
    $(this.el).addClass(this._loadingClassName);
  },
  onLoadEnd: function(background, object) {
    $(this.el).removeClass(this._loadingClassName);
  }
});

// Propagates loading view parameters to the AJAX layer
function setThoraxBackgroundOptions($super) {
  return function(options) {
    return $super.call(this, _.defaults({
      ignoreErrors: this.ignoreFetchError,
      background: this.nonBlockingLoad
    }, options));
  };
}

Thorax.View.registerEvents({
  'load:start': Thorax.loadHandler(
      function(message, background, object) {
        this.onLoadStart(message, background, object);
      },
      function(background, object) {
        this.onLoadEnd(object);
      }),

  collection: {
    'load:start': function(message, background, object) {
      this.trigger(loadStart, message, background, object);
    }
  },
  model: {
    'load:start': function(message, background, object) {
      this.trigger(loadStart, message, background, object);
    }
  }
});
