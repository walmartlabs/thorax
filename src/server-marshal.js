/*global $serverSide, createError, onEmit */
var _thoraxServerData = window._thoraxServerData || [];

/*
 * Allows for complex data to be communicated between the server and client
 * contexts for an arbitrary element.
 *
 * This is primarily intended for resolving template associated data on the client
 * but any data can be expressed via simple paths from a known root object, such
 * as a view instance or it's rendering context, may be marshaled.
 */
var ServerMarshal = Thorax.ServerMarshal = {
  store: function($el, name, attributes, attributeIds, options) {
    if ($serverSide) {
      attributeIds = attributeIds || {};
      options = options || {};

      var contextPath = options.data && options.data.contextPath;

      var elementCacheId = $el._serverData || parseInt($el.attr('data-server-data'), 10);
      if (isNaN(elementCacheId)) {
        elementCacheId = _thoraxServerData.length;
        _thoraxServerData[elementCacheId] = {};

        $el._serverData = elementCacheId;
        $el.attr('data-server-data', elementCacheId);
      }

      var cache = _thoraxServerData[elementCacheId];
      cache[name] = undefined;

      function lut(value, key) {
        var lutKey = attributeIds[key];
        if (_.isString(value) || _.isNumber(value) || _.isNull(value) || _.isBoolean(value)) {
          return value;
        } else if (lutKey != null && lutKey !== true && !/^\.\.\//.test(lutKey)) {
          // This is an object what has a path associated with it so we should hopefully
          // be able to resolve it on the client.
          return {
            $lut: Handlebars.Utils.appendContextPath(contextPath, lutKey)
          };
        } else {
          // This is some sort of unsuppored object type or a depthed reference (../foo)
          // which is not supported.
          throw createError('server-marshall-object');
        }
      }

      if (_.isArray(attributes) && !_.isString(attributeIds) && !attributes.toJSON) {
        if (attributes.length) {
          cache[name] = _.map(attributes, lut);
        }
      } else if (_.isObject(attributes) && !_.isString(attributeIds) && !attributes.toJSON) {
        var stored = {},
            valueSet;
        _.each(attributes, function(value, key) {
          stored[key] = lut(value, key);
          valueSet = true;
        });
        if (valueSet) {
          cache[name] = stored;
        }
      } else {
        attributeIds = {field: attributeIds};
        cache[name] = lut(attributes, 'field');
      }
    }
  },
  load: function(el, name, parentView, context) {
    var elementCacheId = parseInt(el.getAttribute('data-server-data'), 0),
        cache = _thoraxServerData[elementCacheId];
    if (!cache) {
      return;
    }

    function resolve(value) {
      return (value && value.$lut != null) ? lookupField(parentView, context, value.$lut) : value;
    }

    cache = cache[name];
    if (_.isArray(cache)) {
      return _.map(cache, resolve);
    } else if (!_.isFunction(cache) && _.isObject(cache) && cache.$lut == null) {
      var ret = {};
      _.each(cache, function(value, key) {
        ret[key] = resolve(value);
      });
      return ret;
    } else {
      return resolve(cache);
    }
  },

  serialize: function() {
    if ($serverSide) {
      return JSON.stringify(_thoraxServerData);
    }
  },

  destroy: function($el) {
    /*jshint -W035 */
    var elementCacheId = parseInt($el.attr('data-server-data'), 10);
    if (!isNaN(elementCacheId)) {
      _thoraxServerData[elementCacheId] = undefined;

      // Reclaim whatever slots that we can. This ensures a smaller output structure while avoiding
      // conflicts that may occur when operating in a shared environment.
      var len = _thoraxServerData.length;
      while (len-- && !_thoraxServerData[len]) { /* NOP */ }
      if (len < _thoraxServerData.length - 1) {
        _thoraxServerData.length = len + 1;
      }
    }
  },

  _reset: function() {
    // Intended for tests only
    _thoraxServerData = [];
  }
};

// Register a callback to output our content from the server implementation.
if ($serverSide) {
  onEmit(function() {
    $('body').append('<script>var _thoraxServerData = ' + ServerMarshal.serialize() + ';</script>');
  });
}

/*
 * Walks a given parent or context scope, attempting to resolve a dot
 * separated path.
 *
 * The parent context is given priority.
 */
function lookupField(parent, context, fieldName) {
  function lookup(context) {
    for (var i = 0; context && i < components.length; i++) {
      if (components[i] !== '' && components[i] !== '.' && components[i] !== 'this') {
        context = context[components[i]];
      }
    }
    return context;
  }

  var components = fieldName.split('.');
  return lookup(context) || lookup(parent);
}
