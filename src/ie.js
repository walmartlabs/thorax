var isIE = (/msie [\w.]+/).exec(navigator.userAgent.toLowerCase());

if (isIE) {
  // IE will lose a reference to the elements if view.el.innerHTML = '';
  // If they are removed one by one the references are not lost.
  // For instance a view's childrens' `el`s will be lost if the view
  // sets it's `el.innerHTML`.
  Thorax.View.on('before:append', function() {
    // note that detach is not available in Zepto,
    // but IE should never run with Zepto
    if (this._renderCount > 0) {
      _.each(this._elementsByCid, function(element) {
        $(element).detach();
      });
      _.each(this.children, function(child) {
        child.$el.detach();
      });
    }
  });

  // Once nodes are detached their innerHTML gets nuked in IE
  // so create a deep clone. This method is identical to the
  // main implementation except for ".clone(true, true)" which
  // will perform a deep clone with events and data
  Thorax.CollectionView.prototype._replaceHTML = function(html) {
    if (this.collection && this._objectOptionsByCid[this.collection.cid] && this._renderCount) {
      var element;
      var oldCollectionElement = this.getCollectionElement().clone(true, true);
      element = _replaceHTML.call(this, html);
      if (!oldCollectionElement.attr('data-view-cid')) {
        this.getCollectionElement().replaceWith(oldCollectionElement);
      }
    } else {
      return _replaceHTML.call(this, html);
    }
  };
}
