/*global $serverSide, createErrorMessage, inheritVars */

var loadStart = 'load:start',
    loadEnd = 'load:end',
    rootObject;

Thorax.setRootObject = function(obj) {
  rootObject = obj;
};

Thorax.loadHandler = function(start, end, context) {
  var loadCounter = _.uniqueId('load');
  return function(message, background, object) {
    if ($serverSide) {
      return;
    }

    var self = context || this;
    self._loadInfo = self._loadInfo || {};
    var loadInfo = self._loadInfo[loadCounter];

    function startLoadTimeout() {

      // If the timeout has been set already but has not triggered yet do nothing
      // Otherwise set a new timeout (either initial or for going from background to
      // non-background loading)
      if (loadInfo.timeout && !loadInfo.run) {
        return;
      }

      var loadingTimeout = self._loadingTimeoutDuration !== undefined ?
        self._loadingTimeoutDuration : Thorax.View.prototype._loadingTimeoutDuration;
      loadInfo.timeout = setTimeout(
          Thorax.bindSection('load-start', function() {
            // We have a slight race condtion in here where the end event may have occurred
            // but the end timeout has not executed. Rather than killing a cumulative timeout
            // immediately we'll protect from that case here
            if (loadInfo.events.length) {
              loadInfo.run = true;
              start.call(self, loadInfo.message, loadInfo.background, loadInfo);
            }
          }),
        loadingTimeout * 1000);
    }

    if (!loadInfo) {
      loadInfo = self._loadInfo[loadCounter] = _.extend({
        isLoading: function() {
          return loadInfo.events.length;
        },

        cid: loadCounter,
        events: [],
        timeout: 0,
        message: message,
        background: !!background
      }, Backbone.Events);
      startLoadTimeout();
    } else {
      clearTimeout(loadInfo.endTimeout);

      loadInfo.message = message;
      if (!background && loadInfo.background) {
        loadInfo.background = false;
        startLoadTimeout();
      }
    }

    // Prevent binds to the same object multiple times as this can cause very bad things
    // to happen for the load;load;end;end execution flow.
    if (_.indexOf(loadInfo.events, object) >= 0) {
      return;
    }

    loadInfo.events.push(object);

    // Must be defined as a variable rather than a named function as a parameter as oldIE
    // isn't able to properly remove the callback when using that syntax
    var endCallback = function() {
      var loadingEndTimeout = self._loadingTimeoutEndDuration;
      if (loadingEndTimeout === void 0) {
        // If we are running on a non-view object pull the default timeout
        loadingEndTimeout = Thorax.View.prototype._loadingTimeoutEndDuration;
      }

      var events = loadInfo.events,
          index = _.indexOf(events, object);
      if (index >= 0 && !object.isLoading()) {
        events.splice(index, 1);

        if (_.indexOf(events, object) < 0) {
          // Last callback for this particlar object, remove the bind
          object.off(loadEnd, endCallback);
        }
      }

      if (!events.length) {
        clearTimeout(loadInfo.endTimeout);
        loadInfo.endTimeout = setTimeout(
          Thorax.bindSection('load-end', function() {
            if (!events.length) {
              if (loadInfo.run) {
                // Emit the end behavior, but only if there is a paired start
                end && end.call(self, loadInfo.background, loadInfo);
                loadInfo.trigger(loadEnd, loadInfo);
              }

              // If stopping make sure we don't run a start
              clearTimeout(loadInfo.timeout);
              loadInfo = self._loadInfo[loadCounter] = undefined;
            }
          }),
        loadingEndTimeout * 1000);
      }
    };
    object.on(loadEnd, endCallback);
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

      // Protect against race conditions
      if (!that || !that.el) {
        return;
      }

      if (!that.nonBlockingLoad && !background && rootObject && rootObject !== this) {
        rootObject.trigger(loadStart, message, background, object);
      }
      that._isLoading = true;
      that.$el.addClass(that._loadingClassName);
      // used by loading helpers
      that.trigger('change:load-state', 'start', background);
    },
    onLoadEnd: function(/* background, object */) {
      var that = useParent ? this.parent : this;

      // Protect against race conditions
      if (!that || !that.el) {
        return;
      }

      that._isLoading = false;
      that.$el.removeClass(that._loadingClassName);
      // used by loading helper
      that.trigger('change:load-state', 'end');
    }
  });
};

Thorax.mixinLoadableEvents = function(target, useParent) {
  _.extend(target, {
    _loadCount: 0,

    isLoading: function() {
      return this._loadCount > 0;
    },

    loadStart: function(message, background) {
      this._loadCount++;

      var that = useParent ? this.parent : this;
      that.trigger(loadStart, message, background, that);
    },
    loadEnd: function() {
      this._loadCount--;

      var that = useParent ? this.parent : this;
      that.trigger(loadEnd, that);
    }
  });
};

Thorax.mixinLoadable(Thorax.View.prototype);
Thorax.mixinLoadableEvents(Thorax.View.prototype);


if (Thorax.HelperView) {
  Thorax.mixinLoadable(Thorax.HelperView.prototype, true);
  Thorax.mixinLoadableEvents(Thorax.HelperView.prototype, true);
}

