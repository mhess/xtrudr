# xtrudr.js

JavaScript object validator and sanitizer for node.js.

### Quickstart Example Usage

```javascript
var x = require('xtrudr'),
    q = require('q');

/* Synchronous xtrudr instance */

var xSync = x()
  
  .permit('foo')
  
  .require({

    baz: function(i){ if (i) return 1; throw "err"; },

    email: x.isEmail().msg('bad email'),

    num: [x.isInt(), x.toInt()]

  });  

var input1 = {foo: 1, email: 'oops', num: "a"};

xSync(input1).err  // => {baz: ["is required"], email: ["bad email"],
                   //     num: ["must be int"]}

xSync.out          // => {foo: 1}


var input2 = {baz: "baz", email: "a@baz.com", num: "2"};

xSync(input2).err  // => undefined
xSync.out          // => {baz: 1, email: "a@baz.com", num: 2}


/* Asynchronous xtrudr instance */

var xAsync = x(true)

  .require({
    foo: function(i){
      return q(i).then(function(r){ 
        if (r) return r; throw "err";
      });
    }
  });

xAsync({foo: 0})
  .then(function(x){
    console.log(x.err);     // => {foo: ["error"]}
  });    

xAsync({foo: 1})
  .then(function(x){
    console.log(x.out);     // => {foo: 1}
  });
```

### The xtrudr instance

This library performs object validation/sanitization/transformation
via the use of configurable functions called **xtrudr** instances.
An instance is called with an input object as the only argument which
is then used to populate the `inp`, `out`, `err` properties of the 
instance.

#### Instantiation

**xtrudr** instances are instantiated by the factory function that is 
the root object of the library.  They can be either synchronous or 
asynchronous.  The default is sync, while async instances can be 
created by passing a truthy argument to the factory function.

#### Invocation and instance properties
 
The **xtrudr** instance properties are described as follows:

* `inp`: The original input object.
* `out`: An output object with properties derived from the input.
* `err`: An object keyed (typically) by the properties of the input 
  object.  The values are arrays of error messages.

These properties are cleared and repopulated during every invocation.
If no validation errors occurred, then the `err` property is 
*`undefined`*.

If the instance is synchronous the return value of the invocation is
the instance itself with populated properties.  If asynchronous, then
the return value is a **q** promise that resolves to the populated
instance.

#### Configuration

An **xtrudr** instance can be configured with any number of calls to
three chainable methods: 

* `permit()`: Allows properties in the input object to be assigned to
  the `out` property, potentially attaching validation logic if the 
  property is present.
* `require()`: Requires properties in the input object, adding an 
  error message (default `"is required"`) if that property is missing.
  It also can attach validation logic if it is present.
* `add()`: Adds a validation method to the **xtrudr** instance that
  has access to the `inp`, `out`, and `err` properties of the instance
  via the `this` variable.  

Both the `permit()` and `require()` methods may take either strings or
objects as arguments.  When provided a string, this configures the 
**xtrudr** instance to assign the input object's property of that name
to the `out` object's property.

An object argument provided to `permit()` or `require()` is 
interpreted as a mapping of input property names to validator 
functions.  Validator functions take the named input object's property value as their only argument and must return a value or throw a 
*non-`Error`* class error.  If a value is returned then that value
gets placed in the **xtrudr** instance's `out` object.  An 
*`undefined`* return value (no return statement) is treated the same
as returning the input of the function.  If the function throws a 
value (usually a string), then that value gets appended to the error
array for the named input.

Asynchronous validator functions return a promise with resolve/reject
behavior that is analogous to the synchronous functions.

The `add()` method adds a validator *method* to the instance.  A 
validator method is invoked as a method of the **xtrudr** instance
when the instance itself is invoked, and is intended allow arbitrary
logic to operate on the `inp`, `out`, and `err` instance properties.
This is useful for cases when there is validation that depends on
multiple input properties.
