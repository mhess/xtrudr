var _ = require('lodash');

try { var q = require('q'); } catch (e) {}

function arg2arr(arg){ return Array.prototype.slice.call(arg); }

function arrAdd(obj, name, item){
  if ( obj[name] ) obj[name].push(item);
  else obj[name] = [item];
}

function handleErr(name, e){
  if ( e instanceof Error ) throw e;
  if ( e === undefined ) return;
  arrAdd(this.err, name, e);
}

/**
 *  Wrapper for the validator function `fn` that handles sync or async
 *  err/out population of the xtruder instance.  The `fn` argument may 
 *  be undefined, in which case the `val` is simply assigned to 
 *  `that.out[name]`.
 */
function runValFun(that, name, val, fn){

  var handleErrForName = handleErr.bind(that, name),
      errFlag = false;

  if ( _.isFunction(fn) ) fns = [fn];
  else if ( !fn ) fns = [];
  else if ( _.isArray(fn) ) fns = fn;
  else fns = fn._fns;
  
  if ( that.async ){
    return q.all(
      fns.map(function(validator){
      // validator may be synchronous
        return q.fcall(validator, val).catch(function(e){
          errFlag = true;
          handleErrForName(e);
        });
    }))
    .then(function(results){
      if ( errFlag ) return;
      var r = results[results.length-1];
      that.out[name] = r===undefined ? val : r;
    });
  } else {
    var res = fns.reduce(function(unused, validator){
      try {
        return validator(val);
      } catch (e) {
        errFlag = true;
        handleErrForName(e);
      }
    }, val);
    if ( !errFlag ) that.out[name] = res===undefined ? val : res;
  }
}

/**
 *  Attaches a validator function `fn` for a required parameter as a 
 *  validator method on the xtrudr instance.
 */
function addRequired(fn, name){
  this.named[name] = function(){
    var value = this.inp[name];
    if ( value===undefined )
      this.err[name] = ['is required'];
    else return runValFun(this, name, value, fn);
  }.bind(this);
}

/**
 *  Attaches a validator function `fn` for a permitted parameter as a 
 *  validator method on the xtrudr instance.
 */
function addPermitted(fn, name){
  this.named[name] = function(){
    var value = this.inp[name];
    if ( value!==undefined )
      return runValFun(this, name, value, fn);
  }.bind(this);
}

/**
 *  Wraps the `addFn` function with logic to handle all the different
 *  argument types/styles that might be passed to the `permit` or
 *  `require` xtrudr methods.
 */
function addFunFactory(addFn){
  return function(){
    var addNullFn = addFn.bind(this, null);
    arg2arr(arguments).forEach(function(arg){
      // String
      if ( typeof arg === 'string' ) addNullFn(arg);
      // Array
      else if ( _.isArray(arg) ) arg.forEach(addNullFn, this);
      // Object
      else _.forEach(arg, addFn, this);
    }, this);
    return this;
  };
}

/**
 *  Have to namespace methods in an object because `require` is a 
 *  keyword.
 */
var xtrudrMethods = {

  reset: function(){
    this.inp = {};
    this.out = {};
    this.err = {};
    return this;
  },

  add: function(fn){
    var inp = this.inp, out = this.out, err = this.err;
    arrAdd(this, 'general', fn.bind(this, inp, out, err));
    return this;
  },

  require: addFunFactory(addRequired),

  permit: addFunFactory(addPermitted)

};

function emptyErr(){
  if ( _.isEmpty(this.err) ) delete this.err;
  return this;
}

function invoke(fn){ return fn(); }

/**
 *  Need `async` parameter to ensure that a promise is returned even
 *  if a required parameter with an async validator function is 
 *  missing, since that will make the validator return synchronously.
 */
module.exports = function(async){
  var v = function(inp){
    v.reset();
    _.assign(v.inp, inp);

    var results = _.map(v.named, invoke)
      .concat(_.map(v.general, invoke));

    if ( async ) return q.all(results).then(boundEmptyErr);
    else return boundEmptyErr();

  };

  var boundEmptyErr = emptyErr.bind(v);
  
  if ( async ) v.async = true;

  v.named = v.do = {};
  v.general = [];
  return _.assign(v, xtrudrMethods).reset();
};

try {
  var validator = require('validator'),
      myValidators = require('./lib/validators');
  _.assign(module.exports, myValidators);
} catch (e) {}