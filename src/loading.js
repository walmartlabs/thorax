/*global collectionOptionNames, extendOptions, inheritVars */
var loadStart = 'load:start',
    loadEnd = 'load:end',
    rootObject;

Thorax.setRootObject = function(obj) {
  rootObject = obj;
};

Thorax.loadHandler = function(start, end) {
  return function(message, background, object) {
    var self = this;

    function startLoadTimeout() {
      clearTimeout(self._loadStart.timeout);
      self._loadStart.timeout = setTimeout(function() {
          try {
            self._loadStart.run = true;
            start.call(self, self._loadStart.message, self._loadStart.background, self._loadStart);
          } catch (e) {
            Thorax.onException('loadStart', e);
          }
        },
        loadingTimeout * 1000);
    }

    if (!self._loadStart) {
      var loadingTimeout = self._loadingTimeoutDuration;
      if (loadingTimeout === void 0) {
        // If we are running on a non-view object pull the default timeout
        loadingTimeout = Thorax.View.prototype._loadingTimeoutDuration;
      }

      self._loadStart = _.extend({
        events: [],
        timeout: 0,
        message: message,
        background: !!background
      }, Backbone.Events);
      startLoadTimeout();
    } else {
      clearTimeout(self._loadStart.endTimeout);

      self._loadStart.message = message;
      if (!background && self._loadStart.background) {
        self._loadStart.background = false;
        startLoadTimeout();
      }
    }

    self._loadStart.events.push(object);
    object.on(loadEnd, function endCallback() {
      object.off(loadEnd, endCallback);

      var loadingEndTimeout = self._loadingTimeoutEndDuration;
      if (loadingEndTimeout === void 0) {
        // If we are running on a non-view object pull the default timeout
        loadingEndTimeout = Thorax.View.prototype._loadingTimeoutEndDuration;
      }

      var events = self._loadStart.events,
          index = events.indexOf(object);
      if (index >= 0) {
        events.splice(index, 1);
      }
      if (!events.length) {
        self._loadStart.endTimeout = setTimeout(function() {
          try {
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
          } catch (e) {
            Thorax.onException('loadEnd', e);
          }
        }, loadingEndTimeout * 1000);
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
      source.off(loadStart, load);
    }
    dest.trigger(loadStart, message, backgound, object);
  }
  source.on(loadStart, load);
  return {
    off: function() {
      source.off(loadStart, load);
    }
  };
};

//
// Data load event generation
//

/**
 * Mixing for generating load:start and load:end events.
 */
Thorax.mixinLoadable = function(target, useParent) {
  _.extend(target, {
    //loading config
    _loadingClassName: 'loading',
    _loadingTimeoutDuration: 0.33,
    _loadingTimeoutEndDuration: 0.10,

    // Propagates loading view parameters to the AJAX layer
    onLoadStart: function(message, background, object) {
      var that = useParent ? this.parent : this;
      if (!that.nonBlockingLoad && !background && rootObject) {
        rootObject.trigger(loadStart, message, background, object);
      }
      $(that.el).addClass(that._loadingClassName);
      //used by loading helpers
      if (that._loadingCallbacks) {
        _.each(that._loadingCallbacks, function(callback) {
          callback();
        });
      }
    },
    onLoadEnd: function(/* background, object */) {
      var that = useParent ? this.parent : this;
      $(that.el).removeClass(that._loadingClassName);
      //used by loading helpers
      if (that._loadingCallbacks) {
        _.each(that._loadingCallbacks, function(callback) {
          callback();
        });
      }
    }
  });
};

Thorax.mixinLoadableEvents = function(target, useParent) {
  _.extend(target, {
    loadStart: function(message, background) {
      var that = useParent ? this.parent : this;
      that.trigger(loadStart, message, background, that);
    },
    loadEnd: function() {
      var that = useParent ? this.parent : this;
      that.trigger(loadEnd, that);
    }
  });
};

Thorax.mixinLoadable(Thorax.View.prototype);
Thorax.mixinLoadableEvents(Thorax.View.prototype);

Thorax.sync = function(method, dataObj, options) {
  var self = this,
      complete = options.complete;

  options.complete = function() {
    self._request = undefined;
    self._aborted = false;

    complete && complete.apply(this, arguments);
  };
  this._request = Backbone.sync.apply(this, arguments);

  // TODO : Reevaluate this event... Seems too indepth to expose as an API
  this.trigger('request', this._request);
  return this._request;
};

function bindToRoute(callback, failback) {
  var fragment = Backbone.history.getFragment(),
      routeChanged = false;

  function routeHandler() {
    if (fragment === Backbone.history.getFragment()) {
      return;
    }
    routeChanged = true;
    Backbone.history.off('route', routeHandler);
    failback && failback();
  }

  Backbone.history.on('route', routeHandler);

  function finalizer() {
    Backbone.history.off('route', routeHandler);
    var args = Array.prototype.slice.call(arguments, 1);
    if (!routeChanged) {
      callback.apply(this, args);
    }
  }

  var res = _.bind(finalizer, this);
  res.cancel = function() {
    Backbone.history.off('route', routeHandler);
  };

  return res;
}

function loadData(callback, failback, options) {
  if (this.isPopulated()) {
    return callback(this);
  }

  if (arguments.length === 2 && typeof failback !== 'function' && _.isObject(failback)) {
    options = failback;
    failback = false;
  }

  var self = this,
      routeChanged = false,
      successCallback = bindToRoute(_.bind(callback, self), function() {
        routeChanged = true;
        if (self._request) {
          self._aborted = true;
          self._request.abort();
        }
        failback && failback.call(self, false);
      });

  this.fetch(_.defaults({
    success: successCallback,
    error: failback && function() {
      if (!routeChanged) {
        failback.apply(self, [true].concat(_.toArray(arguments)));
      }
    },
    complete: function() {
      successCallback.cancel();
    }
  }, options));
}

function fetchQueue(options, $super) {
  if (options.resetQueue) {
    // WARN: Should ensure that loaders are protected from out of band data
    //    when using this option
    this.fetchQueue = undefined;
  }

  if (!this.fetchQueue) {
    // Kick off the request
    this.fetchQueue = [options];
    options = _.defaults({
      success: flushQueue(this, this.fetchQueue, 'success'),
      error: flushQueue(this, this.fetchQueue, 'error'),
      complete: flushQueue(this, this.fetchQueue, 'complete')
    }, options);
    $super.call(this, options);
  } else {
    // Currently fetching. Queue and process once complete
    this.fetchQueue.push(options);
  }
}

function flushQueue(self, fetchQueue, handler) {
  return function() {
    var args = arguments;

    // Flush the queue. Executes any callback handlers that
    // may have been passed in the fetch options.
    _.each(fetchQueue, function(options) {
      if (options[handler]) {
        options[handler].apply(this, args);
      }
    }, this);

    // Reset the queue if we are still the active request
    if (self.fetchQueue === fetchQueue) {
      self.fetchQueue = undefined;
    }
  };
}

var klasses = [];
Thorax.Model && klasses.push(Thorax.Model);
Thorax.Collection && klasses.push(Thorax.Collection);

_.each(klasses, function(DataClass) {
  var $fetch = DataClass.prototype.fetch;
  Thorax.mixinLoadableEvents(DataClass.prototype, false);
  _.extend(DataClass.prototype, {
    sync: Thorax.sync,

    fetch: function(options) {
      options = options || {};

      var self = this,
          complete = options.complete;

      options.complete = function() {
        complete && complete.apply(this, arguments);
        self.loadEnd();
      };
      self.loadStart(undefined, options.background);
      return fetchQueue.call(this, options || {}, $fetch);
    },

    load: function(callback, failback, options) {
      if (arguments.length === 2 && typeof failback !== 'function') {
        options = failback;
        failback = false;
      }

      options = options || {};
      if (!options.background && !this.isPopulated() && rootObject) {
        // Make sure that the global scope sees the proper load events here
        // if we are loading in standalone mode
        Thorax.forwardLoadEvents(this, rootObject, true);
      }

      loadData.call(this, callback, failback, options);
    }
  });
});

Thorax.Util.bindToRoute = bindToRoute;

if (Thorax.Router) {
  Thorax.Router.bindToRoute = Thorax.Router.prototype.bindToRoute = bindToRoute;
}

// Propagates loading view parameters to the AJAX layer
function loadingDataOptions() {
  return {
    ignoreErrors: this.ignoreFetchError,
    background: this.nonBlockingLoad
  };
}
extendOptions('_setModelOptions', loadingDataOptions);
extendOptions('_setCollectionOptions', loadingDataOptions);

if (Thorax.CollectionView) {
  Thorax.mixinLoadable(Thorax.CollectionView.prototype);
  Thorax.mixinLoadableEvents(Thorax.CollectionView.prototype);

  inheritVars.collection.loading = function() {
    var loadingView = this.options['loading-view'],
        loadingTemplate = this.options['loading-template'],
        loadingPlacement = this.options['loading-placement'];
    //add "loading-view" and "loading-template" options to collection helper
    if (loadingView || loadingTemplate) {
      var callback = Thorax.loadHandler(_.bind(function() {
        var item;
        if (this.collection.length === 0) {
          this.$el.empty();
        }
        if (loadingView) {
          var instance = Thorax.Util.getViewInstance(loadingView, {
            collection: this.collection
          });
          this._addChild(instance);
          if (loadingTemplate) {
            instance.render(loadingTemplate);
          } else {
            instance.render();
          }
          item = instance;
        } else {
          item = this.renderTemplate(loadingTemplate, {
            collection: this.collection
          });
        }
        var index = loadingPlacement
          ? loadingPlacement.call(this.parent, this)
          : this.collection.length
        ;
        this.appendItem(item, index);
        this.$el.children().eq(index).attr('data-loading-element', this.collection.cid);
      }, this), _.bind(function() {
        this.$el.find('[data-loading-element="' + this.collection.cid + '"]').remove();
      }, this));
      this.on(this.collection, 'load:start', callback);
    }
  };

  collectionOptionNames.push('loading-template', 'loading-view', 'loading-placement');
}

Thorax.View.on({
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
