_.extend(Thorax.View, {
  mixins: [],
  mixin: function(mixin) {
    this.mixins.push(mixin);
  }
});

function applyMixin(mixin) {
  if (_.isArray(mixin)) {
    this.mixin.apply(this, mixin);
  } else {
    this.mixin(mixin);
  }
}
