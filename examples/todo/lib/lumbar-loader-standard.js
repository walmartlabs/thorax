lumbarLoader.loadJS = function(moduleName, callback) {
  var loaded = loadResources(moduleName, 'js', 'src', function(href) {
    $script(href, callback);
    return 1;
  });
  return loaded.length;
};
lumbarLoader.loadCSS = function(moduleName, callback) {
  var loaded = loadResources(moduleName, 'css', 'href', function(href) {
    var link = document.createElement('link');
    link.rel = 'stylesheet';
    link.type = 'text/css';
    link.href = href;
    return link;
  });

  if (callback) {
    var interval = setInterval(function() {
      var i = loaded.length;
      while (i--) {
        var sheet = loaded[i];
        if ((sheet.sheet && sheet.sheet.cssRules.length) || (sheet.styleSheet && sheet.styleSheet.cssText)) {
          loaded.splice(i, 1);
          callback();
        }
      }
      if (!loaded.length) {
        clearInterval(interval);
      }
    }, 100);
  }
  return loaded.length;
};