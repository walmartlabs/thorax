    //mixins
    for (var i = 0; i < this.constructor.mixins.length; ++i) {
      applyMixin.call(this, this.constructor.mixins[i]);
    }
    if (this.mixins) {
      for (var i = 0; i < this.mixins.length; ++i) {
        applyMixin.call(this, this.mixins[i]);
      }
    }
    
