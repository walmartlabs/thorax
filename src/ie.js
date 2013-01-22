var isIE = (/msie [\w.]+/).exec(navigator.userAgent.toLowerCase());

// IE will lose a reference to the elements if view.el.innerHTML = '';
// If they are removed one by one the references are not lost.
// For instance a view's childrens' `el`s will be lost if the view
// sets it's `el.innerHTML`.
if (isIE) {
  Thorax.View.on('before:append', function() {
    if (this._renderCount > 0) {
      _.each(this._elementsByCid, function(element) {
        $(element).remove();
      });
      _.each(this.children, function(child) {
        child.$el.remove();
      });
    }
  });
}
