# xtrudr.js

A succinct, powerful, and flexible JavaScript object validator for 
node.js.

### Quickstart Example Usage

```javascript
var xtrudr = require('xtrudr'),
    q      = require('q');   // Optional depedency only needed for
                             // async validation.

// Synchronous validator functions

function validBaz(i){ if( i!=='baz' ) throw "not baz"; }

function validOof(i){ 
  if( i!=='oof' ) throw "not oof";
  return 3;
}

// Synchronous xtrudr instance creation and configuration
var xSync = xtrudr()

  .permit('foo', 'cats')       // Allow property "foo" and "cat"

  .permit({baz: validBaz}})   // Allow "baz" and if it's present, 
                              // perform validation with validBaz

  .require('zab')             // Require property "zab"

  .require({oof: validOof});  // Require property "oof" and perform

var errInput = {baz: 'nope', oof: 'oof', cats: 1};

xSync(errInput).err  // => {baz: ["not baz"], zab: ["is required"]}

xSync.out            // => {oof: 3, cats: 1}

var goodInput = {foo: 1, baz: 'baz', zab: 2, oof: 'oof'};

xSync(goodInput).err // => undefined

xSync.out            // => {foo:1, baz: 'baz', zab: 2, oof: 3}

// Async validator function
function asyncValidFoo(i){
  return q.fcall( /* async operation */ ).then(function(r){
    if (!r) throw "error msg";
    else return r+1;
  });
}

// Asynchronous xtrudr instance
var x2 = xtrudr(true)

  .require({foo: asyncValidFoo});  // Require foo and perform async
                                   // validation with asyncValidFoo

x2({foo: "baz"})
  .then(function(x){     // Resolves to the populated xtrudr instance.
    console.log(x.err);  // => {foo: ["error msg"]}
    console.log(x.out);  // => {}
  });

x2({foo: 1})
  .then(function(x){
    console.log(x.err);  // => undefined
    console.log(x.out);  // => {foo: 2}
  });
```

### The xtrudr instance

This library performs object validation/sanitization/transformation
via the use of configurable functions called **xtrudr** instances.
An instance is called with an input object as the only argument which
it uses to populate the output (`out`) and error (`err`) properties of 
itself (the instance) for the most recent invocation.

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
  It can also potentially validation if it is present.
* `add()`: Adds a validation method to the **xtrudr** instance that
  has access to the `inp`, `out`, and `err` properties of the instance
  via the `this` variable.  

Both the `permit()` and `require()` methods take either a variable 
strings or an object as arguments.  When provided a string, this 
configures the **xtrudr** instance to assign the input object's
property of that name to the `out` object's property.

An object argument provided to `permit()` or `require()` is a mapping 
of input property names to validator functions.  Validator functions
must take the named input object's property value and either return a 
value or throw a *non-`Error`* class error.  If a value is returned 
then that  value gets placed in the **xtrudr** instance's `out` 
object.  An `undefined` return value (no return statement) is treated
the same as returning the input of the function.  If the function 
throws a value (usually a string), then that value gets appended to 
the error array for the named input.

Asynchronous validator functions return a promise with resolve/reject
behavior that is analogous to the synchronous functions.

The `add` method adds a validator method to the instance.  A validator
method is invoked as a method of the **xtrudr** instance when the
instance itself is invoked, and is intended allow arbitrary logic
to operate on the `inp`, `out`, and `err` instance properties.  This
is useful for cases when there is validation that depends on multiple
input properties.
