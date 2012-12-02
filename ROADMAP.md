# Thorax Roadmap

## 2.0.0 final

### Document and test mixin plugin

### re-add unregisterEvents as off for class events

Need to add tests as previous implementation was untested and unpredictable.

### form plugin additions

Add validation support and relevant handlebars helpers. Existing implementations:

- [helper implementation](https://gist.github.com/3351915)
- [helper tests](https://gist.github.com/3351939)
- [validation implementation](https://gist.github.com/3351920)
- [validation tests](https://gist.github.com/3351929)

### bind plugin

Add {{bind}} and {{bindAttr}} helpers ala ember. Want to change the following implementations to be model only (i.e. no getter setter method on the view). Exisiting implementation:

- [docs](https://gist.github.com/3351794)
- [implementation](https://gist.github.com/3351803)
- [tests](https://gist.github.com/3351815)

## 2.1

### Inspector Plugin & lumbar.json editor

Create an inspector plugin to toggle a behavior to open the relevant model, collection or view file from an application built with thorax. Also implement a visual editor for lumbar.json files. Should have node and Rails backends. Existing implementations:

- [old admin backend implementation](https://gist.github.com/3352149)
- [old frontend implementation](https://gist.github.com/3352206)
