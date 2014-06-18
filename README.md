# xtrudr

[![NPM version][npm-img]][npm-url]
[![Build Status][travis-img]][travis-url]
[![Coverage Status][coveralls-img]][coveralls-url]

Flexible user input validator and sanitizer utility library for
node.js.

Written originally as a "strong parameters"-like substitute for JSON
API server applications.

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

    num: x.isInt().msg('uh uh').toInt()

  })

  .add(function(inp, out, err){
    if ( err.baz ) err.errs = ["you've got them!"];
  });


// Invalid input
var input1 = {foo: 1, email: 'oops', num: "a"};

xSync(input1).err  // => {baz: ["is required"], email: ["bad email"],
                   //     num: ["uh uh"], errs: ["you've got them!"]}

xSync.inp          // => {foo: 1, email: 'oops', num: "a"}

xSync.out          // => {foo: 1}


// Valid input
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

xAsync({foo: 0}).then(function(x){
  console.log(x.err);                 // => {foo: ["error"]}
});    

xAsync({foo: 1}).then(function(x){
  console.log(x.out);                 // => {foo: 1}
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

#### Instance properties and invocation
 
The **xtrudr** instance properties populated during invocation are as
follows:

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
  the `out` property, potentially registering a validator function to
  be run if the property is present.
* `require()`: Requires properties in the input object, adding an 
  error message (default `"is required"`) if that property is missing.
  This method can also register a validator function to be executed on
  the property.
* `add()`: Registers a general validator function on the **xtrudr**
  instance.

Both the `permit()` and `require()` methods may take either strings or
objects as arguments.  When provided a string, this configures the 
**xtrudr** instance to assign the input object's property of that name
to the `out` object's property.

An object argument provided to `permit()` or `require()` is 
interpreted as a mapping of input property names to validator 
functions.  Validator functions take the named input object's property
value as their only argument and must return a value or throw a 
*non-`Error`* class value.  If a value is returned then that value
gets placed in the **xtrudr** instance's `out` object.  An 
*`undefined`* return value (no return statement) is treated the same
as returning the input of the function.  If the function throws a 
value (usually a string), then that value gets appended to the error
array for the named input.

The input object property values can also be arrays of validator
functions.  If any of the arrayed validator functions throw a value,
it will be appended to that property's error array.  If none of the
validators throw an error, the value returned by the last validator
function will be placed in the `out` object.

Asynchronous validator functions return a promise with resolve/reject
behavior that is analogous to the synchronous functions.

The `add()` method registers a general validator function on the
instance that gets invoked with the instance invocation's `inp`, 
`out`, and `err` properties as arguments.  General validator functions
are invoked *after* all validator functions registered with the 
`permit`and `require` methods, and in the order which they are 
registered to the instance.  For async **xtrudr** instances, the
return value of general validator function must be a promise if the
function performs async operations; however, the resolve/reject values
of that promise are not used for anything.  General validator
functions are useful for cases when there is validation that depends
on multiple input properties.

### validator.js Convenience Methods

If the **validator.js** library is installed, the **xtrudr** library
will include a set of chainable methods that wrap the validator and
sanitzer functions provided by the **validator.js** library.  They can
be used anywhere a validator function is accepted.

```javascript
var x = require('xtrudr'),
    today = new Date(),
    oneWeek = new Date(Date.now()+7*24*60*60*1000);

x.defaultMsgs.isBefore = 'too early';

var inst = x()
  
  .require({

    name: x.isLength(2,4).msg(function(args){
      return args[1].length>4 ? "too big" : "too small";
    }),

    reserve: x.isDate().isBefore(today)
      .isAfter(oneWeek).msg('too late').toDate()

  });

var inp1 = {name: 'f', reserve: 'today'};

inst(inp1).err  // => { name: ['too small'], 
                //      reserve: ['invalid date'] }

var inp2 = {name: 'foobaz', reserve: '2014-06-07'};

// If today was the 9th of June, 2014
inst(inp2).err  // => { name: ['too big'],
                //      reservation: ['too early'] }

var inp3 = {name: 'foo', reservation: '2014-06-10'};

inst(inp3).err  // => undefined

inst.out  // => { name: 'foo', 
          //      reserve: Tue Jun 10 2014 00:00:00 GMT-0700 (PDT) }
```

The default error messages for the **validator.js** functions live in
the `defaultMsgs` property of the **xtrudr** library and can be 
modified.  The values of these properties can be either strings or
functions that take an array of the input arguments to the validator
function as the only argument and return a value to be added to the
validated property's error array.

The `msg()` method changes the error message for the single instance
of the validator function registered by the previous method call.

[npm-url]: https://npmjs.org/package/xtrudr
[npm-img]: http://img.shields.io/npm/v/xtrudr.svg
[travis-url]: https://travis-ci.org/mhess/xtrudr
[travis-img]: http://img.shields.io/travis/mhess/xtrudr.svg
[coveralls-url]: https://coveralls.io/r/mhess/xtrudr
[coveralls-img]: https://img.shields.io/coveralls/mhess/xtrudr.svg