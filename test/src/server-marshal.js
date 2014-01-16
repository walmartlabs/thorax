describe('server-marshall', function() {
  var $el;

  beforeEach(function() {
    Thorax.ServerMarshal._reset();
    window.$serverSide = true;

    $el = $('<div>');
  });

  describe('store/load', function() {
    it('should create a new id if none', function() {
      Thorax.ServerMarshal.store($el, 'name');
      expect($el.attr('data-server-data')).to.equal('0');

      $el = $('<div>');
      Thorax.ServerMarshal.store($el, 'name');
      expect($el.attr('data-server-data')).to.equal('1');
    });
    it('should reuse existing ids', function() {
      Thorax.ServerMarshal.store($el, 'name');
      expect($el.attr('data-server-data')).to.equal('0');

      Thorax.ServerMarshal.store($el, 'other');
      expect($el.attr('data-server-data')).to.equal('0');
    });

    describe('primitive values', function() {
      it('should store constants', function() {
        ['foo', 1234, true, false, 0, '', null].forEach(function(value) {
          Thorax.ServerMarshal.store($el, 'value', value);
          expect(Thorax.ServerMarshal.load($el[0], 'value')).to.eql(value);
        });
      });
      it('should store lookups', function() {
        var context = {
          aField: {aField: true}
        };

        Thorax.ServerMarshal.store($el, 'value', context.aField, 'aField');
        expect(Thorax.ServerMarshal.load($el[0], 'value', context)).to.eql(context.aField);
        expect(Thorax.ServerMarshal.load($el[0], 'value', undefined, context)).to.eql(context.aField);
      });
    });
    describe('arrays', function() {
      it('should store constant children', function() {
        Thorax.ServerMarshal.store($el, 'array', ['foo', 1234, true, false, 0, '', null]);
        expect(Thorax.ServerMarshal.load($el[0], 'array')).to.eql(['foo', 1234, true, false, 0, '', null]);
      });
      it('should store with lookup references', function() {
        var context = {
          aField: {aField: true}
        };

        Thorax.ServerMarshal.store($el, 'array', ['foo', context.aField], [null, 'aField']);
        expect(Thorax.ServerMarshal.load($el[0], 'array', context)).to.eql(['foo', context.aField]);
        expect(Thorax.ServerMarshal.load($el[0], 'array', undefined, context)).to.eql(['foo', context.aField]);
        expect(Thorax.ServerMarshal.load($el[0], 'array', {}, context)).to.eql(['foo', context.aField]);
      });
      it('should throw on complex values without lookups', function() {
        var context = {
          aField: {aField: true}
        };

        expect(function() {
          Thorax.ServerMarshal.store($el, 'array', ['foo', context.aField], [null, null]);
        }).to['throw'](/server-marshall-object/);
        expect(function() {
          Thorax.ServerMarshal.store($el, 'array', ['foo', context.aField]);
        }).to['throw'](/server-marshall-object/);
      });
    });
    describe('objects', function() {
      it('should store constant children', function() {
        Thorax.ServerMarshal.store($el, 'obj', {
          thing1: 'foo',
          thing2: 1234,
          thing3: true,
          thing4: false,
          thing5: 0,
          thing6: '',
          thing7: null
        });
        expect(Thorax.ServerMarshal.load($el[0], 'obj')).to.eql({
          thing1: 'foo',
          thing2: 1234,
          thing3: true,
          thing4: false,
          thing5: 0,
          thing6: '',
          thing7: null
        });
      });
      it('should store with lookup references', function() {
        var context = {
          aField: {aField: true}
        };

        Thorax.ServerMarshal.store($el, 'obj', {foo: context.aField}, {foo: 'aField'});
        expect(Thorax.ServerMarshal.load($el[0], 'obj', context)).to.eql({foo: context.aField});
        expect(Thorax.ServerMarshal.load($el[0], 'obj', undefined, context)).to.eql({foo: context.aField});
        expect(Thorax.ServerMarshal.load($el[0], 'obj', {}, context)).to.eql({foo: context.aField});
      });
      it('should throw on complex values without lookups', function() {
        var context = {
          aField: {aField: true}
        };

        expect(function() {
          Thorax.ServerMarshal.store($el, 'obj', {'foo': context.aField}, {});
        }).to['throw'](/server-marshall-object/);
      });
    });
  });

  describe('serialize', function() {
    it('should not fail with circular references', function() {
        var context = {
          aField: {aField: true}
        };
        context.aField.aField = context.aField;

        Thorax.ServerMarshal.store($el, 'obj', {foo: context.aField}, {foo: 'aField'});

        expect(Thorax.ServerMarshal.serialize()).to.match(/"\$lut":"aField"/);
    });
  });
});
