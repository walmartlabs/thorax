/*global createRegistryWrapper:true, cloneEvents: true */
function createRegistryWrapper(klass, hash) {
  var $super = klass.extend;
  klass.extend = function() {
    var child = $super.apply(this, arguments);
    if (child.prototype.name) {
      hash[child.prototype.name] = child;
    }
    return child;
  };
}
function registryGet(object, type, name, ignoreErrors) {
  var target = object[type],
      value;
  if (name.indexOf('.') >= 0) {
    var bits = name.split(/\./);
    name = bits.pop();
    _.each(bits, function(key) {
      target = target[key];
    });
  }
  target && (value = target[name]);
  if (!value && !ignoreErrors) {
    throw new Error(type + ': ' + name + ' does not exist.');
  } else {
    return value;
  }
}

function getValue(object, prop) {
  if (!(object && object[prop])) {
    return null;
  }
  return _.isFunction(object[prop])
    ? object[prop].apply(object, Array.prototype.slice.call(arguments, 2))
    : object[prop];
}

var inheritVars = {};
function createInheritVars(self) {
  // Ensure that we have our static event objects
  _.each(inheritVars, function(obj) {
    if (!self[obj.name]) {
      self[obj.name] = [];
    }
  });
}
function cloneInheritVars(source, target) {
  _.each(inheritVars, function(obj) {
    var key = obj.name;
    source[key] = _.clone(target[key]);

    //need to deep clone events array
    _.each(source[key], function(value, _key) {
      if (_.isArray(value)) {
        target[key][_key] = _.clone(value);
      }
    });
  });
}
function objectEvents(target, eventName, callback) {
  if (_.isObject(callback)) {
    var spec = inheritVars[eventName];
    if (spec && spec.event) {
      addEvents(target[spec.name], callback);
      return true;
    }
  }
}
function addEvents(target, source) {
  _.each(source, function(callback, eventName) {
    if (_.isArray(callback)) {
      _.each(callback, function(cb) {
        target.push([eventName, cb]);
      });
    } else {
      target.push([eventName, callback]);
    }
  });
}

function extendOptions(name, callback) {
  var $super = Thorax.View.prototype[name];
  Thorax.View.prototype[name] = function(dataObject, options) {
    return $super.call(this, dataObject, _.extend(callback.call(this, dataObject, options), options));
  };
}

Thorax.Util = {
  getViewInstance: function(name, attributes) {
    attributes['class'] && (attributes.className = attributes['class']);
    attributes.tag && (attributes.tagName = attributes.tag);
    if (typeof name === 'string') {
      var Klass = registryGet(Thorax, 'Views', name, false);
      return Klass.cid ? _.extend(Klass, attributes || {}) : new Klass(attributes);
    } else if (typeof name === 'function') {
      return new name(attributes);
    } else {
      return name;
    }
  },

  getTemplate: function(file, ignoreErrors) {
    //append the template path prefix if it is missing
    var pathPrefix = Thorax.templatePathPrefix,
        template;
    if (pathPrefix && file.substr(0, pathPrefix.length) !== pathPrefix) {
      file = pathPrefix + file;
    }

    // Without extension
    file = file.replace(/\.handlebars$/, '');
    template = Thorax.templates[file];
    if (!template) {
      // With extension
      file = file + '.handlebars';
      template = Thorax.templates[file];
    }

    if (template && typeof template === 'string') {
      template = Thorax.templates[file] = Handlebars.compile(template);
    } else if (!template && !ignoreErrors) {
      throw new Error('templates: ' + file + ' does not exist.');
    }
    return template;
  },

  //'selector' is not present in $('<p></p>')
  //TODO: investigage a better detection method
  is$: function(obj) {
    return typeof obj === 'object' && ('length' in obj);
  },
  expandToken: function(input, scope) {
    // concatenate handlebars tokens as this file itself is a handlebars template
    if (input && input.indexOf && input.indexOf('{' + '{') >= 0) {
      var re = /(?:\{?[^{]+)|(?:\{\{([^}]+)\}\})/g,
          match,
          ret = [];
      function deref(token, scope) {
        if (token.match(/^("|')/) && token.match(/("|')$/)) {
          return token.replace(/(^("|')|('|")$)/g, '');
        }
        var segments = token.split('.'),
            len = segments.length;
        for (var i = 0; scope && i < len; i++) {
          if (segments[i] !== 'this') {
            scope = scope[segments[i]];
          }
        }
        return scope;
      }
      while (match = re.exec(input)) {
        if (match[1]) {
          var params = match[1].split(/\s+/);
          if (params.length > 1) {
            var helper = params.shift();
            params = _.map(params, function(param) { return deref(param, scope); });
            if (Handlebars.helpers[helper]) {
              ret.push(Handlebars.helpers[helper].apply(scope, params));
            } else {
              // If the helper is not defined do nothing
              ret.push(match[0]);
            }
          } else {
            ret.push(deref(params[0], scope));
          }
        } else {
          ret.push(match[0]);
        }
      }
      input = ret.join('');
    }
    return input;
  },
  tag: function(attributes, content, scope) {
    var htmlAttributes = _.omit(attributes, 'tag', 'tagName'),
        tag = attributes.tag || attributes.tagName || 'div';
    return '<' + tag + ' ' + _.map(htmlAttributes, function(value, key) {
      if (typeof value === 'undefined') {
        return '';
      }
      var formattedValue = value;
      if (scope) {
        formattedValue = Thorax.Util.expandToken(value, scope);
      }
      return key + '="' + Handlebars.Utils.escapeExpression(formattedValue) + '"';
    }).join(' ') + '>' + (typeof content === 'undefined' ? '' : content) + '</' + tag + '>';
  },
  htmlAttributesFromOptions: function(options) {
    var htmlAttributes = {};
    if (options.tag) {
      htmlAttributes.tag = options.tag;
    }
    if (options.tagName) {
      htmlAttributes.tagName = options.tagName;
    }
    if (options['class']) {
      htmlAttributes['class'] = options['class'];
    }
    if (options.id) {
      htmlAttributes.id = options.id;
    }
    return htmlAttributes;
  }
};
