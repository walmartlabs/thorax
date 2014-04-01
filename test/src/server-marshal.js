/*global $serverSide */
describe('server-marshal', function() {
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
      if ($serverSide) {
        return;
      }

      it('should store constants', function() {
        _.each(['foo', 1234, true, false, 0, '', null], function(value) {
          Thorax.ServerMarshal.store($el, 'value', value);
          expect(Thorax.ServerMarshal.load($el[0], 'value')).to.eql(value);
        });
      });
      it('should store lookups', function() {
        var context = {
          aField: {aField: true}
        };

        Thorax.ServerMarshal.store($el, 'value', context.aField, 'aField', {data: {root: context}});
        expect(Thorax.ServerMarshal.load($el[0], 'value', context)).to.eql(context.aField);
        expect(Thorax.ServerMarshal.load($el[0], 'value', undefined, context)).to.eql(context.aField);
      });
    });
    describe('arrays', function() {
      if ($serverSide) {
        return;
      }

      it('should store constant children', function() {
        Thorax.ServerMarshal.store($el, 'array', ['foo', 1234, true, false, 0, '', null]);
        expect(Thorax.ServerMarshal.load($el[0], 'array')).to.eql(['foo', 1234, true, false, 0, '', null]);
      });
      it('should store with lookup references', function() {
        var context = {
          aField: {aField: true}
        };

        Thorax.ServerMarshal.store($el, 'array', ['foo', context.aField], [null, 'aField'], {data: {view: context}});
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
        }).to.throwError(/server-marshall-object/);
        expect(function() {
          Thorax.ServerMarshal.store($el, 'array', ['foo', context.aField]);
        }).to.throwError(/server-marshall-object/);
      });
    });
    describe('objects', function() {
      if ($serverSide) {
        return;
      }

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

        Thorax.ServerMarshal.store($el, 'obj', {foo: context.aField}, {foo: 'aField'}, {data: {view: context}});
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
        }).to.throwError(/server-marshall-object/);
      });
      it('should throw on complex values with depthed path', function() {
        var context = {
          aField: {aField: true}
        };

        expect(function() {
          Thorax.ServerMarshal.store($el, 'obj', {'foo': context.aField}, {'foo': '../foo'});
        }).to.throwError(/server-marshall-object/);
      });
      it('should throw on complex values from subexpressions', function() {
        var context = {
          aField: {aField: true}
        };

        expect(function() {
          Thorax.ServerMarshal.store($el, 'obj', {'foo': context.aField}, {'foo': true});
        }).to.throwError(/server-marshall-object/);
      });

      it('should track with contextPath on view', function() {
        var context = {
          aField: {aField: true}
        };
        var options = {
          data: {
            view: {
              foo: {
                bar: context
              }
            },
            contextPath: 'foo.bar'
          }
        };

        Thorax.ServerMarshal.store($el, 'obj', {foo: context.aField}, {foo: 'aField'}, options);
        expect(Thorax.ServerMarshal.load($el[0], 'obj', {foo: {bar: context}})).to.eql({foo: context.aField});
      });

      it('should track with contextPath on context', function() {
        var context = {
          aField: {aField: true}
        };
        var options = {
          data: {
            root: {
              foo: {
                bar: context
              }
            },
            contextPath: 'foo.bar'
          }
        };

        Thorax.ServerMarshal.store($el, 'obj', {foo: context.aField}, {foo: 'aField'}, options);
        expect(Thorax.ServerMarshal.load($el[0], 'obj', {foo: {bar: context}})).to.eql({foo: context.aField});
      });

      it('should throw with different value on contextPath', function() {
        var context = {
          aField: {aField: true}
        };
        var options = {
          data: {
            root: {
              foo: {
                bar: 'lets go fishing'
              }
            },
            contextPath: 'foo.bar'
          }
        };

        expect(function() {
          Thorax.ServerMarshal.store($el, 'obj', {foo: context.aField}, {foo: 'aField'}, options);
        }).to.throwError(/server-marshall-object/);
      });
    });
  });

  describe('serialize', function() {
    it('should not fail with circular references', function() {
        var context = {
          aField: {aField: true}
        };
        context.aField.aField = context.aField;

        Thorax.ServerMarshal.store($el, 'obj', {foo: context.aField}, {foo: 'aField'}, {data: {view: context}});

        expect(Thorax.ServerMarshal.serialize()).to.match(/"\$lut":\s*"aField"/);
    });
  });

  describe('destroy', function() {
    it('should cleanup lut', function() {
      var $el1 = $('<div>'),
          $el2 = $('<div>'),
          $el3 = $('<div>');

      Thorax.ServerMarshal.store($el1, 'foo', 'bar1');
      Thorax.ServerMarshal.store($el2, 'foo', 'bar2');
      Thorax.ServerMarshal.store($el3, 'foo', 'bar3');

      expect(JSON.parse(Thorax.ServerMarshal.serialize())).to.eql([
        {"foo": 'bar1'},
        {"foo": 'bar2'},
        {"foo": 'bar3'}
      ]);

      Thorax.ServerMarshal.destroy($el2);
      expect(JSON.parse(Thorax.ServerMarshal.serialize())).to.eql([
        {foo: 'bar1'},
        null,
        {foo: 'bar3'}
      ]);

      Thorax.ServerMarshal.destroy($el3);
      expect(JSON.parse(Thorax.ServerMarshal.serialize())).to.eql([
        {foo: 'bar1'}
      ]);
    });
  });
});
