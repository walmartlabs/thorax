
var growl = require('./lib/growl')

growl.binVersion(function(err, version){
  console.log(version);
})
growl.notify('You have mail!')
growl.notify('5 new messages', { sticky: true })
growl.notify('5 new emails', { title: 'Email Client', image: 'Safari', sticky: true })
growl.notify('Show Safari icon', { image: 'Safari' })
growl.notify('Show icon', { image: 'path/to/icon.icns' })
growl.notify('Show image', { image: 'path/to/my.image.png' })
growl.notify('Show png filesystem icon', { image: 'png' })
growl.notify('Show pdf filesystem icon', { image: 'article.pdf' })
growl.notify('Show pdf filesystem icon', { image: 'article.pdf' }, function(){
  require('sys').p('callback')
})