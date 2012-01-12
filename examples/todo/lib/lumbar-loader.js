var lumbarLoader = exports.loader = {
  loadPrefix: '',

  loadModule: function(moduleName, callback) {
    var loadCount = 0,
        expected = 1,
        allInit = false;
    function complete() {
      loadCount++;
      if (allInit && loadCount >= expected) {
        callback();
      }
    }

    expected += lumbarLoader.loadCSS(moduleName, complete);
    expected += lumbarLoader.loadJS(moduleName, complete);

    // If everything was done sync then fire away
    allInit = true;
    complete();
  },

  loadInlineCSS: function(content) {
    var style = document.createElement('style');
    style.textContent = content;
    document.body.appendChild(style);
    return style;
  }
};

function loadResources(moduleName, field, attr, create) {
  var module = moduleName === 'base' ? lumbarLoader.map.base : lumbarLoader.modules[moduleName], // Special case for the base case
      field = module[field] || [],
      loaded = [];

  if (Array.isArray ? !Array.isArray(field) :field.toString() !== '[object Array]') {
    field = [field];
  }
  for (var i = 0, len = field.length; i < len; i++) {
    var object = field[i];
    var href = checkLoadResource(object, attr);
    if (href) {
      var el = create(href);
      if (el && el.nodeType === 1) {
        document.body.appendChild(el);
      }
      loaded.push(el);
    }
  }
  return loaded;
}

var devicePixelRatio = window.devicePixelRatio || 1;
function checkLoadResource(object, attr) {
  var href = lumbarLoader.loadPrefix + (object.href || object);
  if ((!object.maxRatio || devicePixelRatio < object.maxRatio) && (!object.minRatio || object.minRatio <= devicePixelRatio)) {
    if (document.querySelector('[' + attr + '="' + href + '"]')) {
      return;
    }

    return href;
  }
}

exports.moduleMap = function(map, loadPrefix) {
  lumbarLoader.map = map;
  lumbarLoader.modules = map.modules;
  lumbarLoader.loadPrefix = loadPrefix || '';
};