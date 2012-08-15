An opinionated, battle tested [Backbone](http://backbonejs.org/) + [Handlebars](http://handlebarsjs.com/) framework to build large scale web applications. 

## Editable Examples

All of the examples use the [same sample data](https://raw.github.com/gist/3353451/6ae32d360523c996fc9085252509ed3cec0851ca/thorax.sample-data.js) and many use functionality found in plugins.

- [Todos](http://jsfiddle.net/HAdxJ/)
- [$.model](http://jsfiddle.net/bydS9/)
- [Context](http://jsfiddle.net/3brkX/)
- [view & template helpers](http://jsfiddle.net/d7DKF/)
- [empty helper](http://jsfiddle.net/rTtP5/)
- [freeze](http://jsfiddle.net/GUL8v/)
- [LayoutView](http://jsfiddle.net/Y8AMu/)
- [registerViewHelper](http://jsfiddle.net/dG2JE/)

## Thorax

The root `Thorax` object acts as a registry for classes and templates.

### template *Thorax.template(name [,content])*

Get or set a template by name. If using the included node or Rails downloads any `.handlebars` files will automatically be available by name sans extension. Any helpers dealing with templates will assume templates were set in this manner.

    //set a template
    Thorax.template("list-o-cats", "{{#collection cats}}{{/collection}}");

    //get a template
    var template = Thorax.template("list-o-cats");

### view *Thorax.view(name [,protoProps])*

Get or set a view class by name. Any helpers dealing with views will assume views were set in this manner.

    //create a new Thorax.View subclass
    var ListOCatsView = Thorax.view('list-o-cats', {});
    ListOCatsView.name; //list-o-cats

    //or use a specific subclass
    Thorax.view('my-subclass', SubclassView.extend({}));

    //retrieve a view class
    var ListOCatsView = Thorax.view('list-o-cats');
    var view = new ListOCatsView();
    //template will be auto assigned if possible
    view.template == Thorax.template("list-o-cats");

    //don't use the new keyword directly:
    new Thorax.view('list-o-cats'); //NO
    var view = Thorax.view('list-o-cats');
    new view(); //YES

## Thorax.View

The base `Thorax.View` implementation is concerned only with Handlebars + Backbone integration. A variety of additional functionality is provided by the various included plugins. 

    var view = new Thorax.View({
      template: "{{key}}",
      key: "value"
    });
    view.render();
    $('body').append(view.el);

### name *view.name*

The name of the view, which may be manually set or automatically set when the class is created with `Thorax.view`.

### children *view.children*

A hash of child view's indexed by `cid`. Child views may become attached to the parent with the `view` helper or may be automatically attached `HelperView` instanced created by helpers created with `regsterViewHelper`.

### parent *view.parent*

If a view was embedded inside another with the `view` helper, or is a `HelperView` created by a helper creted with `registerViewHelper` the view will have a `parent` attribute.

### template *view.template*

Assign a template to a view. This may be a string or a function which recieves a single `context` argument and returns a string. If the view has a `name` and a template of the same `name` is available the `template` will be auto-assigned.

    new Thorax.View({
      template: "{{key}}"
    });

### destroy *view.destroy([options])*

By default this will only call `destroy` on all child views. Other plugins override this method to implement custom cleanup behaviors. Your own behaviors can be added with the `destroyed` event. Pass `children: false` to this method to prevent the view's children from being destroyed.

### render *view.render([content])*

Renders the view's `template` updating the view's `el` with the result, triggering the `rendered` event. `content` may be empty (render the `template`) or a function that will be called with the response from `context` or a string.

    //will render template
    view.render()
    //will insert custom content
    view.render('custom html')

### context *view.context()*

Used by `render` to determine what attributes are available in the view's `template`. The default context function returns `this`. If the model plugin is used, `this` + `model.attributes` will be the context.

### renderTemplate *view.renderTemplate(name, [,extraContext] [,ignoreErrors])*

Render a template with the view's `context` plus any optional `extraContext` parameters passed in.

### ensureRendered *view.ensureRendered()*

Ensure that the view has been rendered at least once.

### html *view.html([content])*

Get or set the `innerHTML` of the view, without triggering the `rendered` event.

## View Helpers

### super *{{super}}*

Embed the `template` from the parent view within the child template.

    {{super}}

### template *{{template name [options]}}*

Embed a template inside of another, as a string. An associated view (if any) will not be initialized. By default the template will be called with the current scope but extra options may be passed which will be added to the context.

    {{template "path/to/template" key="value"}}

### view *{{view name [options]}}*

Embed one view in another. The first argument may be the name of a new view to initialize or a reference to a view that has already been initialized.

    {{view "path/to/view" key="value"}}
    {{view viewInstance}}

### element *{{element name [options]}}*

Embed a DOM element in the view. This uses a placeholder technique to work, if the placeholder must be of a certain type in order to work (for instance a `tbody` inside of a `table`) specify a `tag` option.

    {{element domElement tag="tbody"}}

### registerViewHelper *Handlebars.registerViewHelper(name [,viewClass] ,callback)*

Registers a block view helper that will create a `HelperView` instance with a `template` attribute set to the captured block. `callback` will be called each time the helper is invoked and will recieve any arguments passed to the helper followed by a `HelperView` instance. Named arguments to the helper will be present on `options` attribute of the `HelperView` instance.

Regardless of the nesting level, the `parent` attribute on the `HelperView` instance will always be set to the view that invoked the helper.

The `collection`, `empty` and other built in block view helpers are created in this way. See the [registerViewHelper editable example](http://jsfiddle.net/dG2JE/).

    Handlebars.registerViewHelper('collection', function(collection, collectionView) {

    });

    {{#collection cats}}{{/collection}}

## Util

### tag *Thorax.Util.tag(name, htmlAttributes [,content] [,context])*

Generate an HTML string. All built in HTML generation uses this method. If `context` is passed any Handlebars references inside of the htmlAttributes values will rendered with the context.

    Thorax.Util.tag("div", {
      id: "div-{{number}}"
    }, "content of the div", {
      number: 3
    });

## $

### $.view *$(event.target).view([options])*

Get a reference to the nearest parent view. Pass `helper: false` to options to exclude `HelperView`s from the lookup. Collection views and any helper created with `registerViewHelper` will generate a `HelperView`.

    $(event.target).view()

## Command Line

### templates *thorax templates ./templates ./templates.js*

If using Thorax outside of the provided node or Rails downloads you can inline a directory of templates into a single file by running the `thorax templates` command.

    npm install -g thorax
    thorax templates ./templates-dir ./templates.js

## Events

### destroyed *destroyed ()*

Triggered when the `destroy` method is called.

### rendered *rendered ()*

Triggered when the `rendered` method is called.

### child *child (instance)*

Triggered every time a child view is inserted into the view with the `view` helper. Will not be triggered from view instances created by helper view helpers.

### helper *helper (name [,args...] ,helperView)*

Triggered when a view helper (such as `collection`, `empty`, etc) create a new `HelperView` instance.

### helper:name *helper:name [,args...] ,helperView)*

Triggered when a given view helper creates a new `HelperView` instance.

    {{#collection cats}}{{/collection}}

    view.on('helper:collection', function(collection, collectionView) {

    });

## HTML Attributes
Thorax and it's view helpers generate a number of custom HTML attributes that may be useful in debugging or generating CSS selectors to be used as arguments to `$` or to create CSS. The `*-cid` attributes are generally used only internally. See `$.model`, `$.collection` and `$.view` to get a reference to objects directly from the DOM. The `*-name` attributes will only be present if the given objects have a `name` property.</p>

<table class="table table-bordered table-striped">
  <thead>
    <tr>
      <th>Attribute Name</th>
      <th>Attached To</th>
    </tr>
  </thead>
  <tbody>
    <tr><td><code>data-view-cid</code></td><td>Every view instances' <code>el</code></td></tr>
    <tr><td><code>data-view-name</code></td><td>Same as above, only present on named views</td></tr>
    <tr><td><code>data-collection-cid</code></td><td>Element generated by the `collection helper`</td></tr>
    <tr><td><code>data-collection-name</code></td><td>Same as above, only present when the bound collection is named</td></tr>
    <tr><td><code>data-collection-empty</code></td><td>Set to "true" or "false" depending on wether the bound collection <code>isEmpty</code></td></tr>
    <tr><td><code>data-model-cid</code></td><td>A view's <code>el</code> if a model was bound to the view or each item element inside of elements generated by the collection helper</td></tr>
    <tr><td><code>data-model-name</code></td><td>Same as above, only present if the model is named</td></tr>
    <tr><td><code>data-layout-cid</code></td><td>The element generated by the <code>layout</code> helper or <code>el</code> inside of a <code>LayoutView</code>, <code>ViewController</code> or <code>Application</code> instance</td></tr>
    <tr><td><code>data-helper-name</code></td><td>Elements generated by various helpers including <code>collection</code> and <code>empty</code> from the collection plugin</td></tr>
    <tr><td><code>data-call-method</code></td><td>Elements generated by the <code>link</code> and <code>button</code> helpers</td></tr>
  </tbody>
</table>

When creating CSS selectors it's recommended to use the generated attributes (especially `data-view-name`) rather than assigning custom IDs or class names for the sole purpose of styling.

    [data-view-name="application"] {
      border: 1px solid #ccc;
    }
