{{#inject "configure"}}
  //HelperView will not have mixins so need to check
  this.constructor.mixins && _.each(this.constructor.mixins, applyMixin, this);
  this.mixins && _.each(this.mixins, applyMixin, this);
{{/inject}}

{{#inject "extend"}}
  child.mixins = _.clone(this.mixins);
{{/inject}}

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
