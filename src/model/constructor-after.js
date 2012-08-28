      if (this.model) {
        //need to null this.model so setModel will not treat
        //it as the old model and immediately return
        var model = this.model;
        this.model = null;
        this.setModel(model);
      }
