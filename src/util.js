/*global createRegistryWrapper:true, getEventCallback */

function createErrorMessage(code) {
  return 'Error "' + code + '". For more information visit http://thoraxjs.org/error-codes.html' + '#' + code;
}
function createError(code, info) {
  var error = new Error(createErrorMessage(code));
  error.name = code;
  error.info = info;
  return error;
}

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
  if (_.indexOf(name, '.') >= 0) {
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


function assignView(view, attributeName, options) {
  var ViewClass;
  // if attribute is the name of view to fetch
  if (_.isString(view[attributeName])) {
    ViewClass = Thorax.Util.getViewClass(view[attributeName], true);
  // else try and fetch the view based on the name
  } else if (view.name && !_.isFunction(view[attributeName])) {
    ViewClass = Thorax.Util.getViewClass(view.name + (options.extension || ''), true);
  }
  // if we found something, assign it
  if (ViewClass && !_.isFunction(view[attributeName])) {
    view[attributeName] = ViewClass;
  }
  // if nothing was found and it's required, throw
  if (options.required && !_.isFunction(view[attributeName])) {
    throw new Error('View ' + (view.name || view.cid) + ' requires: ' + attributeName);
  }
}

function assignTemplate(view, attributeName, options) {
  var template;
  // if attribute is the name of template to fetch
  if (_.isString(view[attributeName])) {
    template = Thorax.Util.getTemplate(view[attributeName], true);
  // else try and fetch the template based on the name
  } else if (view.name && !_.isFunction(view[attributeName])) {
    template = Thorax.Util.getTemplate(view.name + (options.extension || ''), true);
  }
  // CollectionView and LayoutView have a defaultTemplate that may be used if none
  // was found, regular views must have a template if render() is called
  if (!template && attributeName === 'template' && view._defaultTemplate) {
    template = view._defaultTemplate;
  }
  // if we found something, assign it
  if (template && !_.isFunction(view[attributeName])) {
    view[attributeName] = template;
  }
  // if nothing was found and it's required, throw
  if (options.required && !_.isFunction(view[attributeName])) {
    var err = new Error('view-requires: ' + attributeName);
    err.info = {
      name: view.name || view.cid,
      parent: view.parent && (view.parent.name || view.parent.cid),
      helperName: view._helperName
    };
    throw err;
  }
}

// getValue is used instead of _.result because we
// need an extra scope parameter, and will minify
// better than _.result
function getValue(object, prop, scope) {
  prop = object && object[prop];
  return prop && prop.call ? prop.call(scope || object) : prop;
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
function resetInheritVars(self) {
  // Ensure that we have our static event objects
  _.each(inheritVars, function(obj) {
    self[obj.name] = [];
  });
}
function walkInheritTree(source, fieldName, isStatic, callback) {
  /*jshint boss:true */
  var tree = [];
  if (_.has(source, fieldName)) {
    tree.push(source);
  }
  var iterate = source;
  if (isStatic) {
    while (iterate = iterate.__parent__) {
      if (_.has(iterate, fieldName)) {
        tree.push(iterate);
      }
    }
  } else {
    iterate = iterate.constructor;

    // Iterate over all prototypes exclusive of the backbone view prototype
    while (iterate && iterate.__super__) {
      if (iterate.prototype && _.has(iterate.prototype, fieldName)) {
        tree.push(iterate.prototype);
      }
      iterate = iterate.__super__ && iterate.__super__.constructor;
    }
  }

  var i = tree.length;
  while (i--) {
    _.each(getValue(tree[i], fieldName, source), callback);
  }
}

function objectEvents(target, eventName, callback, context) {
  if (_.isObject(callback)) {
    var spec = inheritVars[eventName];
    if (spec && spec.event) {
      if (target && target.listenTo && target[eventName] && target[eventName].cid) {
        addEvents(target, callback, context, eventName);
      } else {
        addEvents(target['_' + eventName + 'Events'], callback, context);
      }
      return true;
    }
  }
}
// internal listenTo function will error on destroyed
// race condition
function listenTo(object, target, eventName, callback, context) {
  // getEventCallback will resolve if it is a string or a method
  // and return a method
  var callbackMethod = getEventCallback(callback, object),
      destroyedCount = 0;

  function eventHandler() {
    if (object.el) {
      callbackMethod.apply(context, arguments);
    } else {
      // If our event handler is removed by destroy while another event is processing then we
      // we might see one latent event percolate through due to caching in the event loop. If we
      // see multiple events this is a concern and a sign that something was not cleaned properly.
      if (destroyedCount) {
        throw new Error('destroyed-event:' + object.name + ':' + eventName);
      }
      destroyedCount++;
    }
  }
  eventHandler._callback = callbackMethod._callback || callbackMethod;
  eventHandler._thoraxBind = true;
  object.listenTo(target, eventName, eventHandler);
}

function addEvents(target, source, context, listenToObject) {
  function addEvent(callback, eventName) {
    if (listenToObject) {
      listenTo(target, target[listenToObject], eventName, callback, context || target);
    } else {
      target.push([eventName, callback, context]);
    }
  }

  _.each(source, function(callback, eventName) {
    if (_.isArray(callback)) {
      _.each(callback, function(cb) {
        addEvent(cb, eventName);
      });
    } else {
      addEvent(callback, eventName);
    }
  });
}

// In helpers "tagName" or "tag" may be specified, as well
// as "class" or "className". Normalize to "tagName" and
// "className" to match the property names used by Backbone
// jQuery, etc. Special case for "className" in
// Thorax.Util.tag: will be rewritten as "class" in
// generated HTML.
function normalizeHTMLAttributeOptions(options) {
  if (options.tag) {
    options.tagName = options.tag;
    delete options.tag;
  }
  if (options['class']) {
    options.className = options['class'];
    delete options['class'];
  }
}

var voidTags;
function isVoidTag(tag) {
  if (!voidTags) {
    // http://www.w3.org/html/wg/drafts/html/master/syntax.html#void-elements
    var tags = 'area,base,br,col,embed,hr,img,input,keygen,link,menuitem,meta,param,source,track,wbr';

    voidTags = {};
    _.each(tags.split(','), function(tag) {
      voidTags[tag] = true;
    });
  }

  return voidTags[tag];
}

function filterAncestors(parent, callback) {
  return function() {
    if ($(this).parent().view({el: true, helper: true})[0] === parent.el) {
      return callback.call(this);
    }
  };
}

Thorax.Util = {
  getViewInstance: function(name, attributes) {
    var ViewClass = Thorax.Util.getViewClass(name, true);
    return ViewClass ? new ViewClass(attributes || {}) : name;
  },

  getViewClass: function(name, ignoreErrors) {
    if (_.isString(name)) {
      return registryGet(Thorax, 'Views', name, ignoreErrors);
    } else if (_.isFunction(name)) {
      return name;
    } else {
      return false;
    }
  },

  getTemplate: function(file, ignoreErrors) {
    if (_.isFunction(file)) {
      return file;
    }

    //append the template path prefix if it is missing
    var pathPrefix = Thorax.templatePathPrefix,
        template;
    if (pathPrefix && file.substr(0, pathPrefix.length) !== pathPrefix) {
      file = pathPrefix + file;
    }

    // Without extension
    file = file.replace(/\.handlebars$/, '');
    template = Handlebars.templates[file];
    if (!template) {
      // With extension
      file = file + '.handlebars';
      template = Handlebars.templates[file];
    }

    if (!template && !ignoreErrors) {
      throw new Error('templates: ' + file + ' does not exist.');
    }
    return template;
  },

  //'selector' is not present in $('<p></p>')
  //TODO: investigage a better detection method
  is$: function(obj) {
    return _.isObject(obj) && ('length' in obj);
  },
  expandToken: function(input, scope, encode) {
    /*jshint boss:true */

    if (input && input.indexOf && input.indexOf('{{') >= 0) {
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
        if (encode && _.isString(scope)) {
          return encodeURIComponent(scope);
        } else {
          return scope;
        }
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
    var tag = attributes.tagName || 'div',
        noClose = isVoidTag(tag);

    if (noClose && content) {
      throw new Error(createErrorMessage('void-tag-content'));
    }

    var openingTag = '<' + tag + ' ' + _.map(attributes, function(value, key) {
      if (value == null || key === 'expand-tokens' || key === 'tagName') {
        return '';
      }
      var formattedValue = value;
      if (scope) {
        formattedValue = Thorax.Util.expandToken(value, scope);
      }
      return (key === 'className' ? 'class' : key) + '="' + Handlebars.Utils.escapeExpression(formattedValue) + '"';
    }).join(' ') + '>';

    if (noClose) {
      return openingTag;
    } else {
      return openingTag + (content == null ? '' : content) + '</' + tag + '>';
    }
  }
};
