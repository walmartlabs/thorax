Handlebars.registerHelper('template', function(name, options) {
  var context = _.extend({fn: options && options.fn}, this, options ? options.hash : {});
  var output = Thorax.View.prototype.renderTemplate.call(getOptionsData(options).view, name, context);
  return new Handlebars.SafeString(output);
});

Handlebars.registerHelper('yield', function(options) {
  return getOptionsData(options).yield && options.data.yield();
});