if (Thorax.CollectionHelperView) {
  Thorax.mixinLoadable(Thorax.CollectionHelperView.prototype, true);
  Thorax.mixinLoadableEvents(Thorax.CollectionHelperView.prototype, true);
}

Thorax.sync = function(method, dataObj, options) {
  var self = this,
      complete = options.complete;

  options.complete = function() {
    self._request = undefined;
    self._aborted = false;

    complete && complete.apply(this, arguments);
  };
  this._request = Backbone.sync.apply(this, arguments);

  return this._request;
};

// Tracks the last route that has been emitted.
// This allows bindToRoute to differentiate between route events that are
// associated with the current handler's execution (as the route event triggers after)
// and with subsequent operations.
//
// This allows for bindToRoute to safely cleanup pending operations for the edge case
// where callers are calling `loadUrl` directly on the same fragment repeatidly.
var triggeredRoute,
    $loadUrl = Backbone.History.prototype.loadUrl;

Backbone.History.prototype.loadUrl = function() {
  Backbone.history.once('route', function() {
    triggeredRoute = Backbone.history.getFragment();
  });
  triggeredRoute = false;
  return $loadUrl.apply(this, arguments);
};

function bindToRoute(callback, failback) {
  var started = Backbone.History.started,
      fragment = started && Backbone.history.getFragment(),
      pendingRoute = triggeredRoute !== fragment;   // Has the `route` event triggered for this particular event?

  function routeHandler() {
    if (!started) {
      // If we were not started when this was initiated, reset ourselves to use the current route
      // as we can not trust the route that was given prior to the history object being configured
      fragment = Backbone.history.getFragment();
      pendingRoute = started = true;
    }
    if (pendingRoute && fragment === Backbone.history.getFragment()) {
      // The bind to route occured in the handler and the route event
      // was not yet triggered so we do not want to terminate the bind
      pendingRoute = false;
      return;
    }

    // Otherwise the fragment has changed or the router was executed again on the same
    // fragment, which we consider to be a distinct operation for these purposes.
    callback = undefined;
    res.cancel();
    failback && failback();
  }

  Backbone.history.on('route', routeHandler);

  function finalizer() {
    Backbone.history.off('route', routeHandler);
    if (callback) {
      callback.apply(this, arguments);
    }
  }

  var res = _.bind(finalizer, this);
  res.cancel = function() {
    Backbone.history.off('route', routeHandler);
  };

  return res;
}

function loadData(dataObj, callback, failback, options) {
  if (dataObj.isPopulated()) {
    // Defer here to maintain async callback behavior for all loading cases
    return _.defer(callback, dataObj);
  }

  if (arguments.length === 2 && !_.isFunction(failback) && _.isObject(failback)) {
    options = failback;
    failback = false;
  }

  var self = dataObj,
      routeChanged = false,
      successCallback = bindToRoute(_.bind(callback, self), function() {
        routeChanged = true;

        // Manually abort this particular load cycle (and only this one)
        queueEntry && queueEntry.aborted();

        // Kill off the request if there isn't anyone remaining who may want to interact
        // with it.
        if (self._request && (!self.fetchQueue || !self.fetchQueue.length)) {
          self._aborted = true;
          self._request.abort();
        }

        failback && failback.call(self, false);
      }),
      queueEntry;

  dataObj.fetch(_.defaults({
    success: successCallback,
    error: function() {
      successCallback.cancel();
      if (!routeChanged && failback) {
        failback.apply(self, [true].concat(_.toArray(arguments)));
      }
    }
  }, options));

  queueEntry = _.last(dataObj.fetchQueue);
}

