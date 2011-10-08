
// Growl - Copyright TJ Holowaychuk <tj@vision-media.ca> (MIT Licensed)

/**
 * Module dependencies.
 */

var exec = require('child_process').exec
  , path = require('path');

/**
 * Node-growl version.
 */

exports.version = '1.1.0'
  
/**
 * Fetch the binary version when available.
 *
 * @param  {function} fn
 * @api public
 */
  
exports.binVersion = function(fn) {
  exec('growlnotify -v', function(err, stdout){
    if (err) return fn(err);
    var version = /(\d+\.\d+(?:\.\d+)?)/.exec(stdout)[1];
    fn(null, parseFloat(version));
  });
};

/**
 * Send growl notification _msg_ with _options_.
 *
 * Options:
 *
 *  - title   Notification title
 *  - sticky  Make the notification stick (defaults to false)
 *  - name    Application name (defaults to growlnotify)
 *  - image
 *    - path to an icon sets --iconpath
 *    - path to an image sets --image
 *    - capitalized word sets --appIcon
 *    - filename uses extname as --icon
 *    - otherwise treated as --icon
 *
 * Examples:
 *
 *   growl.notify('New email')
 *   growl.notify('5 new emails', { title: 'Thunderbird' })
 *   growl.notify('Email sent', function(){
 *     // ... notification sent
 *   })
 *
 * @param {string} msg
 * @param {object} options
 * @param {function} fn
 * @api public
 */

exports.notify = function(msg, options, fn) {
  var image
    , args = ['growlnotify', '-m', '"' + msg + '"']
    , options = options || {}
    , fn = fn || function(){};
  exports.binVersion(function(err, version){
    if (err) return fn(err);
    if (image = options.image) {
      var flag, ext = path.extname(image).substr(1)
      flag = flag || ext == 'icns' && 'iconpath'
      flag = flag || /^[A-Z]/.test(image) && 'appIcon'
      flag = flag || /^png|gif|jpe?g$/.test(ext) && 'image'
      flag = flag || ext && (image = ext) && 'icon'
      flag = flag || 'icon'
      args.push('--' + flag, image)
    }
    if (options.sticky) args.push('--sticky');
    if (options.name) args.push('--name', options.name);
    if (options.title) args.push(options.title);
    exec(args.join(' '), fn);
  });
};
