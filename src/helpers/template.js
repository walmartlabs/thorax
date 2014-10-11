/*global getOptionsData */
Handlebars.registerHelper('template', function(name, options) {
  /*jshint -W089 */
  var hasHash = false;
  for (var name in options.hash) {
    // Not doing hasOwnProperty check here as this is going to be a handlebars
    // generated object literal in most cases and under the rare situation that
    // the Object prototype has manipulated, the extend path will continue to do
    // the correct thing.
    hasHash = true;
    break;
  }

  var context = this;
  if (options.fn || hasHash) {
    context = _.extend({fn: options && options.fn}, context, options.hash);
  }

  var output = getOptionsData(options).view.renderTemplate(name, context);
  return new Handlebars.SafeString(output);
});

Handlebars.registerHelper('yield', function(options) {
  return getOptionsData(options).yield && options.data.yield();
});
