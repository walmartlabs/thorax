/*global setImmediate */

// Provides a sync/async task runner that allows for operations to run in the
// best mode for their current environment. This is primarily intended for use
// in server side (async) vs. client side (sync) operations but code utilizing
// this should not make assumptions about one state or another.
//
// When `complete` is is a callback passed, all of the tasks will be executed
// asynchronously. If this parameter is omitted, then all tasks will be executed
// synchronously.
//
// All callbacks to `exec`/`chain` are guaranteed to execute in the order that they
// were received. All operations will be run when the `run` call is made, meaning
// the normal code interleaved with deferrable tasks will run before the deferrable
// task. Generally it's not recommended to mix and match the two code styles
// outside of initialization logic.
function Deferrable(complete) {
  var queue = [];

  function next() {
    if (complete) {
      setImmediate(function() {
        // Run the task
        var callback = queue.shift();
        if (callback) {
          callback();
        } else {
          // If this is the last task then complete the overall operation
          complete();
        }
      });
    } else {
      /*jshint boss:true */
      var callback;
      while (callback = queue.shift()) {
        callback();
      }
    }
  }

  return {
    // Registers a task that will always be complete after it returns.
    // Execution of subsequent tasks is automatic.
    exec: function(callback) {
      queue.push(function() {
        callback();

        if (complete) {
          next();
        }
      });
    },

    // Registers a task that may optionally defer to another deferrable stack.
    // When in async mode the task will recieve a callback to execute further
    // tasks after this one is completed.
    // 
    // Note that this is not intended for allowing a true async behavior and
    // should only be used to execute additional deferrable chains.
    chain: function(callback) {
      queue.push(function() {
        if (complete) {
          callback(next);
        } else {
          callback();
        }
      });
    },

    // Signal that all potential tasks have been registered and execution should
    // commence.
    run: function() {
      // Check if there were no asyncable calls made and complete immediately
      if (complete && !queue.length) {
        setImmediate(complete);
      } else {
        // Otherwise fire off the async processes
        next();
      }
    }
  };
}
Thorax.Util.Deferrable = Deferrable;

// Executes an event loop chain with an attached deferrable as the final argument.
// This method expects a final argument to be the callback for the deferrable or
// explicitly undefined. If in a situation where it's known ahead of time that
// there will be no callback value then `trigger` should be used directly.
Thorax.View.prototype.triggerDeferrable = function() {
  var args = [],
      len = arguments.length - 1,
      callback = arguments[len];
  for (var i = 0; i < len; i++) {
    args.push(arguments[i]);
  }

  var controller = new Deferrable(callback);
  args.push(controller);

  this.trigger.apply(this, args);
  controller.run();
};
