describe('loading', function() {
  var loadStart = 'load:start',
      loadEnd = 'load:end',
      loadStartTimeout = (Thorax.View.prototype._loadingTimeoutDuration * 1000) + 1,
      loadEndTimeout = (Thorax.View.prototype._loadingTimeoutEndDuration * 1000) + 1,
      Application = _.extend({}, Backbone.Events),
      exports = Application;
  window.exports = exports;

  Thorax.setRootObject(Application);

  describe('load events', function() {
    it('views should see load start from model', function() {
      var spy = this.spy(),
          model = new Thorax.Model({url: 'foo'}),
          view = new Thorax.View({name: 'food', render: function() {}, model: model});
      view.on('load:start', spy);

      expect($(view.el).hasClass('loading')).to.be['false'];
      model.loadStart();

      this.clock.tick(1000);
      expect(spy).to.have.been.calledOnce;
      expect($(view.el).hasClass('loading')).to.be['true'];
    });
    it('views should see load start from collection', function() {
      var spy = this.spy(),
          collection = new Thorax.Collection({url: 'foo'});
      var view = new Thorax.View({
        name: 'food',
        myCollection: collection,
        template: function() {}
      });
      view.bindDataObject('collection', view.myCollection);
      view.on('load:start', spy);
      view.render();
      expect($(view.el).hasClass('loading')).to.be['false'];
      collection.loadStart();

      this.clock.tick(1000);
      expect(spy).to.have.been.calledOnce;

      expect($(view.el).hasClass('loading')).to.be['true'];
    });
    it('views should not see load start after destroy', function() {
      var spy = this.spy(),
          model = new Thorax.Model({url: 'foo'}),
          view = new Thorax.View({name: 'food', render: function() {}, model: model});
      view.on('load:start', spy);

      expect($(view.el).hasClass('loading')).to.be['false'];
      view.destroy();

      model.loadStart();

      this.clock.tick(1000);
      expect(spy).to.not.have.been.called;
      expect($(view.el).hasClass('loading')).to.be['false'];
    });

    it('views should see load end from model', function() {
      var model = new Thorax.Model({url: 'foo'}),
          view = new Thorax.View({name: 'food', render: function() {}, model: model}),
          spy = this.spy(view, 'onLoadEnd');

      model.loadStart();
      this.clock.tick(1000);

      model.loadEnd();
      this.clock.tick(1000);

      expect(spy).to.have.been.calledOnce;
      expect($(view.el).hasClass('loading')).to.be['false'];
    });
    it('views should see load end from collection', function() {
      var collection = new Thorax.Collection({url: 'foo'});
      var view = new Thorax.View({
        name: 'food',
        collection: collection,
        template: function() {},
        itemTemplate: function() {return ''; }
      });
      var spy = this.spy(view, 'onLoadEnd');
      view.bindDataObject('collection', view.collection);
      collection.loadStart();
      this.clock.tick(1000);

      collection.loadEnd();
      this.clock.tick(1000);

      expect(spy).to.have.been.calledOnce;
      expect($(view.el).hasClass('loading')).to.be['false'];
    });
    it('views should see load end after destroy', function() {
      var spy = this.spy(),
          model = new Thorax.Model({url: 'foo'}),
          view = new Thorax.View({name: 'food', template: function() {}, model: model}),
          endSpy = this.spy(view, 'onLoadEnd');
      view.on('load:start', spy);

      expect($(view.el).hasClass('loading')).to.be['false'];
      model.loadStart();
      this.clock.tick(1000);

      expect($(view.el).hasClass('loading')).to.be['true'];
      view.destroy();

      model.loadEnd();
      this.clock.tick(1000);

      this.clock.tick(1000);
      expect(spy).to.have.been.calledOnce;
      expect(endSpy).to.have.been.calledOnce;
      expect($(view.el).hasClass('loading')).to.be['false'];
    });
  });

  describe('root load events', function() {
    beforeEach(function() {
      this.startSpy = this.spy();
      this.endSpy = this.spy();

      exports.on('load:start', Thorax.loadHandler(this.startSpy, this.endSpy));

      this.model = new Thorax.Model({url: 'foo'});
      this.view = new Thorax.View({name: 'food', model: this.model, template: function() {}});
    });
    afterEach(function() {
      exports._loadStart = undefined;
      exports.off('load:start');
      exports.off('load:end');
    });

    it('root should see load start from view', function() {
      this.model.loadStart();
      this.clock.tick(1000);
      expect(this.startSpy).to.have.been.calledOnce;
    });
    it('root should not see background load start', function() {
      this.model.loadStart(undefined, true);
      this.clock.tick(1000);
      expect(this.startSpy).to.not.have.been.called;
    });
    it('root should not see load start from nonBlocking view', function() {
      this.view.nonBlockingLoad = true;
      this.model.loadStart();
      this.clock.tick(1000);
      expect(this.startSpy).to.not.have.been.called;
    });
    it('root should see load start for queued non background', function() {
      this.model.loadStart(undefined, true);
      this.clock.tick(1000);
      expect(this.startSpy).to.not.have.been.called;

      this.model.loadStart();
      this.clock.tick(1000);
      expect(this.startSpy).to.have.been.calledOnce;
    });

    it('root should see load end from view', function() {
      this.model.loadStart();
      this.clock.tick(1000);

      this.model.loadEnd();
      this.clock.tick(1000);

      expect(this.endSpy).to.have.been.calledOnce;
    });
    it('root should see load end after destroy', function() {
      this.model.loadStart();
      this.clock.tick(1000);

      this.view.destroy();

      this.model.loadEnd();
      this.clock.tick(1000);

      expect(this.endSpy).to.have.been.calledOnce;
    });
    it('root should not see background load end', function() {
      this.model.loadStart(undefined, true);
      this.clock.tick(1000);

      this.model.loadEnd();
      this.clock.tick(1000);

      expect(this.endSpy).to.not.have.been.called;
    });
    it('root should not see load end from nonBlocking view', function() {
      this.view.nonBlockingLoad = true;
      this.model.loadStart();
      this.clock.tick(1000);

      this.model.loadEnd();
      this.clock.tick(1000);

      expect(this.endSpy).to.not.have.been.called;
    });
    it('root should see load end for queued non background', function() {
      this.model.loadStart(undefined, true);
      this.clock.tick(1000);

      this.model.loadStart(undefined, true);
      this.clock.tick(1000);

      this.model.loadStart();
      this.clock.tick(1000);

      this.model.loadStart();
      this.clock.tick(1000);

      this.model.loadEnd();
      this.model.loadEnd();
      this.model.loadEnd();
      this.clock.tick(1000);
      expect(this.endSpy).to.not.have.been.called;

      this.model.loadEnd();
      this.clock.tick(1000);

      expect(this.endSpy).to.have.been.calledOnce;
    });
  });

  describe('event throttle', function() {
    beforeEach(function() {
      var loads = this.loads = [];
      var ends = this.ends = [];

      var object = this.object = _.extend({}, Backbone.Events);
      Thorax.mixinLoadableEvents(object);
      object.on('load:start', Thorax.loadHandler(
        function(message, background, model) {
          loads.push({msg: message, background: background, model: model});
        },
        function(background, model) {
          ends.push({background: background, model: model});
        }));
    });

    it('pair in less than timeout does nothing', function() {
      this.object.loadStart();
      this.clock.tick(10);
      this.object.loadEnd();
      this.clock.tick(1000);

      expect(this.loads).to.eql([]);
      expect(this.ends).to.eql([]);
    });

    it('triggers start only after timeout', function() {
      this.object.loadStart(undefined, true);
      this.clock.tick(150);

      expect(this.loads.length).to.equal(0);

      this.object.loadStart();
      this.clock.tick(150);

      expect(this.loads.length).to.equal(0);

      this.clock.tick(50);

      expect(this.loads.length).to.equal(1);
    });

    it('pair with timeout registers', function() {
      this.object.loadStart('foo', false);
      this.clock.tick(1000);
      var loaderWrapper = this.object._loadInfo[this.object._loadInfo.length - 1];

      this.object.loadEnd();
      this.clock.tick(1000);

      expect(this.loads).to.eql([{msg: 'foo', background: false, model: loaderWrapper}]);
      expect(this.ends).to.eql([{background: false, model: loaderWrapper}]);
    });

    it('consequtive pairs emit one event', function() {
      this.object.loadStart('foo', false);
      this.clock.tick(1000);
      var loaderWrapper = this.object._loadInfo[this.object._loadInfo.length - 1];

      this.object.loadEnd();
      this.clock.tick(10);

      expect(this.loads).to.eql([{msg: 'foo', background: false, model: loaderWrapper}]);
      expect(this.ends).to.eql([]);

      this.object.loadStart('bar', true);
      this.clock.tick(1000);
      this.object.loadEnd();
      this.clock.tick(1000);

      expect(this.loads).to.eql([{msg: 'foo', background: false, model: loaderWrapper}]);
      expect(this.ends).to.eql([{background: false, model: loaderWrapper}]);
    });

    it('consequtive pairs emit two events after timeout', function() {
      this.object.loadStart('foo', false);
      this.clock.tick(1000);
      var loaderWrapper = this.object._loadInfo[this.object._loadInfo.length - 1];

      this.object.loadEnd();
      this.clock.tick(1000);

      expect(this.loads).to.eql([{msg: 'foo', background: false, model: loaderWrapper}]);
      expect(this.ends).to.eql([{background: false, model: loaderWrapper}]);

      this.object.loadStart('bar', true);
      this.clock.tick(1000);
      var loaderWrapper2 = this.object._loadInfo[this.object._loadInfo.length - 1];

      this.object.loadEnd();
      this.clock.tick(1000);

      expect(this.loads).to.eql([{msg: 'foo', background: false, model: loaderWrapper}, {msg: 'bar', background: true, model: loaderWrapper2}]);
      expect(this.ends).to.eql([{background: false, model: loaderWrapper}, {background: true, model: loaderWrapper2}]);
    });

    it('overlapping pairs emit one event', function() {
      this.object.loadStart('foo', false);
      this.clock.tick(1000);
      var loaderWrapper = this.object._loadInfo[this.object._loadInfo.length - 1];

      this.object.loadStart('bar', true);
      this.clock.tick(1000);

      expect(this.loads).to.eql([{msg: 'foo', background: false, model: loaderWrapper}]);
      expect(this.ends).to.eql([]);

      this.object.loadEnd();
      this.clock.tick(1000);
      this.object.loadEnd();
      this.clock.tick(1000);

      expect(this.loads).to.eql([{msg: 'foo', background: false, model: loaderWrapper}]);
      expect(this.ends).to.eql([{background: false, model: loaderWrapper}]);
    });

    it('loadHandlers are isolated', function() {
      var startSpy = this.spy(),
          endSpy = this.spy();
      this.object.on('load:start', Thorax.loadHandler(startSpy, endSpy));
      this.object.loadStart('foo', false);

      expect(this.loads.length).to.equal(0);
      expect(this.ends.length).to.equal(0);
      expect(startSpy).to.not.have.been.called;
      expect(endSpy).to.not.have.been.called;

      this.clock.tick(200);

      expect(this.loads.length).to.equal(0);
      expect(this.ends.length).to.equal(0);
      expect(startSpy).to.not.have.been.called;
      expect(endSpy).to.not.have.been.called;

      this.clock.tick(1000);

      expect(this.loads.length).to.equal(1);
      expect(this.ends.length).to.equal(0);
      expect(startSpy).to.have.been.calledOnce;
      expect(endSpy).to.not.have.been.called;

      this.object.loadEnd();

      expect(this.loads.length).to.equal(1);
      expect(this.ends.length).to.equal(0);
      expect(startSpy).to.have.been.calledOnce;
      expect(endSpy).to.not.have.been.called;

      this.clock.tick(1000);

      expect(this.loads.length).to.equal(1);
      expect(this.ends.length).to.equal(1);
      expect(startSpy).to.have.been.calledOnce;
      expect(endSpy).to.have.been.calledOnce;

    });
  });


  describe('forwardLoadEvents', function() {
    beforeEach(function() {
      this.startSpy = this.spy();
      this.dest = _.extend({}, Backbone.Events);
      this.dest.on('load:start', this.startSpy);

      this.src = _.extend({}, Backbone.Events);
      Thorax.mixinLoadableEvents(this.src);
    });

    it('load event is forwarded', function() {
      Thorax.forwardLoadEvents(this.src, this.dest);

      this.src.loadStart();
      expect(this.startSpy).to.have.been.calledOnce;

      this.src.loadStart();
      expect(this.startSpy).to.have.been.calledTwice;
    });
    it('load event is forwarded once', function() {
      Thorax.forwardLoadEvents(this.src, this.dest, true);

      this.src.loadStart();
      expect(this.startSpy).to.have.been.calledOnce;

      this.src.loadStart();
      expect(this.startSpy).to.have.been.calledOnce;
    });
    it('off clears on', function() {
      var forward = Thorax.forwardLoadEvents(this.src, this.dest);

      this.src.loadStart();
      expect(this.startSpy).to.have.been.calledOnce;

      forward.off();
      this.src.loadStart();
      expect(this.startSpy).to.have.been.calledOnce;
    });
  });

  describe('data.load', function() {
    beforeEach(function() {
      this.startSpy = this.spy();
      this.endSpy = this.spy();

      this.model = new (Thorax.Model.extend({url: 'foo'}))();
      this.model.on(loadStart, this.startSpy);
      this.model.on(loadEnd, this.endSpy);
    });

    it('data load sends load events', function() {
      var success = this.spy(),
          failback = this.spy();
      this.model.load(success, failback);
      this.requests[0].respond(200, {}, '{}');

      expect(success).to.have.been.calledOnce;
      expect(failback).to.not.have.been.called;
      expect(this.startSpy).to.have.been.calledOnce;
      expect(this.endSpy).to.have.been.calledOnce;
    });
    it('data load on abort sends load events', function() {
      var success = this.spy(),
          failback = this.spy();
      this.model.load(success, failback);
      this.requests[0].abort();

      expect(success).to.not.have.been.called;
      expect(failback).to.have.been.calledOnce;
      expect(failback).to.have.been.calledWith(true);
      expect(this.model.fetchQueue).to.not.exist;
      expect(this.startSpy).to.have.been.calledOnce;
      expect(this.endSpy).to.have.been.calledOnce;
    });
    it('data load on error sends load events', function() {
      var success = this.spy(),
          failback = this.spy();

      this.model.load(success, failback);
      this.requests[0].respond(0, {}, '');

      expect(success).to.not.have.been.called;
      expect(failback).to.have.been.calledOnce;
      expect(failback).to.have.been.calledWith(true);
      expect(this.startSpy).to.have.been.calledOnce;
      expect(this.endSpy).to.have.been.calledOnce;
    });
    it('data load on error calls failback once', function() {
      var success = this.spy(),
          failback = this.spy();

      this.model.load(success, failback);
      this.requests[0].respond(0, {}, '');

      Backbone.history.trigger('route');
      expect(success).to.not.have.been.called;
      expect(failback).to.have.been.calledOnce;
      expect(failback).to.have.been.calledWith(true);
      expect(this.startSpy).to.have.been.calledOnce;
      expect(this.endSpy).to.have.been.calledOnce;
    });
    it('data load on route change sends load events', function() {
      var success = this.spy(),
          failback = this.spy();

      var fragment = 'data-bar';
      this.stub(Backbone.history, 'getFragment', function() { return fragment; });
      this.model.load(success, failback);

      fragment = 'data-foo';
      Backbone.history.trigger('route');
      expect(this.endSpy).to.have.been.calledOnce;

      this.requests[0].respond(200, {}, '{}');

      expect(success).to.not.have.been.called;
      expect(failback).to.have.been.calledOnce;
      expect(failback).to.have.been.calledWith(false);
      expect(this.startSpy).to.have.been.calledOnce;
    });
    it('data load sent for background and foreground requests', function() {
      var success = this.spy(),
          failback = this.spy();

      this.model.load(success, failback, {background: true});
      this.model.load(success, failback, {background: true});
      this.model.load(success, failback);
      this.model.load(success, failback);
      this.requests[0].respond(200, {}, '{}');

      expect(success.callCount).to.equal(4);
      expect(failback).to.not.have.been.called;
      expect(this.startSpy.callCount).to.equal(4);
      expect(this.endSpy.callCount).to.equal(4);
    });

    it('data load sends events to root', function() {
      var success = this.spy(),
          failback = this.spy(),
          rootStart = this.spy();

      exports.on('load:start', rootStart);
      this.model.load(success, failback);
      this.requests[0].respond(200, {}, '{}');

      expect(success).to.have.been.calledOnce;
      expect(failback).to.not.have.been.called;
      expect(rootStart).to.have.been.calledOnce;
      expect(this.startSpy).to.have.been.calledOnce;
      expect(this.endSpy).to.have.been.calledOnce;

      exports.off('load:start', rootStart);
    });
    it('data load sends events to root - concurrent background', function() {
      var success = this.spy(),
          failback = this.spy(),
          rootStart = this.spy(),
          rootEnd = this.spy();

      this.model.load(success, failback, {background: true});

      this.model.on('load:start', Thorax.loadHandler(rootStart, rootEnd));
      this.model.load(success, failback, {background: true});
      this.clock.tick(1000);

      this.model.load(success, failback);
      this.model.load(success, failback);
      this.clock.tick(1000);

      this.requests[0].respond(200, {}, '{}');
      this.clock.tick(1000);

      expect(success.callCount).to.equal(4);
      expect(failback).to.not.have.been.called;
      expect(rootStart).to.have.been.calledTwice;
      expect(rootStart).to.have.been.calledWith(undefined, false);
      expect(rootStart).to.have.been.calledWith(undefined, true);
      expect(rootEnd).to.have.been.calledOnce;
      expect(rootEnd).to.have.been.calledWith(false);
      expect(this.startSpy.callCount).to.equal(4);
      expect(this.endSpy.callCount).to.equal(4);

      //exports.off('load:start');
    });

    it('data load on populated object does not send events', function() {
      var success = this.spy(),
          failback = this.spy(),
          rootStart = this.spy();

      exports.on('load:start', rootStart);

      this.model.isPopulated = function() { return true; };
      this.model.load(success, failback);
      expect(this.requests).to.be.empty;

      expect(success).to.have.been.calledOnce;
      expect(failback).to.not.have.been.called;
      expect(rootStart).to.not.have.been.called;
      expect(this.startSpy).to.not.have.been.called;
      expect(this.endSpy).to.not.have.been.called;

      exports.off('load:start', rootStart);
    });

    it("bindToRoute", function() {
      var callback,
          failback,
          fragment = "foo",
          _getFragment = Backbone.history.getFragment,
          _Router = Thorax.Router.extend({}),
          router = new _Router();

      Backbone.history.getFragment = function() {
        return fragment;
      };

      var _this = this;
      function reset() {
        callback = _this.spy();
        failback = _this.spy();
        return router.bindToRoute(callback, failback);
      }

      var func = reset();
      Backbone.history.trigger('route');
      expect(callback).to.not.have.been.called;
      expect(failback).to.not.have.been.called;

      // test new route before load complete
      fragment = "bar";
      Backbone.history.trigger('route');
      expect(callback).to.not.have.been.called;
      expect(failback).to.have.been.calledOnce;

      // make sure callback doesn't work after route has changed
      func();
      expect(callback).to.not.have.been.called;
      expect(failback).to.have.been.calledOnce;

      // make sure callback works without initial route trigger
      func = reset();
      func();
      expect(callback).to.have.been.calledOnce;
      expect(failback).to.not.have.been.called;

      // make sure callback works with initial route trigger
      func = reset();
      Backbone.history.trigger('route');
      func();
      expect(callback).to.have.been.calledOnce;
      expect(failback).to.not.have.been.called;

      // now make sure no execution happens after route change
      fragment = "bar";
      Backbone.history.trigger('route');
      expect(callback).to.have.been.calledOnce;
      expect(failback).to.not.have.been.called;

      Backbone.history.getFragment = _getFragment;
    });

    it("loading helper and loading collection options", function() {
      var loadingView = new Thorax.View({
        template: Handlebars.compile('{{#loading}}<p>loading</p>{{else}}<p>not loading</p>{{/loading}}')
      });
      loadingView.render();
      expect(loadingView.$('p').html()).to.equal('not loading');
      loadingView.loadStart();
      expect(loadingView.$('p').html()).to.equal('not loading');
      this.clock.tick(loadStartTimeout);
      expect(loadingView.$('p').html()).to.equal('loading');
      loadingView.loadEnd();
      this.clock.tick(loadEndTimeout);
      expect(loadingView.$('p').html()).to.equal('not loading');

      //trigger loadStart before render
      loadingView = new Thorax.View({
        template: Handlebars.compile('{{#loading}}<p>loading</p>{{else}}<p>not loading</p>{{/loading}}')
      });
      loadingView.loadStart();
      this.clock.tick(loadStartTimeout);
      loadingView.render();
      expect(loadingView.$('p').html()).to.equal('loading');
      loadingView.loadEnd();
      this.clock.tick(loadEndTimeout);
      expect(loadingView.$('p').html()).to.equal('not loading');

      var loadingViewWithModel = new Thorax.View({
        template: Handlebars.compile('{{#loading}}<p>loading</p>{{else}}<p>not loading</p>{{/loading}}'),
        model: new Thorax.Model()
      });
      loadingViewWithModel.render();
      expect(loadingViewWithModel.$('p').html()).to.equal('not loading');
      loadingViewWithModel.model.loadStart();
      expect(loadingViewWithModel.$('p').html()).to.equal('not loading');
      this.clock.tick(loadStartTimeout);
      expect(loadingViewWithModel.$('p').html()).to.equal('loading');
      loadingViewWithModel.model.loadEnd();
      this.clock.tick(loadEndTimeout);
      expect(loadingViewWithModel.$('p').html()).to.equal('not loading');
    });

    it("loading-template and loading-view collection helper options", function() {
      //use low level events as flusheQueue / fetchQueue interferes
      Thorax.templates['collection-loading'] = Handlebars.compile('<li class="loading-item">loading</li>');
      Thorax.templates['collection-loading-view'] = Handlebars.compile('loading');
      Thorax.View.extend({
        name: 'collection-loading-view',
        tagName: 'li'
      });
      var collectionLoadingTemplateView = new Thorax.View({
        template: Handlebars.compile('{{#collection myCollection loading-template="collection-loading" tag="ul"}}<li class="item">{{number}}</li>{{else}}<li class="empty-item">empty</li>{{/collection}}'),
        myCollection: new (Thorax.Collection.extend({
          url: false
        }))()
      });
      collectionLoadingTemplateView.render();
      expect(collectionLoadingTemplateView.$('li').length).to.equal(1);
      expect(collectionLoadingTemplateView.$('li.empty-item').length).to.equal(1);

      collectionLoadingTemplateView.myCollection.loadStart();
      this.clock.tick(loadStartTimeout);
      expect(collectionLoadingTemplateView.$('li').length).to.equal(1);
      expect(collectionLoadingTemplateView.$('li.empty-item').length).to.equal(0);
      expect(collectionLoadingTemplateView.$('li.loading-item').length).to.equal(1);
      collectionLoadingTemplateView.myCollection.add([{"number": "one"}, {"number": "two"}]);
      collectionLoadingTemplateView.myCollection.loadEnd();
      this.clock.tick(loadEndTimeout);
      expect(collectionLoadingTemplateView.$('li').length).to.equal(2);
      expect(collectionLoadingTemplateView.$('li.empty-item').length).to.equal(0);
      expect(collectionLoadingTemplateView.$('li.loading-item').length).to.equal(0);

      collectionLoadingTemplateView.myCollection.loadStart();
      this.clock.tick(loadStartTimeout);
      expect(collectionLoadingTemplateView.$('li').length).to.equal(3);
      expect(collectionLoadingTemplateView.$('li.empty-item').length).to.equal(0);
      expect(collectionLoadingTemplateView.$('li.loading-item').length).to.equal(1);
      expect($(collectionLoadingTemplateView.$('li')[2]).hasClass('loading-item')).to.be['true'];
      collectionLoadingTemplateView.myCollection.add([{"number": "three"}, {"number": "four"}]);
      collectionLoadingTemplateView.myCollection.loadEnd();
      this.clock.tick(loadEndTimeout);
      expect(collectionLoadingTemplateView.$('li').length).to.equal(4);
      expect(collectionLoadingTemplateView.$('li.empty-item').length).to.equal(0);
      expect(collectionLoadingTemplateView.$('li.loading-item').length).to.equal(0);
    });

    it("nonBlockingLoad and ignoreErrors propagate to collection helper view", function() {
      var view = new Thorax.View({
        ignoreFetchError: true,
        nonBlockingLoad: true,
        myCollection: new Thorax.Collection([{key: 'value'}]),
        template: Handlebars.compile('{{#collection myCollection}}{{/collection}}')
      });
      view.render();
      view.myCollection.url = function() { return 'foo'; };
      view.myCollection.fetch();
      this.clock.tick(1000);

      var collectionView = _.values(view.children)[0],
          collectionCid = collectionView.collection.cid,
          options = collectionView._objectOptionsByCid[collectionCid];
      expect(options.ignoreErrors).to.equal(true);
      expect(options.background).to.equal(true);
      expect(view.$el.hasClass('loading')).to.be.true;
    });

    it("load callback should be called with collection and not array", function() {
      var server = sinon.fakeServer.create();
      var collection = new (Thorax.Collection.extend({
        url: '/test'
      }));
      var spy = this.spy(function() {
        expect(arguments[0]).to.equal(collection);
      });
      collection.load(spy);
      server.requests[0].respond(
        200,
        { "Content-Type": "application/json" },
        JSON.stringify([{ id: 1, text: "test"}])
      );
      expect(spy.callCount).to.equal(1);
      server.restore();
    });
  });
});
