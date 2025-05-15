# xtrudr.js

A succinct, powerful, and flexible JavaScript object validator for 
node.js.

### Quickstart Example Usage

```javascript
var x = require('xtrudr'),
    q = require('q');       // Optional depedency only needed for
                            // async validation.


function validBaz(i){       // Synchronous validator function
  if( i=='baz' ) return 1;
  throw "not baz"; 
}

var xSync = x()             // Synchronous xtrudr instance

  .permit('foo')            // Allow "foo"
  .require({

    zab: validBaz,          // Require "baz" and run "validBaz"

    email: x.isEmail()      // Require valid email
      .msg('bad email'),    // Use custom error message

    num: [
      x.isInt(),            // Check if int
      x.toInt()             // Convert to int
    ]
  });  

var input1 = {foo: 1, email: 'oops', num: "a"};
xSync(input1).err           // => {baz: ["is required"],
                            //     email: ["bad email"],
                            //     num: ["must be int"]}
xSync.out                   // => {foo: 1}

var input2 = {baz: 'baz', email: "a@baz.com", num: 2};
xSync(input2).err           // => undefined
xSync.out                   // => {baz: 1, email: "a@baz.com", num: 2}


function asyncFoo(i){       // Async validator function
  return q(i)
  .then(function(r){
    if (!r) throw "error";
    return r;
  });
}

var xAsync = x(true)        // Asynchronous xtrudr instance

  .require({foo: asyncFoo});

xAsync({foo: "baz"})
  .then(function(x){        // Resolves to the populated xtrudr inst
    console.log(x.err);     // => {foo: ["error"]}
  });

xAsync({foo: 1})
  .then(function(x){
    console.log(x.out);     // => {foo: 2}
  });
```

### The xtrudr instance

This library performs object validation/sanitization/transformation
via the use of configurable functions called **xtrudr** instances.
An instance is called with an input object as the only argument which
it uses to populate the `inp`, `out`, `err` properties of itself (the
instance) for the most recent invocation.

#### Instantiation

**xtrudr** instances are instantiated by the factory function that is 
the root object of the library.  They can be either synchronous or 
asynchronous.  The default is sync, while async instances can be 
created by passing a truthy argument to the factory function:

```javascript
var x = require('xtrudr');

var syncInst = x();

var asyncInst = x(true);
```

The difference in usage between the two types of is discussed later in
the invocation section.

#### Invocation

```javascript
var x = xtrudr();                      // instantiate sync xtrudr

x.permit(...).require(...).add(...);   // configure instance

x(input)  // => returns the instance   // invoke xtrudr on input obj


x = xtrudr(true)                       // async xtrudr instance

  .permit(...).require(...).add(...);  // configuration

x(input).then(function(r){...});       // r is the populated instance 
```

An **xtrudr** instance is a function that takes an object as input and
uses it to populate three of its own (the instance's) properties:

* `inp`: The original input object given to the last invocation of the
  instance.
* `out`: An output object with properties derived from the input.
* `err`: An object (typically) keyed by the properties of the input 
  object with arrays of error messages as values.

These properties are cleared and repopulated during every invocation.
The resulting `out` and `err` properties depend on how the **xtrudr**
instance was configured.

If the instance is synchronous, then the return value of the
invocation is the instance itself with populated properties.  If 
asynchronous, then the return value is a **q** promise that resolves 
to the populated instance.

#### Configuration

An **xtrudr** instance can be configured with any number of calls to
three chainable methods: 

* `permit()`: Allows properties in the input object to be assigned to
  the `out` property, potentially running validation logic if the 
  property is present.
* `require()`: Requires properties in the input object, adding an 
  error message (default `"is required"`) if that property is missing.
  It can also attach validation logic if it is present.
* `add()`: Adds a validation method to the **xtrudr** instance that
  has access to the `inp`, `out`, and `err` properties of the instance
  via the `this` variable.  

Both the `permit()` and `require()` methods take either a variable 
strings or an object as arguments.  When provided a string, this 
configures the **xtrudr** instance to assign the input object's
property of that name to the `out` object's property.

An object argument provided to `permit()` or `require()` is a mapping 
of input property names to validator functions.  Validator functions
must take the named input object's property value as their only 
argument and either return a value or throw a *non-`Error`* class 
error.  If a value is returned then that  value gets placed in the 
**xtrudr** instance's `out` object.  An `undefined` return value (no 
return statement) is treated the same as returning the input of the 
function.  If the function throws a value (usually a string), then 
that value gets appended to the error array for the named input.

Asynchronous validator functions return a promise with resolve/reject
behavior that is analogous to the synchronous functions.

The `add` method adds a validator method to the instance.  A validator
method is invoked as a method of the **xtrudr** instance when the
instance itself is invoked, and is intended allow arbitrary logic
to operate on the `inp`, `out`, and `err` instance properties.  This
is useful for cases when there is validation that depends on multiple
input properties.
