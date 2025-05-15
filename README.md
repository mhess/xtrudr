# xtrudr.js

A flexible JavaScript object validator for node.js.

### Usage

```javascript
var xtrudr = require('xtrudr');

// Validator functions

function validBaz(i){ if( i!=='baz' ) throw "not baz"; }

function validOof(i){ 
  if( i!=='oof' ) throw "not oof";
  return 3;
}

// Synchronous xtrudr instance.

var x = xtrudr()
  .permit('foo')
  .permit({baz: validBaz}})
  .require('zab')
  .require({oof: validOof});

var errInput = {baz: 'nope', oof: 'oof'};

x(errInput).err  // => {baz: ["not baz"], zab: ["is required"]}

x.out            // => {oof: 3}

var goodInput = {foo: 1, baz: 'baz', zab: 2, oof: 'oof'};

x(goodInput).err // => undefined

x.out            // => {foo:1, baz: 'baz', zab: 2, oof: 3}

```