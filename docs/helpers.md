Thorax Helpers Plugin
=====================

## View Helpers

### button *{{#button methodName [htmlAttributes]}}*

Creates a `button` tag that will call the specified methodName on the view when clicked. Arbitrary HTML attributes can also be specified.

    {{#button "methodName" class="btn"}}Click Me{{/button}}

The tag name may also be specified:

    {{#button "methodName" tag="a" class="btn"}}A Link{{/button}}

### url *{{url urlString}}*

Prepends "#" if `Backbone.history.pushSate` is disabled, and resolves any url paramters with the current conext. For example if the context had an `id` attribute `:id` would be replaced with the value of `id`

    {{url "articles/:id"}}

### link *{{#link url [htmlAttributes]}}*

Creates an `a` tag that will call `Backbone.history.navigate()` with the given url when clicked. Passes the `url` parameter to the `url` helper with the current context. Do not use this method for creating external links.

    {{#link "articles/:id" class="article-link"}}Link Text{{/link}}

