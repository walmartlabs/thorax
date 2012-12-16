Thorax Helpers Plugin
=====================

## View Helpers

### button *{{#button methodName [htmlAttributes]}}*

Creates a `button` tag that will call the specified methodName on the view when clicked. Arbitrary HTML attributes can also be specified.

    {{#button "methodName" class="btn"}}Click Me{{/button}}

The tag name may also be specified:

    {{#button "methodName" tag="a" class="btn"}}A Link{{/button}}

A `trigger` attribute will trigger an event on the declaring view:

    {{#button trigger="eventName"}}Button{{/button}}

A button can have both a `trigger` attribute and a method to call:

    {{#button "methodName" trigger="eventName"}}Button{{/button}}

The method may also be specified as a `method` attribute:

    {{#button method="methodName"}}Button{{/button}}

### url *{{url urlString expand-tokens=bool}}*

Prepends "#" if `Backbone.history.pushSate` is disabled or prepends `Backbone.history.root` if it is enabled. If `expand-tokens=true` is passed, then any handlebars tokens will be resolved with the current context. For example if the context had an `id` attribute `{{id}}` would be replaced with the value of `id`:

    {{url "articles/{{id}}" expand-tokens=true}}

Multiple arguments can be passed and will be joined with a "/":

    {{url "articles" id}}

### link *{{#link url [htmlAttributes]}}*

Creates an `a` tag that will call `Backbone.history.navigate()` with the given url when clicked. Passes the `url` parameter to the `url` helper with the current context. Do not use this method for creating external links. Like the `url` helper, multiple arguments may be passed as well as an `expand-tokens` option.

    {{#link "articles/{{id}}" expand-tokens=true class="article-link"}}Link Text{{/link}}

To call a method from an `a` tag use the `button` helper:

    {{#button "methodName" tag="a"}}My Link{{/button}}

Like the `button` helper, a `trigger` attribute may be specified that will trigger an event on the delcaring view in addition to navigating to the specified url:

    {{#link "articles" id trigger="customEvent"}}Link Text{{/link}}

The href attribute is required but may also be specified as an attribute:

    {{#link href="articles/{{id}}" expand-tokens=true}}Link Test{{/link}}