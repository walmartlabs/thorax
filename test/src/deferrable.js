
describe('Deferrable', function() {
  describe('#Deferrable', function() {
    describe('sync', function() {
      it('should work on no exec', function() {
        // Does not throw
        Thorax.Util.Deferrable().run();
      });
      it('should handle', function() {
        var deferrable = Thorax.Util.Deferrable(),
            foo;
        deferrable.exec(function() {
          expect(foo).to.be(undefined);
          foo = 'foo';
        });
        deferrable.exec(function() {
          expect(foo).to.equal('foo');
          foo = 'bar';
        });
        expect(foo).to.be(undefined);
        deferrable.run();
        expect(foo).to.equal('bar');
      });
      it('should handle late addition', function() {
        var deferrable = Thorax.Util.Deferrable(),
            foo;
        deferrable.exec(function() {
          expect(foo).to.be(undefined);
          foo = 'foo';

          deferrable.exec(function() {
            expect(foo).to.equal('bar');
            foo = 'bat';
          });
        });
        deferrable.exec(function() {
          expect(foo).to.equal('foo');
          foo = 'bar';
        });
        expect(foo).to.be(undefined);
        deferrable.run();
        expect(foo).to.equal('bat');
      });
      it('should handle chaining', function() {
        var deferrable = Thorax.Util.Deferrable(),
            foo;
        deferrable.exec(function() {
          expect(foo).to.be(undefined);
          foo = 'foo';
        });
        deferrable.chain(function() {
          expect(foo).to.equal('foo');
          foo = 'bar';
        });
        expect(foo).to.be(undefined);
        deferrable.run();
        expect(foo).to.equal('bar');
      });
    });

    describe('async', function() {
      it('should work on no exec', function(done) {
        this.clock.restore();
        Thorax.Util.Deferrable(done).run();
      });
      it('should handle', function(done) {
        this.clock.restore();
        var deferrable = Thorax.Util.Deferrable(function() {
          expect(foo).to.equal('bar');
          done();
        });
        var foo;
        deferrable.exec(function() {
          expect(foo).to.be(undefined);
          foo = 'foo';
        });
        deferrable.exec(function() {
          expect(foo).to.equal('foo');
          foo = 'bar';
        });
        deferrable.run();
        expect(foo).to.be(undefined);
      });
      it('should handle late addition', function(done) {
        this.clock.restore();
        var deferrable = Thorax.Util.Deferrable(function() {
          expect(foo).to.equal('bat');
          done();
        });
        var foo;
        deferrable.exec(function() {
          expect(foo).to.be(undefined);
          foo = 'foo';

          deferrable.exec(function() {
            expect(foo).to.equal('bar');
            foo = 'bat';
          });
        });
        deferrable.exec(function() {
          expect(foo).to.equal('foo');
          foo = 'bar';
        });
        expect(foo).to.be(undefined);
        deferrable.run();
      });
      it('should handle chaining', function(done) {
        this.clock.restore();
        var deferrable = Thorax.Util.Deferrable(function() {
          expect(foo).to.equal('bar');
          done();
        });
        var foo;
        deferrable.exec(function() {
          expect(foo).to.be(undefined);
          foo = 'foo';
        });
        deferrable.chain(function(next) {
          expect(foo).to.equal('foo');
          foo = 'bar';
          next();
        });
        expect(foo).to.be(undefined);
        deferrable.run();
      });
    });
  });

  describe('#triggerDeferrable', function() {
    var view;
    beforeEach(function() {
      view = new Thorax.View();
    });
    it('should exec sync', function() {
      var exec;
      view.on('foo', function(a, deferrable) {
        expect(a).to.equal('bar');
        deferrable.exec(function() {
          exec = true;
        });
      });
      view.triggerDeferrable('foo', 'bar', undefined);
      expect(exec).to.be(true);
    });
    it('should exec async', function(done) {
      this.clock.restore();

      var exec;
      view.on('foo', function(a, deferrable) {
        expect(a).to.equal('bar');
        deferrable.exec(function() {
          exec = true;
        });
      });
      view.triggerDeferrable('foo', 'bar', function() {
        expect(exec).to.be(true);
        done();
      });
      expect(exec).to.be(undefined);
    });
  });
});
