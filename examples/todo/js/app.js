// configure thorax.  'exports' is created by lumbar
Thorax.configure({
  scope: exports
});

// history.start() must be executed after all modules have been registered which,
// depending on the lumbar config, might not be at this time.
$(document).ready(function() {
  Backbone.history.start();
});
