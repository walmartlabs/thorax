(function(){
  // Thorax.History
  // --------------

  // Handles cross-browser history management, based on URL fragments. If the
  // browser does not support `onhashchange`, falls back to polling.
  Thorax.History = function() {
    this.handlers = [];
    _.bindAll(this, 'checkUrl');
  };

  // Cached regex for cleaning hashes.
  var hashStrip = /^(?:#|%23)*\d*(?:#|%23)*/;

  // Cached regex for index extraction from the hash
  var indexMatch = /^(?:#|%23)*(\d+)(?:#|%23)/;

  // Cached regex for detecting MSIE.
  var isExplorer = /msie [\w.]+/;

  // Regex for detecting webkit version
  var webkitVersion = /WebKit\/([\d.]+)/;

  // Has the history handling already been started?
  var historyStarted = false;

  // Set up all inheritable **Backbone.History** properties and methods.
  _.extend(Thorax.History.prototype, Backbone.Events, {

    // The default interval to poll for hash changes, if necessary, is
    // twenty times a second.
    interval: 50,

    // Get the location of the current route within the backbone history.
    // This should be considered a hint
    // Returns -1 if history is unknown or disabled
    getIndex : function() {
      return this._directionIndex;
    },

    // Get the cross-browser normalized URL fragment, either from the URL,
    // the hash, or the override.
    getFragment : function(fragment, forcePushState) {
      if (fragment == null) {
        if (this._hasPushState || forcePushState) {
          fragment = window.location.pathname;
          var search = window.location.search;
          if (search) fragment += search;
        } else {
          fragment = window.location.hash;
        }
      }
      fragment = decodeURIComponent(fragment.replace(hashStrip, ''));
      if (!fragment.indexOf(this.options.root)) fragment = fragment.substr(this.options.root.length);
      return fragment;
    },

    // Start the hash change handling, returning `true` if the current URL matches
    // an existing route, and `false` otherwise.
    start : function(options) {

      // Figure out the initial configuration. Do we need an iframe?
      // Is pushState desired ... is it available?
      if (historyStarted) throw new Error("Backbone.history has already been started");
      this.options          = _.extend({}, {root: '/'}, this.options, options);
      this._wantsPushState  = !!this.options.pushState;
      this._hasPushState    = !!(this.options.pushState && window.history && window.history.pushState);
      var fragment          = this.getFragment();
      var docMode           = document.documentMode;
      var oldIE             = (isExplorer.exec(navigator.userAgent.toLowerCase()) && (!docMode || docMode <= 7));
      if (oldIE) {
        this.iframe = $('<iframe src="javascript:0" tabindex="-1" />').hide().appendTo('body')[0].contentWindow;
        this.navigate(fragment);
      }

      // If we are in hash mode figure out if we are on a browser that is hit by 63777
      //     https://bugs.webkit.org/show_bug.cgi?id=63777
      if (!this._hasPushState && window.history && window.history.replaceState) {
        var webkitVersion = /WebKit\/([\d.]+)/.exec(navigator.userAgent);
        if (webkitVersion) {
          webkitVersion = parseFloat(webkitVersion[1]);
          this._useReplaceState = webkitVersion < 535.2;
        }
      }

      // Depending on whether we're using pushState or hashes, and whether
      // 'onhashchange' is supported, determine how we check the URL state.
      if (this._hasPushState) {
        $(window).bind('popstate', this.checkUrl);
      } else if ('onhashchange' in window && !oldIE) {
        $(window).bind('hashchange', this.checkUrl);
      } else {
        setInterval(this.checkUrl, this.interval);
      }

      // Determine if we need to change the base url, for a pushState link
      // opened by a non-pushState browser.
      this.fragment = fragment;
      historyStarted = true;
      var loc = window.location;
      var atRoot  = loc.pathname == this.options.root;
      if (this._wantsPushState && !this._hasPushState && !atRoot) {
        this.fragment = this.getFragment(null, true);
        window.location.replace(this.options.root + '#' + this.fragment);
        // Return immediately as browser will do redirect to new url
        return true;
      } else if (this._wantsPushState && this._hasPushState && atRoot && loc.hash) {
        this.fragment = loc.hash.replace(hashStrip, '');
        window.history.replaceState({}, document.title, loc.protocol + '//' + loc.host + this.options.root + this.fragment);
      }

      // Direction tracking setup
      this._trackDirection  = !!this.options.trackDirection;
      if (this._trackDirection) {
        var loadedIndex = this.loadIndex();
        this._directionIndex  = loadedIndex || window.history.length;
        this._state = {index: this._directionIndex};

        // If we are tracking direction ensure that we have a direction field to play with
        if (!loadedIndex) {
          if (!this._hasPushState) {
            loc.replace(loc.pathname + (loc.search || '') + '#' + this._directionIndex + '#' + this.fragment);
          } else {
            window.history.replaceState({index: this._directionIndex}, document.title, loc);
          }
        }
      }
      if (!this.options.silent) {
        return this.loadUrl();
      }
    },

    // Add a route to be tested when the fragment changes. Routes added later may
    // override previous routes.
    route : function(route, callback) {
      this.handlers.unshift({route : route, callback : callback});
    },

    // Checks the current URL to see if it has changed, and if it has,
    // calls `loadUrl`, normalizing across the hidden iframe.
    checkUrl : function(e) {
      var current = this.getFragment();
      var fromIframe;
      if (current == this.fragment && this.iframe) {
        current = this.getFragment(this.iframe.location.hash);
        fromIframe = true;
      }
      if (current == this.fragment || current == decodeURIComponent(this.fragment)) return false;

      this._state = e && (e.originalEvent || e).state;
      var loadedIndex = this.loadIndex(fromIframe && this.iframe.location.hash);
      if (!loadedIndex) {
        this.navigate(current, false, true, this._directionIndex+1);
      } else if (this.iframe) {
        this.navigate(current, false, false, loadedIndex);
      }

      this.loadUrl() || this.loadUrl(window.location.hash);
    },

    // Attempt to load the current URL fragment. If a route succeeds with a
    // match, returns `true`. If no defined routes matches the fragment,
    // returns `false`.
    loadUrl : function(fragmentOverride) {
      var history = this;
      var fragment = this.fragment = this.getFragment(fragmentOverride);

      var matched = _.any(this.handlers, function(handler) {
        if (handler.route.test(fragment)) {
          if (history._ignoreChange) {
            history._ignoreChange = false;
            history._directionIndex  = history.loadIndex();
            return true;
          }

          var oldIndex = history._directionIndex;
          history._directionIndex  = history.loadIndex();
          history.trigger('route', fragment, history._directionIndex-oldIndex);

          handler.callback(fragment);
          return true;
        }
      });

      return matched;
    },

    // Pulls the direction index out of the state or hash
    loadIndex : function(fragmentOverride) {
      if (!this._trackDirection) return;
      if (!fragmentOverride && this._hasPushState) {
        return (this._state && this._state.index) || 0;
      } else {
        var match = indexMatch.exec(fragmentOverride || window.location.hash);
        return (match && parseInt(match[1], 10)) || 0;
      }
    },

    // Save a fragment into the hash history. You are responsible for properly
    // URL-encoding the fragment in advance. This does not trigger
    // a `hashchange` event.
    navigate : function(fragment, triggerRoute, replace, forceIndex) {
      var frag = (fragment || '').replace(hashStrip, '');
      var loc = window.location;
      if (this.fragment == frag || this.fragment == decodeURIComponent(frag)) return;

      // Figure out the direction index if enabled
      var newIndex;
      if (this._trackDirection) {
        newIndex = forceIndex || (this._directionIndex + (replace ? 0 : 1));
      }

      if (this._hasPushState) {
        if (frag.indexOf(this.options.root) != 0) frag = this.options.root + frag;
        this.fragment = frag;

        var history = window.history;
        this._state = {index: newIndex};
        history[replace ? 'replaceState' : 'pushState'](this._state, document.title, loc.protocol + '//' + loc.host + frag);
      } else {
        this.fragment = frag;
        if (this._trackDirection) frag = newIndex + '#' + frag;
        if (replace) {
          if (this._useReplaceState) {
            window.history.replaceState({}, document.title, loc.protocol + '//' + loc.host + loc.pathname + (loc.search || '') + '#' + frag);
          } else {
            loc.replace(loc.pathname + (loc.search || '') + '#' + frag);
          }
        } else {
          loc.hash = frag;
        }

        if (this.iframe && (frag != this.getFragment(this.iframe.location.hash))) {
          !replace && this.iframe.document.open().close();
          this.iframe.location.hash = frag;
        }
      }
      if (triggerRoute) this.loadUrl(fragment);
    },

    back : function(triggerRoute) {
      this.go(-1, triggerRoute);
    },
    foward : function(triggerRoute) {
      this.go(1, triggerRoute);
    },
    go : function(count, triggerRoute) {
      this._ignoreChange = !triggerRoute;

      window.history.go(count);
    }
  });
 })();
