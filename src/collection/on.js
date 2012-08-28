    if (eventName === 'collection' && typeof callback === 'object') {
      return addEvents(this._collectionEvents, callback);
    }
    
