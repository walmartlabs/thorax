/*global $serverSide, createError */
var _thoraxServerData = _thoraxServerData || [];

var ServerMarshal = Thorax.ServerMarshal = {
  store: function($el, name, attributes, attributeIds) {
    if ($serverSide) {
      attributeIds = attributeIds || {};

      var elementCacheId = parseInt($el.attr('data-server-data'), 0);
      if (isNaN(elementCacheId)) {
        elementCacheId = _thoraxServerData.length;
        _thoraxServerData[elementCacheId] = {};

        $el.attr('data-server-data', elementCacheId);
      }

      var cache = _thoraxServerData[elementCacheId];
      cache[name] = undefined;

      function lut(value, key) {
        var lutKey = attributeIds[key];
        if (_.isString(value) || _.isNumber(value) || _.isNull(value) || _.isBoolean(value)) {
          return value;
        } else if (attributeIds[key]) {
          return {$lut: attributeIds[key]};
        } else {
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
      return (value && value.$lut) ? lookupField(parentView, context, value.$lut) : value;
    }

    cache = cache[name];
    if (_.isArray(cache)) {
      return _.map(cache, resolve);
    } else if (!_.isFunction(cache) && _.isObject(cache) && !cache.$lut) {
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
      return '_thoraxServerData = ' + JSON.stringify(_thoraxServerData) + ';';
    }
  },

  _reset: function() {
    // Intended for tests only
    _thoraxServerData = [];
  }
};

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
