var exec = require('child_process').exec;
var path = require('path');
var fs = require('fs');

task('docs', function() {
  var readme_contents = fs.readFileSync(path.join(__dirname, 'README.md'));
  exec([
    'git add README.md',
    'git commit -m "updated documentation"',
    'git push origin master',
    'git checkout gh-pages'
  ].join(';'), function() {
    fs.writeFileSync(path.join(__dirname, 'README.md'), readme_contents);
    var docs = require(path.join(__dirname, 'docs.js'));
    docs.generate(function() {
      exec([
        'git add *',
        'git commit -m "updated generated documentation"',
        'git push origin gh-pages',
        'git checkout master'
      ].join(';'), function() {
        console.log('Updated walmartlabs.github.com/thorax');
      })
    });
  });
});
