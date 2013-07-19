// Automatically generate a curried helper for certain objects
var AutoHelpers = Thorax.AutoHelpers = {};

// we don't actually want _.bind here as need to preserve
// function context
function curry(func) {
  var args = _.rest(arguments, 1);
  if (!args.length) return func;
  return function() {
    return func.apply(this, args.concat(_.rest(arguments, 0)));
  }
}

function getHelpers(context) {
  var helpers = _.clone(this.helpers || {});
  _.each(AutoHelpers, function(callback) {
    callback(context, helpers);
  });
  return helpers;
}

AutoHelpers.view = function(context, helpers) {
  _.each(context, function(value, key) {
    if (!Handlebars.helpers[key] && !helpers[key] && value instanceof Backbone.View) {
      helpers[key] = curry(Handlebars.helpers.view, value);
    }
  });
};

AutoHelpers.collection = function(context, helpers) {
  _.each(context, function(value, key) {
    if (!Handlebars.helpers[key] && !helpers[key] && value instanceof Backbone.Collection) {
      helpers[key] = curry(Handlebars.helpers.collection, value);
    }
  });
};

AutoHelpers.model = function(context, helpers) {
  _.each(context, function(value, key) {
    if (!Handlebars.helpers[key] && !helpers[key] && value instanceof Backbone.Model) {
      helpers[key] = curry(Handlebars.helpers['with'], value.attributes);
    }
  });
};
