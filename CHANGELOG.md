# Change Log

## Development

[Commits](https://github.com/walmartlabs/thorax/compare/v3.0.0-beta.5...master)

## v3.0.0-beta.5 - October 16th, 2014
- Fix template field iteration logic - 4ae5cf1

[Commits](https://github.com/walmartlabs/thorax/compare/v3.0.0-beta.4...v3.0.0-beta.5)

## v3.0.0-beta.4 - October 16th, 2014
- [#389](https://github.com/walmartlabs/thorax/pull/389) - Performance optimations ([@kpdecker](https://api.github.com/users/kpdecker))
- [#390](https://github.com/walmartlabs/thorax/pull/390) - Deferrable render ([@kpdecker](https://api.github.com/users/kpdecker))
- [#388](https://github.com/walmartlabs/thorax/pull/388) - Utilize lodash for server builds ([@kpdecker](https://api.github.com/users/kpdecker))
- Avoid complex boolean chaining - 56a8b25
- Implement basic benchmarks - 2f2fcde

Compatibility notes:
- `setView` callers can not assume that the operation has completed after the call returns unless they pass the `async: false` flag.
- `rendered:collection` now occurs prior to the `rendered` event
- `append` and `before:rendered` events can not assume that other handlers have executed prior to their own execution unless they utilize the `deferred.exec` API which does guarantee this case (although the existing concerns of did you register before the other guy hold and this is generally ill advised to make these assumptions in loosely linked event code).
- Users building with lumbar who desire the forms feature must include the thorax-form mixin
- The `helper:$name` event has been removed. Users should bind to the `helper` event and check the name parameter that they wish to examine.
- `_.uniqueId` no longer uses global variables for tracking state. Instead callers must call `_resetIdCounter` when wishing to modify that behavior.
- `context` no longer clones the model attributes so callers need to take care to not modify the returned value.

[Commits](https://github.com/walmartlabs/thorax/compare/v3.0.0-beta.3...v3.0.0-beta.4)

## v3.0.0-beta.3 - September 10th, 2014
- [#382](https://github.com/walmartlabs/thorax/pull/382) - Update DOM events ([@loun4](https://api.github.com/users/loun4))
- [#383](https://github.com/walmartlabs/thorax/pull/383) - Allow forced render mode for restore operations ([@kpdecker](https://api.github.com/users/kpdecker))
- Safely handle missing view helpers on restore - 2009cd2
- Update to use FruitLoops API object - 5253fd1

[Commits](https://github.com/walmartlabs/thorax/compare/v3.0.0-beta.2...v3.0.0-beta.3)

## v3.0.0-beta.2 - July 8th, 2014
- [#377](https://github.com/walmartlabs/thorax/pull/377) - Collection Restore Fixes ([@kpdecker](https://api.github.com/users/kpdecker))

[Commits](https://github.com/walmartlabs/thorax/compare/v3.0.0-beta.1...v3.0.0-beta.2)

## v3.0.0-beta.1 - July 7th, 2014
- Fixup restore handling with custom renderEmpty - 630a098

[Commits](https://github.com/walmartlabs/thorax/compare/v3.0.0-alpha.10...v3.0.0-beta.1)

## v3.0.0-alpha.10 - July 7th, 2014
- [#375](https://github.com/walmartlabs/thorax/pull/375) - collection.fetch success callback ([@DatenMetzgerX](https://api.github.com/users/DatenMetzgerX))
- [#373](https://github.com/walmartlabs/thorax/pull/373) - Handle fetchQueue error for preempted requests ([@kpdecker](https://api.github.com/users/kpdecker))
- Ensure proper restore for nested collections - 6799e57

Compatibility notes:
- `fetchQueue` promises are now proxies to the upstream XHR connection. The consequence of this is the fetch queue instance may be cancelled or otherwise errored while the upstream request continues independently.

[Commits](https://github.com/walmartlabs/thorax/compare/v3.0.0-alpha.9...v3.0.0-alpha.10)

## v3.0.0-alpha.9 - June 2nd, 2014
- [#372](https://github.com/walmartlabs/thorax/pull/372) - Isolate fetchQueue instances ([@kpdecker](https://api.github.com/users/kpdecker))
- Use callbacks as exec flags in bindToRoute - 18f16de

Compatibility notes:
- Multiple calls to fetch and load are now treated as distinct request objects externally. This means that they may be independendently canceled by things such as bind to route, etc without impacting other external requests. Implementations may need to examine the cases where fetch vs. load is used concurrently on a given data object instance to see if their behavior still matches the desired behavior.

[Commits](https://github.com/walmartlabs/thorax/compare/v3.0.0-alpha.8...v3.0.0-alpha.9)

## v3.0.0-alpha.8 - May 26th, 2014
- Fix bindToRoute when running with lumbar loader - c1e534d

[Commits](https://github.com/walmartlabs/thorax/compare/v3.0.0-alpha.7...v3.0.0-alpha.8)

## v3.0.0-alpha.7 - May 19th, 2014
- Update for latest handlebars _child changes - 495e078

[Commits](https://github.com/walmartlabs/thorax/compare/v3.0.0-alpha.6...v3.0.0-alpha.7)

## v3.0.0-alpha.6 - May 17th, 2014
- [#311](https://github.com/walmartlabs/thorax/issues/311) - Loading module breaks module load if history not started ([@kpdecker](https://api.github.com/users/kpdecker))
- [#370](https://github.com/walmartlabs/thorax/pull/370) - Always cleanup bindToRoute ([@kpdecker](https://api.github.com/users/kpdecker))
- Fix server-side.js include for client overrides - 66a972b

[Commits](https://github.com/walmartlabs/thorax/compare/v3.0.0-alpha.5...v3.0.0-alpha.6)

## v3.0.0-alpha.5 - May 5th, 2014
- [#358](https://github.com/walmartlabs/thorax/pull/358) - Add as a child before calling ensureRender in CollectionView#appendItem ([@jasonwebster](https://api.github.com/users/jasonwebster))
- [#364](https://github.com/walmartlabs/thorax/pull/364) - Add view.register method ([@kpdecker](https://api.github.com/users/kpdecker))

Compatibility notes:
- Views that are inserted manually must call `retain` or `_addChild` if they are going to be referenced by `$.view`

[Commits](https://github.com/walmartlabs/thorax/compare/v3.0.0-alpha.4...v3.0.0-alpha.5)

## v3.0.0-alpha.4 - April 8th, 2014
- [#357](https://github.com/walmartlabs/thorax/pull/357) - use `prop` rather than `attr` to look up values, as it updates after user ([@patrickkettner](https://api.github.com/users/patrickkettner))
- Update tests for the latest fruit-loops lib - 18333f1

[Commits](https://github.com/walmartlabs/thorax/compare/v3.0.0-alpha.3...v3.0.0-alpha.4)

## v3.0.0-alpha.3 - April 7th, 2014
- [#354](https://github.com/walmartlabs/thorax/pull/354) - don't allow checked='false' on inputs ([@dguzzo](https://api.github.com/users/dguzzo))

[Commits](https://github.com/walmartlabs/thorax/compare/v3.0.0-alpha.2...v3.0.0-alpha.3)

## v3.0.0-alpha.2 - April 3rd, 2014
- Prevent partial render due to layout children - 395cac9
- Cleanup parent registry on view cid change - b468974
- Only restore flagged el attribute lookups - e4440f0

[Commits](https://github.com/walmartlabs/thorax/compare/v3.0.0-alpha.1...v3.0.0-alpha.2)

## v3.0.0-alpha.1 - April 1st, 2014
- [#345](https://github.com/walmartlabs/thorax/pull/345) - Document server side functionality ([@kpdecker](https://api.github.com/users/kpdecker))
- [#325](https://github.com/walmartlabs/thorax/pull/325) - Implement server -> client marshaling ([@kpdecker](https://api.github.com/users/kpdecker))
- [#336](https://github.com/walmartlabs/thorax/pull/336) - Allow basic server side execution ([@kpdecker](https://api.github.com/users/kpdecker))
- [#337](https://github.com/walmartlabs/thorax/pull/337) - Emit non-server views on setView ([@kpdecker](https://api.github.com/users/kpdecker))
- [#338](https://github.com/walmartlabs/thorax/pull/338) - Client restore ([@kpdecker](https://api.github.com/users/kpdecker))
- [#344](https://github.com/walmartlabs/thorax/pull/344) - Validate contextPath state on store ([@kpdecker](https://api.github.com/users/kpdecker))
- [#346](https://github.com/walmartlabs/thorax/pull/346) - Add logging event for restore hueristics ([@kpdecker](https://api.github.com/users/kpdecker))
- [#348](https://github.com/walmartlabs/thorax/pull/348) - Add restore collection events ([@kpdecker](https://api.github.com/users/kpdecker))
- [#350](https://github.com/walmartlabs/thorax/pull/350) - Defer restore rerendering in collection if loading ([@kpdecker](https://api.github.com/users/kpdecker))

- [#88](https://github.com/walmartlabs/thorax/issues/88) - Make unit tests run on IE8 ([@eastridge](https://api.github.com/users/eastridge))
- [#293](https://github.com/walmartlabs/thorax/issues/293) - Implement sauce labs CI support ([@kpdecker](https://api.github.com/users/kpdecker))
- [#331](https://github.com/walmartlabs/thorax/pull/331) - Use empty() and html() rather than innerHTML ([@kpdecker](https://api.github.com/users/kpdecker))
- [#332](https://github.com/walmartlabs/thorax/issues/332) - LayoutView will unbind all DOM events when deactivating a retained view ([@jasonwebster](https://api.github.com/users/jasonwebster))
- [#335](https://github.com/walmartlabs/thorax/pull/335) - Do not activate push state links if meta or shift are clicked. ([@nhunzaker](https://api.github.com/users/nhunzaker))
- Fix loadHandler cleanup under oldIE - bd30512
- Handle functions passed to getTemplate - 62c38a8
- Handle oldIE default checkbox value - 04293ca

Compatibility notes:
- Service side rendering support has been implemented. This is generally isolated but does expose the `$serverSide` global field and a few additional data parameters, documented in the readme.
- `append` event callbacks now recieve $ instances rather than direct DOM references
- cid values on views may change now due to restore operations
- thorax-ie mixin is removed

[Commits](https://github.com/walmartlabs/thorax/compare/v2.3.5...v3.0.0-alpha.1)

## v2.3.5 - March 4th, 2014
- [#326](https://github.com/walmartlabs/thorax/pull/326) - Fix IE version of CollectionView._replaceHTML ([@Candid](https://api.github.com/users/Candid))
- [#324](https://github.com/walmartlabs/thorax/pull/324) - Add view({el}) lookup option ([@kpdecker](https://api.github.com/users/kpdecker))
- [#323](https://github.com/walmartlabs/thorax/pull/323) - Remove `data-submit-wait` attr from view el when resetting submit state ([@jasonwebster](https://api.github.com/users/jasonwebster))

[Commits](https://github.com/walmartlabs/thorax/compare/v2.3.4...v2.3.5)

## v2.3.4 - February 27th, 2014
- [#319](https://github.com/walmartlabs/thorax/pull/319) - Performance tweaks ([@kpdecker](https://api.github.com/users/kpdecker))

Compatibility notes:
- Layout and collection elements are now cached locally. Nonstandard rendering behaviors may break due to this.

[Commits](https://github.com/walmartlabs/thorax/compare/v2.3.3...v2.3.4)

## v2.3.3 - February 13th, 2014
- [#318](https://github.com/walmartlabs/thorax/pull/318) - remove extra word under setModel section ([@joeyyang](https://api.github.com/users/joeyyang))
- [#313](https://github.com/walmartlabs/thorax/pull/313) - Correct spelling mistake ([@Maciek416](https://api.github.com/users/Maciek416))
- [#312](https://github.com/walmartlabs/thorax/pull/312) - Always return 'this' from Thorax.View.render(). ([@ryan-roemer](https://api.github.com/users/ryan-roemer))
- [#308](https://github.com/walmartlabs/thorax/pull/308) - Add support for data-no-tap-highlight attribute ([@Candid](https://api.github.com/users/Candid))
- Update build stack to latest - cffbddc
- Ignore new handlebars data fields for comparison - 34fa9d7
- Slight refactor of helper view init - 9f23d56

Compatibility notes:
- This version is required in order to work with the Handlebars 2.x series. In particular 34fa9d7 is needed to prevent infinite rerender loops under certain cases.

[Commits](https://github.com/walmartlabs/thorax/compare/v2.3.2...v2.3.3)

## v2.3.2 - January 14th, 2014
- [#297](https://github.com/walmartlabs/thorax/pull/297) - Fix for issue #296 ([@solidgoldpig](https://api.github.com/users/solidgoldpig))

[Commits](https://github.com/walmartlabs/thorax/compare/v2.3.1...v2.3.2)

## v2.3.1 - January 13th, 2014
- [#304](https://github.com/walmartlabs/thorax/issues/304) - fetchQueue._promise can be referenced when fetchQueue has become undefined ([@jhudson8](https://api.github.com/users/jhudson8))

[Commits](https://github.com/walmartlabs/thorax/compare/v2.3.0...v2.3.1)

## v2.3.0 - January 12th, 2014
- [#298](https://github.com/walmartlabs/thorax/issues/298) - IE11 fails 2 view helper tests ([@solidgoldpig](https://api.github.com/users/solidgoldpig))
- [#299](https://github.com/walmartlabs/thorax/issues/299) - IE11 - on test fails for Zepto version ([@solidgoldpig](https://api.github.com/users/solidgoldpig))
- [#303](https://github.com/walmartlabs/thorax/pull/303) - Hack around JIT error in collection view ([@kpdecker](https://api.github.com/users/kpdecker))
- [#295](https://github.com/walmartlabs/thorax/pull/295) - Error Handler Section APIs ([@kpdecker](https://api.github.com/users/kpdecker))
- [#288](https://github.com/walmartlabs/thorax/pull/288) - encode output of url helper when using expand-tokens=true ([@trombom](https://api.github.com/users/trombom))
- Handle void tags properly in Thorax.Util.tag - 344e5d5
- Add support for promises - cab2eb0

[Commits](https://github.com/walmartlabs/thorax/compare/v2.2.1...v2.3.0)

## v2.2.1 - December 30th, 2013
- [#292](https://github.com/walmartlabs/thorax/pull/292) - Add a Bitdeli Badge to README ([@bitdeli-chef](https://api.github.com/users/bitdeli-chef))
- [#291](https://github.com/walmartlabs/thorax/pull/291) - Add support for input event ([@Candid](https://api.github.com/users/Candid))
- [#227](https://github.com/walmartlabs/thorax/issues/227) - support backbone's idAttribute
- Update build task to remove source maps (for components repo only) - e467408
- Simplify conditional - 0a68c99
- Save off collection reference - 03f1703
- Failover url to empty string - 2427b8a

Compatibility notes:
- TODO : What might have broken?

[Commits](https://github.com/walmartlabs/thorax/compare/v2.2.0...v2.2.1)

## v2.2.0 - December 13th, 2013

- [#286](https://github.com/walmartlabs/thorax/pull/286) - Update Thorax for Backbone 1.1 ([@eastridge](https://api.github.com/users/eastridge))
- [#285](https://github.com/walmartlabs/thorax/pull/285) - Spelling fixes in the README. ([@carsonmcdonald](https://api.github.com/users/carsonmcdonald))
- [#261](https://github.com/walmartlabs/thorax/issues/261) - Investigate Backbone 1.1 impact
- [#274](https://github.com/walmartlabs/thorax/issues/274) - Docs on helpers incomplete

## v2.1.5 - December 2nd, 2013

- [#282](https://github.com/walmartlabs/thorax/pull/282) - Return event handler value from wrappers ([@kpdecker](https://api.github.com/users/kpdecker))

[Commits](https://github.com/walmartlabs/thorax/compare/v2.1.4...v2.1.5)

## v2.1.4 - December 2nd, 2013

- [#276](https://github.com/walmartlabs/thorax/pull/276) - Leaking views ([@dr-nafanya](https://api.github.com/users/dr-nafanya))

- Add view toString method - c096927

[Commits](https://github.com/walmartlabs/thorax/compare/v2.1.3...v2.1.4)

## v2.1.3 - November 28th, 2013

- [#275](https://github.com/walmartlabs/thorax/issues/275) - HelperView in {{layout-element}} error

- Replace release-component with component-version (courtesy kpdecker) - e51ebf3
- Update collection.js - 5c69497
- Update README.md - 255a604, 76b1d39, b3a12ae, 7a7e5d2
- Add log messages for writing source maps - e049613

[Commits](https://github.com/walmartlabs/thorax/compare/v2.1.1...v2.1.3)

## v2.1.1 - November 12th, 2013

- Handle destroyed helper view insert explicitly - c70d4dc

[Commits](https://github.com/walmartlabs/thorax/compare/v2.1.0...v2.1.1)

## v2.1.0 - October 21st, 2013

- [#268](https://github.com/walmartlabs/thorax/pull/268) - Remove dependencies from bower.json ([@eastridge](https://api.github.com/users/eastridge))

Compatibility notes:

You will now need to add your own Underscore, Handlebars, Backbone and jQuery or Zepto dependencies in projects that consume Thorax. Thorax is tested with the following Bower config:

    "devDependencies": {
      "jquery": "1.9.0",
      "underscore": "1.4.4",
      "zepto": "1.0.0",
      "handlebars": "1.0.0",
      "backbone": "1.0.0"
    }

Note that you should pick jQuery **or** Zepto for your project but not both.

[Commits](https://github.com/walmartlabs/thorax/compare/v2.0.3...v2.1.0)

## v2.0.3 - October 21st, 2013

- [#267](https://github.com/walmartlabs/thorax/pull/267) - Return view in existing case from _addChild. ([@ryan-roemer](https://api.github.com/users/ryan-roemer))

[Commits](https://github.com/walmartlabs/thorax/compare/v2.0.2...v2.0.3)

## v2.0.2 - October 17th, 2013

- [#255](https://github.com/walmartlabs/thorax/pull/255) - View helper fails when run via mutating array ([@kpdecker](https://api.github.com/users/kpdecker))
- [#263](https://github.com/walmartlabs/thorax/pull/263) - Make setView not throw even if old view is destroyed ([@Candid](https://api.github.com/users/Candid))
- [#264](https://github.com/walmartlabs/thorax/pull/264) - Make `render` not render destroyed views ([@Candid](https://api.github.com/users/Candid))


[Commits](https://github.com/walmartlabs/thorax/compare/v2.0.1...v2.0.2)

## v2.0.1 - September 9th, 2013

- [#248](https://github.com/walmartlabs/thorax/pull/248) - load bug fix with forwardLoadEvents while already loading ([@jhudson8](https://api.github.com/users/jhudson8)
- [#239](https://github.com/walmartlabs/thorax/issues/239) - bower: dependencies -> 'latest'

- Update release notes format - a43e1b0

[Commits](https://github.com/walmartlabs/thorax/compare/v2.0.0...v2.0.1)

## 2.0.0rc1

- Numerous performance and bug fixes
- Thorax now requires Backbone 0.9.9 or later
- The "auto unbind" feature of `on(targetObject, eventName)` has been removed, implemented by Backbone as `listenTo`
- Use of `Thorax.Router` is deprecated and no longer documented
- Removed `ViewController` class
- Views can now specify a `helpers` hash to call templates with
- Removed Thorax.Util.getValue
- `renderTemplate` second `context` argument now overrides context passed to template instead of adding to it
- `ready` event now propagates to children
- Added `view.appendTo` method
- Added `bindDataObject`, `unbindDataObject` methods
- Added `thorax release` command to generate combined & minified files
- New lumbar based build system, `thorax build` command line option has been removed
- Add `removeItem` `updateItem` methods for views rendering a collection
- Remove `emptyContext` method and `empty-context` collection helper argument
- Add {{collection-element}} helper, to specify where in a view a collection should be rendered
- `CollectionView` has been removed, collection rendering can now be done in any class
- Added `itemFilter` method
- Move `{{cid}}`, `{{yield}}` special variables to private variables in handlebars (available with `{{@cid}}` and `{{@yield}}`). `{{_view}}` is now avialable as `{{@view}}` 
- Collection events bound with `on({collection: events})` no longer recieve a `CollectionView` as the first argument
- Revert: DOM event handlers now recieve the original context (if the handler had been registered with $.on) as the second argument

## 2.0.0b5

- `expand-tokens=true` is now required in the `url` helper to expand handlebars tokens inside a url
- Added `loading-placement` option to the `collection-helper`
- DOM event handlers now recieve the original context (if the handler had been registered with $.on) as the second argument
- Added bower support
- Add `trigger` attribute option to button and link helpers
- Fail silently when #view helper does not find a view instance (1.x behavior)
- `$.model` now accepts a view as an optional argument 
- `Thorax.View.prototype._loadTemplate` renamed to `Thorax.Util.getTemplate`

## 2.0.0b4

- add `template` helper block capture and `yield` variable
- added `Thorax.onException` hook for easier android debugging
- collection `filter` option now hides or shows elements instead of adding or removing them
- collection `filter` option now applied when model change event is triggered
- collection event change: when using view.on({collection: events}) syntax, `CollectionView` instances are now prepended to the array of arguments passed and the callback is now called with the context of the delcaring view 
- allowed creation of `CollectionView` classes in JavaScript direclty (previously could only be created via the collection helper)
- `Thorax.Router` and `Thorax.ViewController` now use a constructor override so that super.initialize() does not need to be invoked when overriding `initialize`

## 2.0.0b3

- added mobile plugin
- allow nested objects in any registry to allow: {{view "Nested.Object"}}
- `thorax build` command now requires a target filename as the first argument
- `Thorax.Util.shouldFetch` will now gracefully support Backbone.Model and Backbone.Collection instances
- allow Backbone.Model and Backbone.Collection instances to be passed to `_loadModel` and `_loadCollection`

## 2.0.0b2

- `item-context` and `empty-context` will try to use `itemContext` and `emptyContext` functions as defaults if they are available on the declaring view
- a build system was created, some method overrides are now done via code templates with handlebars instead of in JS, resulting in smaller wire size and less computational overhead
- added `build` command
- thorax.lumbar plugin was removed, functionality was moved to boilerplate projects
- `Application` class was removed, functionality was moved to boilerplate projects
- registry methods (`Thorax.view`, `Thorax.model`, etc) were removed, `name` property now has special meaning when passed to `extend` methods such as `Thorax.View.extend`

## 2.0.0b1

Thorax has been split into a variety of plugins for a better separation of concerns, the base thorax.js file now only deals with Backbone + Handlebars integration.

### Thorax Core Changes

- template has been renamed to renderTemplate
- templates may now be specified as part of the class definition as a string via the `template` attribute
- Thorax.configure() has been removed and repalced with an Application class, the equivelent code would be:

    var Application = new Thorax.Application();
    Application.start(historyOptions);
    $('body').append(Application.el);

- scrollTo and scrollToTop have been removed and will appear in the mobile plugin in 2.1
- Handlebars.registerViewHelper has been added. `empty`, `collection` and other view helpers are all implemented in this manner
- addition of $.view, $.model and $.collection

### Mixin plugin

Mixin behaviors have been moved to the mixin plugin.

### Loading Plugin

All data loading functionality, including flushQueue, fetchQueue, bindToRoute and load() have been moved into a separate thorax.loading.js file. In addition the collection helper accepts two new arguments when this file is present:

- loading-view
- loading-template

Which insert a loading view or template onto the bottom of the collection while the collection is loading. A loading helper is also provided that can be used outside of the collection helper.

The signatures of exisiting methods were not changed and the unit tests for existing functionality were only trivially changed.

### Events Plugin

- Thorax.View.registerEvents has been renamed to Thorax.View.on and is available on all Backbone and Thorax classes
- Any object that can be used as the Thorax.View.prototype.events object may now be used as an argument to on()
- The nested event keyword has gone away and will re-appear (or have a different implementation accomplishing the same thing) in 2.1
- All view events regardless of how they are registered will now be processed with _addEvent who's signature is unchanged
- Events to be bound on another object only while the view is alive may be registered with: view.on(target, eventName, callback) When the view is destroyed the event on the target object will be unbound.

### Form plugin

`serialize`, `populate` and `validateInput` have been moved into a form plugin but are unchanged

### Helpers plugin

Added `link`, `url` and `button` helpers.

Previously all `click a` events would trigger the `Backbone.history.navigate` behavior. This is now opt in via the `link` helper.

### Collection Plugin

Collection handling has been completely re-written and is not backwards compatible. The new collection helper must be used. Multiple collections and multiple displays of the same collection may now be present in the same view. Each collection helper will generate a `CollectionView`instance. Specific migrations:

- item-context may be specified in the collection helper instead of setting an itemContext method on the view class
- empty-context may be specified in the collection helper instead of setting an emptyContext method on the view class
- rendered:collection event recieves the related collectionView as it's first argument
- rendered:item event recieves the related collectionView as it's first argument
- rendered:empty event recieves the related collectionView as it's first argument
- renderItem no longer exists on the view class, use the rendered:item event or specify specific behaviors in your item-view class
- renderEmpty no longer exists on the view class, use the rendered:empty event or specify specific behaviors in your empty-view class
- the filter option has been added which should be used in place of the behavior added in https://github.com/walmartlabs/thorax/pull/43/files

### Lumbar plugin

A lumbar plugin has been added which adds a module.router() method to each lumbar generated module. The Thorax + Lumbar node boilerplate project makes use of this:

https://github.com/walmartlabs/thorax-boilerplate/tree/master/thorax-node

### Model plugin

`Thorax.Model` and `setModel` have been moved to the model plugin but are unchanged in behavior.

### ViewController plugin

- `Thorax.Layout` has been renamed to `Thorax.LayoutView`. It is now a `Thorax.View` subclass instead of a `Backbone.View`. Multiple `LayoutView` instances may now be embedded in a parent view.
- `setView` has gained a `destroy: false` option
- `layout.getView()` must be used to get the current view of a layout instead of `layout.view`
- `Thorax.ViewController` and `Thorax.Application` classes have been added
- `route` and `route:before` events have been added to `Thorax.Router`

### Command line utilities

Have been removed, except for the following command:

    thorax templates ./templates-dir ./templates.js

Boilerplate projects have been provided and a lumbar.json editor will appear in 2.1

## 1.2

- load:start and load:end handling have been moved into a plugin
- nested event keyword now works with views, the callback will always be called with the context of the declaring view and will always recieve the triggering view as the first argument
- empty() the collection element before renderCollection()

## 1.1

- added {{collection}} helper
- _collectionSelector is now deprecated and internally defaults to [data-collection-cid], for backwards compatibility set it to ".collection" in your view classes
- added templatePathPrefix option to configure()
- unit tests!
- added nested event keyword
- added _addEvent method for subclasses to customize event registration
- registerEvents is now an instance method in addition to a class method
- added emptyContext method, called from renderEmpty
- checks for view.name property are now lazy
- exceptions are now thrown instead of using console.error
