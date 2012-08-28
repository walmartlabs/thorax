    if (eventName === 'model' && typeof callback === 'object') {
      return addEvents(this._modelEvents, callback);
    }
    
