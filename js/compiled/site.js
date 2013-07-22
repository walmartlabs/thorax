$(function() {
  var $searchEl = $('#search'),
      $apiLists = $('.sidebar-secondary'),
      $apiEntries = $('.sidebar-secondary li'),
      $headings = $('.sidebar-primary > li'),
      $searchReset = $('#search-reset'),
      $sidebar = $('sidebar-primary');

  $searchEl.keyup(updateSearch);

  $searchReset.click(function() {
    $searchEl.val('');
    stateChangeCallbacks.notSearching();
  });
  
  function escapeRegExp(str) {
    return str.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, "\\$&");
  }

  function updateSearch() {
    var value = $searchEl.val().replace(/(^\s+|\s+$)/g, '').toLowerCase(),
        valueRegexp = new RegExp(escapeRegExp(value));

    if (value) {
      if (state === 'notSearching') {
        stateChangeCallbacks.searching();
      }
      $apiEntries.hide();
      // show all entries that match
      var foundIds = [],
          foundTitles = [];
      for (var title in autoCompleteData) {
        var id = autoCompleteData[title];
        if (title.toLowerCase().search(valueRegexp) !== -1) {
          foundIds.push(id);
          foundTitles.push(title);
        }
      }

      // show API entries
      for (var i = 0; i < foundIds.length; ++i) {
        var id = foundIds[i];
        $apiLists.find('a[href="#' + id + '"]').parent().show();
      }

      // hide titles that have no API entries
      $headings.show();
      $headings.each(function() {
        var $this = $(this);
        if (!$this.find('> ul > li:visible').length) {
          $this.hide();
        }
      });

      // show titles that directly match
      for (var i = 0; i < foundIds.length; ++i) {
        var id = foundIds[i];
        $headings.find('> a[href="#' + id + '"]').parent().show();
      }

      // scroll to the found item if there was just one
      if (foundIds.length === 1) {
        // use attribute syntax as ids may have "." in them
        window.scrollTo(0, $('[id="' + foundIds[0] + '"]').offset().top);
      }
    } else {
      if (state === 'searching') {
        stateChangeCallbacks.notSearching();
      }
    }
  }
  
  var state;
  var stateChangeCallbacks = {
    searching: function() {
      state = 'searching';
      $apiLists.show();
      $searchReset.show();
    },
    notSearching: function() {
      state = 'notSearching';
      $headings.show();
      $apiLists.hide();
      $searchReset.hide();
    }
  };
  
  stateChangeCallbacks.notSearching();

});

