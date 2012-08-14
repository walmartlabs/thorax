# Thorax Roadmap

## 2.1

### mobile plugin

Create a mobile plugin which includes the fastclick and tap-highlight implementations in Phoenix in addition to the default behaviors present in Phoenix & Thorax 1.2 such as:

    'submit form': function(event) {
      // Hide any virtual keyboards that may be lingering around
      var focused = $(':focus')[0];
      focused && focused.blur();
    }

In addition create a mobile download that includes a base lumbar project setup to build for iOS, Android. 

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

## 2.2

### Inspector Plugin & lumbar.json editor

Create an inspector plugin to toggle a behavior to open the relevant model, collection or view file from an application built with thorax. Also implement a visual editor for lumbar.json files. Should have node and Rails backends. Existing implementations:

- [old admin backend implementation](https://gist.github.com/3352149)
- [old frontend implementation](https://gist.github.com/3352206)