function fetchQueue(dataObj, options, $super) {
  if (options.resetQueue) {
    // WARN: Should ensure that loaders are protected from out of band data
    //    when using this option
    dataObj.fetchQueue = undefined;
  } else if (dataObj.fetchQueue) {
    // concurrent set/reset fetch events are not advised
    var reset = (dataObj.fetchQueue[0].options || {}).reset;
    if (reset !== options.reset) {
      // fetch with concurrent set & reset not allowed
      throw new Error(createErrorMessage('mixed-fetch'));
    }
  }

  if (!dataObj.fetchQueue) {
    // Kick off the request
    dataObj.fetchQueue = [];
    var requestOptions = _.defaults({
      success: flushQueue(dataObj, dataObj.fetchQueue, 'success'),
      error: flushQueue(dataObj, dataObj.fetchQueue, 'error'),
      complete: flushQueue(dataObj, dataObj.fetchQueue, 'complete')
    }, options);

    // Handle callers that do not pass in a super class and wish to implement their own
    // fetch behavior
    if ($super) {
      var promise = $super.call(dataObj, requestOptions);
      if (dataObj.fetchQueue) {
        // ensure the fetchQueue has not been cleared out - https://github.com/walmartlabs/thorax/issues/304
        // This can occur in some environments if the request fails sync to this call, causing the 
        // error handler to clear out the fetchQueue before we get to this point.
        dataObj.fetchQueue._promise = promise;
      } else {
        return;
      }
    } else {
      return requestOptions;
    }
  }

  // Create a proxy promise for this specific load call. This allows us to abort specific
  // callbacks when bindToRoute needs to kill off specific callback instances.
  var deferred;
  if ($.Deferred && dataObj.fetchQueue._promise && dataObj.fetchQueue._promise.then) {
    deferred = $.Deferred();
    dataObj.fetchQueue._promise.then(
        _.bind(deferred.resolve, deferred),
        _.bind(deferred.reject, deferred));
  }

  var fetchQueue = dataObj.fetchQueue;
  dataObj.fetchQueue.push({
    // Individual requests can only fail individually. Success willl always occur via the
    // normal xhr path
    aborted: function() {
      var index = _.indexOf(fetchQueue, this);
      if (index >= 0) {
        fetchQueue.splice(index, 1);

        // If we are the last of the fetchQueue entries, invalidate the queue.
        if (!fetchQueue.length && fetchQueue === dataObj.fetchQueue) {
          dataObj.fetchQueue = undefined;
        }
      }

      var args = [fetchQueue._promise, 'abort'];
      deferred && deferred.rejectWith(options.context, args);
      options.error && options.error.apply(options.context, args);
      options.complete && options.complete.apply(options.context, args);
    },
    options: options
  });

  return deferred ? deferred.promise() : dataObj.fetchQueue._promise;
}

function flushQueue(self, fetchQueue, handler) {
  return function() {
    var args = arguments;

    // Flush the queue. Executes any callback handlers that
    // may have been passed in the fetch options.
    _.each(fetchQueue, function(queue) {
      var options = queue.options;

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
      if (DataClass === Thorax.Collection) {
        if (!_.find(['reset', 'remove', 'add', 'update'], function(key) { return !_.isUndefined(options[key]); })) {
          // use backbone < 1.0 behavior to allow triggering of reset events
          options.reset = true;
        }
      }

      if (!options.loadTriggered) {
        var self = this;

        function endWrapper(method) {
          var $super = options[method];
          options[method] = function() {
            self.loadEnd();
            $super && $super.apply(this, arguments);
          };
        }

        endWrapper('success');
        endWrapper('error');
        self.loadStart(undefined, options.background);
      }

      return fetchQueue(this, options || {}, $fetch);
    },

    load: function(callback, failback, options) {
      if (arguments.length === 2 && !_.isFunction(failback)) {
        options = failback;
        failback = false;
      }

      options = options || {};
      if (!options.background && !this.isPopulated() && rootObject) {
        // Make sure that the global scope sees the proper load events here
        // if we are loading in standalone mode
        if (this.isLoading()) {
          // trigger directly because load:start has already been triggered
          rootObject.trigger(loadStart, options.message, options.background, this);
        } else {
          Thorax.forwardLoadEvents(this, rootObject, true);
        }
      }

      loadData(this, callback, failback, options);
    }
  });
});

Thorax.Util.bindToRoute = bindToRoute;

// Propagates loading view parameters to the AJAX layer
Thorax.View.prototype._modifyDataObjectOptions = function(dataObject, options) {
  options.ignoreErrors = this.ignoreFetchError;
  options.background = this.nonBlockingLoad;
  return options;
};

// Thorax.CollectionHelperView inherits from CollectionView
// not HelperView so need to set it manually
Thorax.HelperView.prototype._modifyDataObjectOptions = Thorax.CollectionHelperView.prototype._modifyDataObjectOptions = function(dataObject, options) {
  options.ignoreErrors = this.parent.ignoreFetchError;
  options.background = this.parent.nonBlockingLoad;
  return options;
};

inheritVars.collection.loading = function(view) {
  var loadingView = view.loadingView,
      loadingTemplate = view.loadingTemplate,
      loadingPlacement = view.loadingPlacement;
  //add "loading-view" and "loading-template" options to collection helper
  if (loadingView || loadingTemplate) {
    var callback = Thorax.loadHandler(function() {
      var item;
      if (view.collection.length === 0) {
        view.$el.empty();
      }
      if (loadingView) {
        var instance = Thorax.Util.getViewInstance(loadingView);
        view._addChild(instance);
        if (loadingTemplate) {
          instance.render(loadingTemplate);
        } else {
          instance.render();
        }
        item = instance;
      } else {
        item = view.renderTemplate(loadingTemplate);
      }
      var index = loadingPlacement
        ? loadingPlacement.call(view)
        : view.collection.length
      ;
      view.appendItem(item, index);
      view.$el.children().eq(index).attr('data-loading-element', view.collection.cid);
    }, function() {
      view.$el.find('[data-loading-element="' + view.collection.cid + '"]').remove();
    },
    view.collection);

    view.listenTo(view.collection, 'load:start', callback);
  }
};

if (Thorax.CollectionHelperView) {
  _.extend(Thorax.CollectionHelperView.attributeWhiteList, {
    'loading-template': 'loadingTemplate',
    'loading-view': 'loadingView',
    'loading-placement': 'loadingPlacement'
  });
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
