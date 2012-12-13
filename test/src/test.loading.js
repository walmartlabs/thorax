$(function(){

  var loadStart = 'load:start',
      loadEnd = 'load:end',
      loadStartTimeout = (Thorax.View.prototype._loadingTimeoutDuration * 1000) + 1,
      loadEndTimeout = (Thorax.View.prototype._loadingTimeoutEndDuration * 1000) + 1,
      Application = _.extend({}, Backbone.Events),
      exports = Application;
  window.exports = exports;

  Thorax.setRootObject(Application);

  QUnit.module('thorax.loading - load events');

  test('views should see load start from model', function() {
    var spy = this.spy(),
        model = new Thorax.Model({url: 'foo'}),
        view = new Thorax.View({name: 'food', render: function(){}, model: model});
    view.on('load:start', spy);

    ok(!$(view.el).hasClass('loading'));
    model.loadStart();

    this.clock.tick(1000);
    equal(spy.callCount, 1);
    ok($(view.el).hasClass('loading'));
  });
  test('views should see load start from collection', function() {
    var spy = this.spy(),
        collection = new Thorax.Collection({url: 'foo'}),
        view = new Thorax.View({
          name: 'food',
          collection: collection,
          template: ''
        });
    view.bindCollection(view.collection);
    view.on('load:start', spy);
    view.render();
    ok(!$(view.el).hasClass('loading'));
    collection.loadStart();

    this.clock.tick(1000);
    equal(spy.callCount, 1);
    ok($(view.el).hasClass('loading'));
  });
  test('views should not see load start after destroy', function() {
    var spy = this.spy(),
        model = new Thorax.Model({url: 'foo'}),
        view = new Thorax.View({name: 'food', render: function(){}, model: model});
    view.on('load:start', spy);

    ok(!$(view.el).hasClass('loading'));
    view.destroy();

    model.loadStart();

    this.clock.tick(1000);
    equal(spy.callCount, 0);
    ok(!$(view.el).hasClass('loading'));
  });

  test('views should see load end from model', function() {
    var model = new Thorax.Model({url: 'foo'}),
        view = new Thorax.View({name: 'food', render: function(){}, model: model}),
        spy = this.spy(view, 'onLoadEnd');

    model.loadStart();
    this.clock.tick(1000);

    model.loadEnd();
    this.clock.tick(1000);

    equal(spy.callCount, 1);
    ok(!$(view.el).hasClass('loading'));
  });
  test('views should see load end from collection', function() {
    var collection = new Thorax.Collection({url: 'foo'}),
        view = new Thorax.View({
          name: 'food',
          collection: collection,
          template: ''
        }),
        spy = this.spy(view, 'onLoadEnd');
    view.bindCollection(view.collection);
    collection.loadStart();
    this.clock.tick(1000);

    collection.loadEnd();
    this.clock.tick(1000);

    equal(spy.callCount, 1);
    ok(!$(view.el).hasClass('loading'));
  });
  test('views should see load end after destroy', function() {
    var spy = this.spy(),
        model = new Thorax.Model({url: 'foo'}),
        view = new Thorax.View({name: 'food', render: function(){}, model: model}),
        endSpy = this.spy(view, 'onLoadEnd');
    view.on('load:start', spy);

    ok(!$(view.el).hasClass('loading'));
    model.loadStart();
    this.clock.tick(1000);

    ok($(view.el).hasClass('loading'));
    view.destroy();

    model.loadEnd();
    this.clock.tick(1000);

    this.clock.tick(1000);
    equal(spy.callCount, 1);
    equal(endSpy.callCount, 1);
    ok(!$(view.el).hasClass('loading'));
  });


  QUnit.module('thorax.loading - root load events', {
    setup: function() {
      this.startSpy = this.spy();
      this.endSpy = this.spy();

      exports.on('load:start', Thorax.loadHandler(this.startSpy, this.endSpy));

      this.model = new Thorax.Model({url: 'foo'});
      this.view = new Thorax.View({name: 'food', model: this.model, render: function(){}});
    },
    teardown: function() {
      exports._loadStart = undefined;
      exports.off('load:start');
      exports.off('load:end');
    }
  });

  test('root should see load start from view', function() {
    this.model.loadStart();
    this.clock.tick(1000);
    equal(this.startSpy.callCount, 1);
  });
  test('root should not see background load start', function() {
    this.model.loadStart(undefined, true);
    this.clock.tick(1000);
    equal(this.startSpy.callCount, 0);
  });
  test('root should not see load start from nonBlocking view', function() {
    this.view.nonBlockingLoad = true;
    this.model.loadStart();
    this.clock.tick(1000);
    equal(this.startSpy.callCount, 0);
  });
  test('root should see load start for queued non background', function() {
    this.model.loadStart(undefined, true);
    this.clock.tick(1000);
    equal(this.startSpy.callCount, 0);

    this.model.loadStart();
    this.clock.tick(1000);
    equal(this.startSpy.callCount, 1);
  });

  test('root should see load end from view', function() {
    this.model.loadStart();
    this.clock.tick(1000);

    this.model.loadEnd();
    this.clock.tick(1000);

    equal(this.endSpy.callCount, 1);
  });
  test('root should see load end after destroy', function() {
    this.model.loadStart();
    this.clock.tick(1000);

    this.view.destroy();

    this.model.loadEnd();
    this.clock.tick(1000);

    equal(this.endSpy.callCount, 1);
  });
  test('root should not see background load end', function() {
    this.model.loadStart(undefined, true);
    this.clock.tick(1000);

    this.model.loadEnd();
    this.clock.tick(1000);

    equal(this.endSpy.callCount, 0);
  });
  test('root should not see load end from nonBlocking view', function() {
    this.view.nonBlockingLoad = true;
    this.model.loadStart();
    this.clock.tick(1000);

    this.model.loadEnd();
    this.clock.tick(1000);

    equal(this.endSpy.callCount, 0);
  });
  test('root should see load end for queued non background', function() {
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
    this.clock.tick(1000);

    equal(this.endSpy.callCount, 1);
  });

  QUnit.module('thorax.loading - event throttle', {
    setup: function() {
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
    }
  });

  test('pair in less than timeout does nothing', function() {
    this.object.loadStart();
    this.object.loadEnd();
    this.clock.tick(1000);

    deepEqual(this.loads, []);
    deepEqual(this.ends, []);
  });

  test('pair with timeout registers', function() {
    this.object.loadStart('foo', false);
    this.clock.tick(1000);
    var loaderWrapper = this.object._loadStart;

    this.object.loadEnd();
    this.clock.tick(1000);

    deepEqual(this.loads, [{msg: 'foo', background: false, model: loaderWrapper}]);
    deepEqual(this.ends, [{background: false, model: loaderWrapper}]);
  });

  test('consequtive pairs emit one event', function() {
    this.object.loadStart('foo', false);
    this.clock.tick(1000);
    var loaderWrapper = this.object._loadStart;

    this.object.loadEnd();
    this.clock.tick(10);

    deepEqual(this.loads, [{msg: 'foo', background: false, model: loaderWrapper}]);
    deepEqual(this.ends, []);

    this.object.loadStart('bar', true);
    this.clock.tick(1000);
    this.object.loadEnd();
    this.clock.tick(1000);

    deepEqual(this.loads, [{msg: 'foo', background: false, model: loaderWrapper}]);
    deepEqual(this.ends, [{background: false, model: loaderWrapper}]);
  });

  test('consequtive pairs emit two events after timeout', function() {
    this.object.loadStart('foo', false);
    this.clock.tick(1000);
    var loaderWrapper = this.object._loadStart;

    this.object.loadEnd();
    this.clock.tick(1000);

    deepEqual(this.loads, [{msg: 'foo', background: false, model: loaderWrapper}]);
    deepEqual(this.ends, [{background: false, model: loaderWrapper}]);

    this.object.loadStart('bar', true);
    this.clock.tick(1000);
    var loaderWrapper2 = this.object._loadStart;

    this.object.loadEnd();
    this.clock.tick(1000);

    deepEqual(this.loads, [{msg: 'foo', background: false, model: loaderWrapper},{msg: 'bar', background: true, model: loaderWrapper2}]);
    deepEqual(this.ends, [{background: false, model: loaderWrapper},{background: true, model: loaderWrapper2}]);
  });

  test('overlapping pairs emit one event', function() {
    this.object.loadStart('foo', false);
    this.clock.tick(1000);
    var loaderWrapper = this.object._loadStart;

    this.object.loadStart('bar', true);
    this.clock.tick(1000);

    deepEqual(this.loads, [{msg: 'foo', background: false, model: loaderWrapper}]);
    deepEqual(this.ends, []);

    this.object.loadEnd();
    this.clock.tick(1000);
    this.object.loadEnd();
    this.clock.tick(1000);

    deepEqual(this.loads, [{msg: 'foo', background: false, model: loaderWrapper}]);
    deepEqual(this.ends, [{background: false, model: loaderWrapper}]);
  });


  QUnit.module('thorax.loading - forwardLoadEvents', {
    setup: function() {
      this.startSpy = this.spy();
      this.dest = _.extend({}, Backbone.Events);
      this.dest.on('load:start', this.startSpy);

      this.src = _.extend({}, Backbone.Events);
      Thorax.mixinLoadableEvents(this.src);
    }
  });

  test('load event is forwarded', function() {
    Thorax.forwardLoadEvents(this.src, this.dest);

    this.src.loadStart();
    equal(this.startSpy.callCount, 1);

    this.src.loadStart();
    equal(this.startSpy.callCount, 2);
  });
  test('load event is forwarded once', function() {
    Thorax.forwardLoadEvents(this.src, this.dest, true);

    this.src.loadStart();
    equal(this.startSpy.callCount, 1);

    this.src.loadStart();
    equal(this.startSpy.callCount, 1);
  });
  test('off clears on', function() {
    var forward = Thorax.forwardLoadEvents(this.src, this.dest);

    this.src.loadStart();
    equal(this.startSpy.callCount, 1);

    forward.off();
    this.src.loadStart();
    equal(this.startSpy.callCount, 1);
  });

  QUnit.module('thorax.loading - data.load', {
    setup: function() {
      this.startSpy = this.spy();
      this.endSpy = this.spy();

      this.model = new (Thorax.Model.extend({url: 'foo'}))();
      this.model.on(loadStart, this.startSpy);
      this.model.on(loadEnd, this.endSpy);
    }
  });

  test('data load sends load events', function() {
    var success = this.spy(),
        failback = this.spy();
    this.model.load(success, failback);
    this.requests[0].respond(200, {}, '{}');

    equal(success.callCount, 1);
    equal(failback.callCount, 0);
    equal(this.startSpy.callCount, 1);
    equal(this.endSpy.callCount, 1);
  });
  test('data load on abort sends load events', function() {
    var success = this.spy(),
        failback = this.spy();
    this.model.load(success, failback);
    this.requests[0].abort();

    equal(success.callCount, 0);
    equal(failback.callCount, 1);
    ok(failback.alwaysCalledWith(true));
    equal(this.model.fetchQueue, undefined);
    equal(this.startSpy.callCount, 1);
    equal(this.endSpy.callCount, 1);
  });
  test('data load on error sends load events', function() {
    var success = this.spy(),
        failback = this.spy();

    this.model.load(success, failback);
    this.requests[0].respond(0, {}, '');

    equal(success.callCount, 0);
    equal(failback.callCount, 1);
    ok(failback.alwaysCalledWith(true));
    equal(this.startSpy.callCount, 1);
    equal(this.endSpy.callCount, 1);
  });
  test('data load on route change sends load events', function() {
    var success = this.spy(),
        failback = this.spy();

    var fragment = 'data-bar';
    this.stub(Backbone.history, 'getFragment', function() { return fragment; });
    this.model.load(success, failback);

    fragment = 'data-foo';
    Backbone.history.trigger('route');

    equal(success.callCount, 0);
    equal(failback.callCount, 2);
    equal(this.startSpy.callCount, 1);
    equal(this.endSpy.callCount, 1);
  });
  test('data load sent for background and foreground requests', function() {
    var success = this.spy(),
        failback = this.spy();

    this.model.load(success, failback, {background: true});
    this.model.load(success, failback, {background: true});
    this.model.load(success, failback);
    this.model.load(success, failback);
    this.requests[0].respond(200, {}, '{}');

    equal(success.callCount, 4);
    equal(failback.callCount, 0);
    equal(this.startSpy.callCount, 4);
    equal(this.endSpy.callCount, 4);
  });

  test('data load sends events to root', function() {
    var success = this.spy(),
        failback = this.spy(),
        rootStart = this.spy();

    exports.on('load:start', rootStart);
    this.model.load(success, failback);
    this.requests[0].respond(200, {}, '{}');

    equal(success.callCount, 1);
    equal(failback.callCount, 0);
    equal(rootStart.callCount, 1);
    equal(this.startSpy.callCount, 1);
    equal(this.endSpy.callCount, 1);

    exports.off('load:start', rootStart);
  });
  test('data load sends events to root - concurrent background', function() {
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

    equal(success.callCount, 4);
    equal(failback.callCount, 0);
    equal(rootStart.callCount, 2);
    ok(rootStart.calledWith(undefined, false));
    ok(rootStart.calledWith(undefined, true));
    equal(rootEnd.callCount, 1);
    ok(rootEnd.calledWith(false));
    equal(this.startSpy.callCount, 4);
    equal(this.endSpy.callCount, 4);

    //exports.off('load:start');
  });

  test('data load on populated object does not send events', function() {
    var success = this.spy(),
        failback = this.spy(),
        rootStart = this.spy();

    exports.on('load:start', rootStart);

    this.model.isPopulated = function() { return true; };
    this.model.load(success, failback);
    equal(this.requests.length, 0);

    equal(success.callCount, 1);
    equal(failback.callCount, 0);
    equal(rootStart.callCount, 0);
    equal(this.startSpy.callCount, 0);
    equal(this.endSpy.callCount, 0);

    exports.off('load:start', rootStart);
  });

  test("bindToRoute", function() {
    var callback,
        failback,
        fragment = "foo",
        _getFragment = Backbone.history.getFragment,
        _Router = Thorax.Router.extend({}),
        router = new _Router();

    Backbone.history.getFragment = function() {
      return fragment;
    }

    var _this = this;
    function reset() {
      callback = _this.spy();
      failback = _this.spy();
      return router.bindToRoute(callback, failback);
    }

    var func = reset();
    Backbone.history.trigger('route');
    equal(callback.callCount, 0);
    equal(failback.callCount, 0);

    // test new route before load complete
    fragment = "bar";
    Backbone.history.trigger('route');
    equal(callback.callCount, 0);
    equal(failback.callCount, 1);

    // make sure callback doesn't work after route has changed
    func();
    equal(callback.callCount, 0);
    equal(failback.callCount, 1);

    // make sure callback works without initial route trigger
    func = reset();
    func();
    equal(callback.callCount, 1);
    equal(failback.callCount, 0);

    // make sure callback works with initial route trigger
    func = reset();
    Backbone.history.trigger('route');
    func();
    equal(callback.callCount, 1);
    equal(failback.callCount, 0);

    // now make sure no execution happens after route change
    fragment = "bar";
    Backbone.history.trigger('route');
    equal(callback.callCount, 1);
    equal(failback.callCount, 0);

    Backbone.history.getFragment = _getFragment;
  });

  test("loading helper and loading collection options", function() {
    var loadingView = new Thorax.View({
      template: '{{#loading}}<p>loading</p>{{else}}<p>not loading</p>{{/loading}}'
    });
    loadingView.render();
    equal(loadingView.$('p').html(), 'not loading');
    loadingView.loadStart();
    equal(loadingView.$('p').html(), 'not loading');
    this.clock.tick(loadStartTimeout);
    equal(loadingView.$('p').html(), 'loading');
    loadingView.loadEnd();
    this.clock.tick(loadEndTimeout);
    equal(loadingView.$('p').html(), 'not loading');

    //trigger loadStart before render
    loadingView = new Thorax.View({
      template: '{{#loading}}<p>loading</p>{{else}}<p>not loading</p>{{/loading}}'
    });
    loadingView.loadStart();
    this.clock.tick(loadStartTimeout);
    loadingView.render();
    equal(loadingView.$('p').html(), 'loading');
    loadingView.loadEnd();
    this.clock.tick(loadEndTimeout);
    equal(loadingView.$('p').html(), 'not loading');

    var loadingViewWithModel = new Thorax.View({
      template: '{{#loading}}<p>loading</p>{{else}}<p>not loading</p>{{/loading}}',
      model: new Thorax.Model()
    });
    loadingViewWithModel.render();
    equal(loadingViewWithModel.$('p').html(), 'not loading');
    loadingViewWithModel.model.loadStart();
    equal(loadingViewWithModel.$('p').html(), 'not loading');
    this.clock.tick(loadStartTimeout);
    equal(loadingViewWithModel.$('p').html(), 'loading');
    loadingViewWithModel.model.loadEnd();
    this.clock.tick(loadEndTimeout);
    equal(loadingViewWithModel.$('p').html(), 'not loading');
  });

  test("loading-template and loading-view collection helper options", function() {
    //use low level events as flusheQueue / fetchQueue interferes
    Thorax.templates['collection-loading'] = '<li class="loading-item">loading</li>';
    Thorax.templates['collection-loading-view'] = 'loading';
    Thorax.View.extend({
      name: 'collection-loading-view',
      tagName: 'li'
    });
    var collectionLoadingTemplateView = new Thorax.View({
      template: '{{#collection loading-template="collection-loading" tag="ul"}}<li class="item">{{number}}</li>{{else}}<li class="empty-item">empty</li>{{/collection}}',
      collection: new (Thorax.Collection.extend({
        url: false
      }))
    });
    collectionLoadingTemplateView.render();
    equal(collectionLoadingTemplateView.$('li').length, 1);
    equal(collectionLoadingTemplateView.$('li.empty-item').length, 1);

    collectionLoadingTemplateView.collection.loadStart();
    this.clock.tick(loadStartTimeout);
    equal(collectionLoadingTemplateView.$('li').length, 1);
    equal(collectionLoadingTemplateView.$('li.empty-item').length, 0);
    equal(collectionLoadingTemplateView.$('li.loading-item').length, 1);
    collectionLoadingTemplateView.collection.add([{"number":"one"},{"number":"two"}]);
    collectionLoadingTemplateView.collection.loadEnd();
    this.clock.tick(loadEndTimeout);
    equal(collectionLoadingTemplateView.$('li').length, 2);
    equal(collectionLoadingTemplateView.$('li.empty-item').length, 0);
    equal(collectionLoadingTemplateView.$('li.loading-item').length, 0);

    collectionLoadingTemplateView.collection.loadStart();
    this.clock.tick(loadStartTimeout);
    equal(collectionLoadingTemplateView.$('li').length, 3);
    equal(collectionLoadingTemplateView.$('li.empty-item').length, 0);
    equal(collectionLoadingTemplateView.$('li.loading-item').length, 1);
    ok($(collectionLoadingTemplateView.$('li')[2]).hasClass('loading-item'));
    collectionLoadingTemplateView.collection.add([{"number":"three"},{"number":"four"}]);
    collectionLoadingTemplateView.collection.loadEnd();
    this.clock.tick(loadEndTimeout);
    equal(collectionLoadingTemplateView.$('li').length, 4);
    equal(collectionLoadingTemplateView.$('li.empty-item').length, 0);
    equal(collectionLoadingTemplateView.$('li.loading-item').length, 0);
  });
});