$(function() {

  // Fix API sidebar position on scroll

  var sidebar = $('.sidebar');
  var threshold = 24;

  if (sidebar.length > 0) {
    var sidebarTop = sidebar.offset().top;

    var positionSidebar = function() {
      var docViewTop = $(window).scrollTop();

      if (sidebarTop <= docViewTop + 24) {
        sidebar.addClass('is-fixed');
      } else {
        sidebar.removeClass('is-fixed');
      }
    };

    $(window).scroll(function() {
      positionSidebar();
    });

    positionSidebar();
  }


  // Toggle tutorial video display

  var hero = $('.hero'),
      video = $('.video').find('iframe')[0],
      player = $f(video),
      videoButton = $('.js-screencast');

  if (hero.length > 0) {
    hero.height( hero.outerHeight() );

    var toggleVideo = function() {
      if ( !hero.hasClass('has-video') || hero.hasClass('no-video') ) {
        hero.addClass('has-video')
            .removeClass('no-video');
      } else {
        hero.removeClass('has-video')
            .addClass('no-video');
        player.api('pause');
      }
    };

    videoButton.on('click', function(e) {
      e.preventDefault();
      toggleVideo();
    });
  }

  // features toggle
  $('.features li').click(function(event) {
    event.preventDefault();
    var id = $(this).find('a').attr('href');
    hideFeatures();
    toggleFeature(id, true);
  });

  function hideFeatures() {
    $('.features li').each(function() {
      toggleFeature($(this).find('a').attr('href'), false);
    });
  }
  hideFeatures();

  function toggleFeature(id, show) {
    var elements = $(id).add($(id).nextUntil('h2'));
    elements.toggle(show);
  }

  toggleFeature($('.features li:first a').attr('href'), true);

});
// Init style shamelessly stolen from jQuery http://jquery.com
var Froogaloop = (function(){
    // Define a local copy of Froogaloop
    function Froogaloop(iframe) {
        // The Froogaloop object is actually just the init constructor
        return new Froogaloop.fn.init(iframe);
    }

    var eventCallbacks = {},
        hasWindowEvent = false,
        isReady = false,
        slice = Array.prototype.slice,
        playerDomain = '';

    Froogaloop.fn = Froogaloop.prototype = {
        element: null,

        init: function(iframe) {
            if (typeof iframe === "string") {
                iframe = document.getElementById(iframe);
            }

            this.element = iframe;

            // Register message event listeners
            playerDomain = getDomainFromUrl(this.element.getAttribute('src'));

            return this;
        },

        /*
         * Calls a function to act upon the player.
         *
         * @param {string} method The name of the Javascript API method to call. Eg: 'play'.
         * @param {Array|Function} valueOrCallback params Array of parameters to pass when calling an API method
         *                                or callback function when the method returns a value.
         */
        api: function(method, valueOrCallback) {
            if (!this.element || !method) {
                return false;
            }

            var self = this,
                element = self.element,
                target_id = element.id !== '' ? element.id : null,
                params = !isFunction(valueOrCallback) ? valueOrCallback : null,
                callback = isFunction(valueOrCallback) ? valueOrCallback : null;

            // Store the callback for get functions
            if (callback) {
                storeCallback(method, callback, target_id);
            }

            postMessage(method, params, element);
            return self;
        },

        /*
         * Registers an event listener and a callback function that gets called when the event fires.
         *
         * @param eventName (String): Name of the event to listen for.
         * @param callback (Function): Function that should be called when the event fires.
         */
        addEvent: function(eventName, callback) {
            if (!this.element) {
                return false;
            }

            var self = this,
                element = self.element,
                target_id = element.id !== '' ? element.id : null;


            storeCallback(eventName, callback, target_id);

            // The ready event is not registered via postMessage. It fires regardless.
            if (eventName != 'ready') {
                postMessage('addEventListener', eventName, element);
            }
            else if (eventName == 'ready' && isReady) {
                callback.call(null, target_id);
            }

            return self;
        },

        /*
         * Unregisters an event listener that gets called when the event fires.
         *
         * @param eventName (String): Name of the event to stop listening for.
         */
        removeEvent: function(eventName) {
            if (!this.element) {
                return false;
            }

            var self = this,
                element = self.element,
                target_id = element.id !== '' ? element.id : null,
                removed = removeCallback(eventName, target_id);

            // The ready event is not registered
            if (eventName != 'ready' && removed) {
                postMessage('removeEventListener', eventName, element);
            }
        }
    };

    /**
     * Handles posting a message to the parent window.
     *
     * @param method (String): name of the method to call inside the player. For api calls
     * this is the name of the api method (api_play or api_pause) while for events this method
     * is api_addEventListener.
     * @param params (Object or Array): List of parameters to submit to the method. Can be either
     * a single param or an array list of parameters.
     * @param target (HTMLElement): Target iframe to post the message to.
     */
    function postMessage(method, params, target) {
        if (!target.contentWindow.postMessage) {
            return false;
        }

        var url = target.getAttribute('src').split('?')[0],
            data = JSON.stringify({
                method: method,
                value: params
            });

        if (url.substr(0, 2) === '//') {
            url = window.location.protocol + url;
        }

        target.contentWindow.postMessage(data, url);
    }

    /**
     * Event that fires whenever the window receives a message from its parent
     * via window.postMessage.
     */
    function onMessageReceived(event) {
        var data, method;

        try {
            data = JSON.parse(event.data);
            method = data.event || data.method;
        }
        catch(e)  {
            //fail silently... like a ninja!
        }

        if (method == 'ready' && !isReady) {
            isReady = true;
        }

        // Handles messages from moogaloop only
        if (event.origin != playerDomain) {
            return false;
        }

        var value = data.value,
            eventData = data.data,
            target_id = target_id === '' ? null : data.player_id,

            callback = getCallback(method, target_id),
            params = [];

        if (!callback) {
            return false;
        }

        if (value !== undefined) {
            params.push(value);
        }

        if (eventData) {
            params.push(eventData);
        }

        if (target_id) {
            params.push(target_id);
        }

        return params.length > 0 ? callback.apply(null, params) : callback.call();
    }


    /**
     * Stores submitted callbacks for each iframe being tracked and each
     * event for that iframe.
     *
     * @param eventName (String): Name of the event. Eg. api_onPlay
     * @param callback (Function): Function that should get executed when the
     * event is fired.
     * @param target_id (String) [Optional]: If handling more than one iframe then
     * it stores the different callbacks for different iframes based on the iframe's
     * id.
     */
    function storeCallback(eventName, callback, target_id) {
        if (target_id) {
            if (!eventCallbacks[target_id]) {
                eventCallbacks[target_id] = {};
            }
            eventCallbacks[target_id][eventName] = callback;
        }
        else {
            eventCallbacks[eventName] = callback;
        }
    }

    /**
     * Retrieves stored callbacks.
     */
    function getCallback(eventName, target_id) {
        if (target_id) {
            return eventCallbacks[target_id][eventName];
        }
        else {
            return eventCallbacks[eventName];
        }
    }

    function removeCallback(eventName, target_id) {
        if (target_id && eventCallbacks[target_id]) {
            if (!eventCallbacks[target_id][eventName]) {
                return false;
            }
            eventCallbacks[target_id][eventName] = null;
        }
        else {
            if (!eventCallbacks[eventName]) {
                return false;
            }
            eventCallbacks[eventName] = null;
        }

        return true;
    }

    /**
     * Returns a domain's root domain.
     * Eg. returns http://vimeo.com when http://vimeo.com/channels is sbumitted
     *
     * @param url (String): Url to test against.
     * @return url (String): Root domain of submitted url
     */
    function getDomainFromUrl(url) {
        if (url.substr(0, 2) === '//') {
            url = window.location.protocol + url;
        }

        var url_pieces = url.split('/'),
            domain_str = '';

        for(var i = 0, length = url_pieces.length; i < length; i++) {
            if(i<3) {domain_str += url_pieces[i];}
            else {break;}
            if(i<2) {domain_str += '/';}
        }

        return domain_str;
    }

    function isFunction(obj) {
        return !!(obj && obj.constructor && obj.call && obj.apply);
    }

    function isArray(obj) {
        return toString.call(obj) === '[object Array]';
    }

    // Give the init function the Froogaloop prototype for later instantiation
    Froogaloop.fn.init.prototype = Froogaloop.fn;

    // Listens for the message event.
    // W3C
    if (window.addEventListener) {
        window.addEventListener('message', onMessageReceived, false);
    }
    // IE
    else {
        window.attachEvent('onmessage', onMessageReceived);
    }

    // Expose froogaloop to the global object
    return (window.Froogaloop = window.$f = Froogaloop);

})();