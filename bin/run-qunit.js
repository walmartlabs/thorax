/**
 * Wait until the test condition is true or a timeout occurs. Useful for waiting
 * on a server response or for a ui change (fadeIn, etc.) to occur.
 *
 * @param testFx javascript condition that evaluates to a boolean,
 * it can be passed in as a string (e.g.: "1 == 1" or "$('#bar').is(':visible')" or
 * as a callback function.
 * @param onReady what to do when testFx condition is fulfilled,
 * it can be passed in as a string (e.g.: "1 == 1" or "$('#bar').is(':visible')" or
 * as a callback function.
 * @param timeOutMillis the max amount of time to wait. If not specified, 3 sec is used.
 */
function waitFor(testFx, onReady, timeOutMillis) {
    var maxtimeOutMillis = timeOutMillis ? timeOutMillis : 3001, //< Default Max Timout is 3s
        start = new Date().getTime(),
        condition = false,
        interval = setInterval(function() {
            if ( (new Date().getTime() - start < maxtimeOutMillis) && !condition ) {
                // If not time-out yet and condition not yet fulfilled
                condition = (typeof(testFx) === "string" ? eval(testFx) : testFx()); //< defensive code
            } else {
                if(!condition) {
                    // If condition still not fulfilled (timeout but condition is 'false')
                    console.log("'waitFor()' timeout");
                    phantom.exit(1);
                } else {
                    // Condition fulfilled (timeout and/or condition is 'true')
                    console.log("'waitFor()' finished in " + (new Date().getTime() - start) + "ms.");
                    typeof(onReady) === "string" ? eval(onReady) : onReady(); //< Do what it's supposed to do once the condition is fulfilled
                    clearInterval(interval); //< Stop this interval
                }
            }
        }, 100); //< repeat check every 250ms
};


if (phantom.args.length === 0 || phantom.args.length > 2) {
    console.log('Usage: run-qunit.js URL');
    phantom.exit();
}

var argCount = phantom.args.length;
Array.prototype.slice.call(phantom.args).forEach(function(arg) {
    var page = new WebPage();

    // Route "console.log()" calls from within the Page context to the main Phantom context (i.e. current "this")
    page.onConsoleMessage = function(msg) {
        console.log(msg);
    };

    page.open(arg, function(status){
        if (status !== "success") {
            console.log("Unable to access network");
            phantom.exit();
        } else {
            waitFor(function(){
                return page.evaluate(function(){
                    var el = document.getElementById('qunit-testresult');
                    if (el && el.innerText.match('completed')) {
                        return true;
                    }
                    return false;
                });
            }, function(){
                var failedNum = page.evaluate(function(){
                    var failed = document.querySelectorAll('#qunit-tests > .fail');
                    for (var i = 0, len = failed.length; i < len; i++) {
                      var el = failed[i];
    
                      var name = el.getElementsByTagName('strong')[0];
    
                      console.log('failed: ' + name.innerText);
                    }
    
                    var el = document.getElementById('qunit-testresult');
                    try {
                        console.log(el.innerText);
                        return el.getElementsByClassName('failed')[0].innerHTML;
                    } catch (e) { }
                    return 10000;
                });
                --argCount;
                if (parseInt(failedNum, 10) > 0) {
                  phantom.exit(1);
                } else if (argCount === 0) {
                  phantom.exit(0);
                }
            });
        }
    });
});
