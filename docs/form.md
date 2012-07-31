Thorax Form Plugin
==================

## Form Handling

Thorax provides helpers to assist with form handling, but makes no user interface decisions for you. Use the `validate` and `error` events to implement error messages in your application.

    Application.View.registerEvents({
      validate: function(attributes, errors) {
        //clear previous errors if present
      },
      error: function(errors) {
        errors.forEach(function(error) {
          //lookup input by error.name
          //display error from error.message
        });
      }
    });

### serialize *view.serialize([event], callback [,options])*

Serializes a form. `callback` will receive the attributes from the form and will only be called if `validateInput` returns nothing or an empty array. If an `event` is passed a check will be run to prevent duplicate submission. `options` may contain:

- `set` - defaults to true, wether or not to set the attributes if valid on a model if one was set with `setModel`
- `validate - defaults to true, wether or not to call `validateInput` during serialization

Each form input in your application should contain a corresponding label. Since you may want to re-use the same form multiple times in the same view a `cid` attribute with a unique value is provided to each render call of each template:
    
    <label for="{{cid}}-last-name"/>
    <input name="last-name" id="{{cid}}-last-name" value="Beastridge"/>
    <label for="{{cid}}-last-name"/>
    <input name="address[street]" value="123 Chestnut" id="{{cid}}-address[street]"/>

    Phoenix.View.extend({
      name: "address-form",
      events: {
        "submit form": "_handleSubmit"
      },
      _handleSubmit: function(event) {
        this.serialize(event, function(attributes) {
          attributes["last-name"] === "Beastridge";
          attributes.address.street === "123 Chestnut";
        });
      }
    });

`serialize` Triggers the following events:

- `serialize` - called before validation with serialized attributes
- `validate` - with an attributes hash and errors array after `validateInput` is called
- `error` - with an errors array, if validateInput returned an array with any errors

If your view uses inputs with non standard names (or no names, multiple inputs with the same name, etc), use the `serialize` event:

    this.bind('serialize', _.bind(function(attributes) {
      attributes.custom = this.$('.my-input').val();
    }, this));

### populate *view.populate([attributes])*

Populate the form fields in the view with the given attributes. The keys of the attributes should correspond to the names of the inputs. `populate` is automatically called with the response from `view.context(view.model.attributes)` when `setModel` is called.

    view.populate({
      "last-name": "Beastridge"
      address: {
        street: "123 Chestnut"
      }
    });

`populate` triggers a `populate` event. If your view uses inputs with non standard names (or no names, multiple inputs with the same name, etc), use this event:

    this.bind('populate', _.bind(function(attributes) {
      this.$('.my-input').val(attributes.custom);
    }, this));

### validateInput *view.validateInput(attributes)*

Validate the attributes created by `serialize`, must return an array or nothing (if valid). It's recommended that the array contain hashes with `name` and `message` attributes, but arbitrary data or objects may be passed. If the array has a zero length the attributes are considered to be valid. Returning an array with any errors will trigger the `error` event.

    validateInput: function(attributes) {
      var errors = [];
      if (attributes.password && !attributes.password.match(/.{6,11}/)) {
        errors.push({name: 'password', message: 'Invalid Password'});
      }
      return errors;
    }
