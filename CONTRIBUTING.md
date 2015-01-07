# How to Contribute

## Reporting Issues

Should you run into other issues with the project, please don't hesitate to let us know by filing an [issue][issue]! In general we are going to ask for an example of the problem failing, which can be as simple as a jsfiddle/jsbin/etc. Jsfiddle provides a Thorax framework target to ease creating test cases.

Pull requests containing only failing thats demonstrating the issue are welcomed and this also helps ensure that your issue won't regress in the future once it's fixed.

## Pull Requests

We also accept [pull requests][pull-request]!

Generally we like to see pull requests that
- Maintain the existing code style
- Are focused on a single change (i.e. avoid large refactoring or style adjustments in untouched code if not the primary goal of the pull request)
- Have [good commit messages](http://tbaggery.com/2008/04/19/a-note-about-git-commit-messages.html)
- Have tests

## Building

To build you'll need a few things installed:

* Node.js
* [Grunt](http://gruntjs.com/getting-started)

Project dependencies may be installed via `npm install`.

The `grunt dev` implements watching for tests and allows for in browser testing at `http://localhost:9999/jquery/test.html` and `http://localhost:9999/zepto/test.html`.

If you notice any problems, please report them to the GitHub issue tracker.

## Releasing

Thorax utilizes the [release yeoman generator][generator-release] to perform most release tasks.

```sh
npm install -g yo generator-release
```

A full release may be completed with the following:

```sh
grunt clean thorax:build
yo release
npm publish
yo release:publish cdnjs thorax build/release
yo release:publish components thorax build/release
```

[generator-release]: https://github.com/walmartlabs/generator-release
[pull-request]: https://github.com/walmartlabs/thorax/pull/new/master
[issue]: https://github.com/walmartlabs/thorax/issues/new
