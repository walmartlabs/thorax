var exec = require('child_process').exec;
var path = require('path');
var fs = require('fs');

task('docs', function() {
  var readme_contents = fs.readFileSync(path.join(__dirname, 'README.md'));
  exec([
    'git add README.md',
    'git commit -m "updated documentation"',
    'git push origin master',
    'git checkout gh-pages',
    'npm install jsdom',
    'npm install node-markdown'
  ].join(';'), function(error, stdout, stderr) {
    if (stdout && stdout != '') {
      console.log(stdout);
    }
    if (stderr && stderr != '') {
      console.log(stderr);
    }
    fs.writeFileSync(path.join(__dirname, 'README.md'), readme_contents);
    var docs = require(path.join(__dirname, 'docs.js'));
    docs.generate(function() {
      exec([
        'rm -rf node_modules',
        'git add *',
        'git commit -m "updated generated documentation"',
        'git push origin gh-pages',
        'git checkout master'
      ].join(';'), function(error, stdout, stderr) {
        if (stdout && stdout != '') {
          console.log(stdout);
        }
        if (stderr && stderr != '') {
          console.log(stderr);
        }
        console.log('');
        console.log('Updated walmartlabs.github.com/thorax');
      })
    });
  });
});
