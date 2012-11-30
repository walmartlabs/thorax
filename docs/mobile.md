Thorax Mobile Plugin
====================

The Thorax mobile plugin deals stricly with behavioral fixes for mobile web applications that make sense to implement in the View layer rather than directly in Zepto. In addition to this plugin the [mobile boilerplate project](https://github.com/walmartlabs/thorax-boilerplate) is provided which is a starter [Lumbar](http://walmartlabs.github.com/lumbar) project that includes this plugin and is set up to build for mobile environments.

## Fast Click

Mobile WebKit will delay `click` events by 300ms. The mobile plugin will transparently re-write this event as a custom `fast-click` event which is not delayed in the following cases:
    
    //passing a dom event to "on" 
    view.on('click selector', function(){});

    //using the events hash
    Thorax.View.extend({
      events: {
        'click selector': function(){}
      }
    });

    //using the button or link helpers
    {{#button "methodName"}}A Button{{/button}}
    {{#link "url"}}A Link{{/link}}

This behavior can be disabled by calling `Thorax.configureFastClick(false)`. If you need to mix and match fast and slow clicks, fall back to Zepto directly:
    
    //fast-click is implemented in the View class
    //layer and not directly on Zepto
    $('selector').on('click', function() {})

### configureFastClick *Thorax.configureFastClick(useFastClick)*

Sets the boolean `useFastClick` for wether or not to use the fast click implementation provided by thorax. Defaults to true.

## Tap Highlights

Tap higlights are inconsitently or incorrectly implemented on iOS and Android. The mobile plugin normalizes the behavior and provides a reliable `active` class name which can be used. Some additonal `-webkit-tap-highlight-color` CSS styles may be needed to normalize tap highlight behavior and examples are provided in the [mobile boilerplate project](https://github.com/walmartlabs/thorax-boilerplate).

The following selector is used to apply tap highlight behaviors to elements inside `Thorax.View` instances:

    [data-tappable=true], a, input, button, select, textarea

### data-tappable *data-tappable="true"*

Add this attribute to any HTML tag to apply tap highlight behaviors to it.

### configureTapHighlight *Thorax.configureTapHighlight(useTapHighlight)*

Set the boolean `useNative` for wether or not to use the built in (native) tap highlights in the device. Defaults to true.

### _tapHighlightClassName *view._tapHighlightClassName*

Class name to use when a tap highlight is active. Defaults to `active`.

### _tapHighlightStart *view._tapHighlightStart(event)*

A built in handler that will be called when a tap highlight starts. Override this to implement custom behaviors, by default it will add the `_tapHighlightClassName`.

### _tapHighlightEnd *view._tapHighlightEnd(event)*

A built in handler that will be called when a tap highlight ends. Override this to implement custom behaviors, by default it will remove the `_tapHighlightClassName`.

### tapHoldAndEnd *view.$el.tapHoldAndEnd(selector, callbackStart, callbackEnd)*

This function adds the tap and hold event to the given elements. The registered handlers are activated by the user pressing and holding a position for 150 msec. This function is used by the tap highlight implementation.

`callbackStart` is called after the 150 msec delay between when the user first touched the screen and before they moved their position or let go.

`callbackEnd` is called after the user moves from their initial tapped position or lets go of the screen. Note that this function is not called unless the `callbackStart` is called first.

    view.$el.tapHoldAndEnd('a', function(){}, function(){});

## Scrolling

These utility methods normalize two bugs present in mobile environments:

- iOS: needs `window.scrollTo` to be deferred in some circumstances
- Android: needs the minimum scroll `y` to be 1 in order to scroll to the top

### scrollTo *Thorax.Util.scrollTo(x, y)*

### scrollToTop *Thorax.Util.scrollToTop()*

## Auto Form Hiding

Some Android devices exhibit a "stuck" keyboard after a form has been submitted. Thorax will ensure that after any form `submit` event that any virtual keyboards will be hidden.
