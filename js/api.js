$(function() {
  var $searchEl = $('#search'),
      $apiLists = $('.sidebar-secondary'),
      $apiEntries = $('.sidebar-secondary li'),
      $headings = $('.sidebar-primary > li'),
      $searchReset = $('#search-reset'),
      $sidebar = $('.sidebar');

  $searchEl.keyup(updateSearch);

  $searchReset.click(function() {
    $searchEl.val('');
    stateChangeCallbacks.notSearching();
  });

  // Fix API sidebar position on scroll

  if ($sidebar.length > 0) {
    var sidebarTop = $sidebar.offset().top;

    var positionSidebar = function() {
      var docViewTop = $(window).scrollTop();

      if (sidebarTop <= docViewTop) {
        $sidebar.addClass('fixed');
      } else {
        $sidebar.removeClass('fixed');
      }
    };

    $(window).scroll(function() {
      positionSidebar();
    });

    positionSidebar();
  }
  
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
