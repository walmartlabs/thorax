Thorax Mobile Plugin
====================

## Behaviors

  'submit form': function(event) {
    // Hide any virtual keyboards that may be lingering around
    var focused = $(':focus')[0];
    focused && focused.blur();
  }

## Scrolling

### scrollTo *Thorax.Util.scrollTo(x, y)*

### scrollToTop *Thorax.Util.scrollToTop()*

## Fast Click

## Tap Highlights

### Class Name

### configureTapHighlight *Thorax.configureTapHighlight(useNative)*

### tapHoldAndEnd *$(elements).tapHoldAndEnd(selector, callbackStart, callbackEnd)*

This function adds the tap and hold event to the given elements. It is
activated by the user pressing and holding a position for 150 msec. It was
necessary to add this custom event for our tap highlight implementation. 

@param selector option selector used to delegate events.

@param callbackStart function that is called after the 150 msec delay between when the user first touched the screen and before they moved their position or let go. We are using it in tap highlights to add a class name to a given element.

@param callbackEnd function that is called after the user moves from their initial tapped position or lets go of the screen. We are using it in tap highlight to remove the classname from a given element. Note that this function is not called unless the callbackStart is called first.
