var _ = require('lodash');

try { var q = require('q'); } catch (e) {}

function arg2arr(arg){ return Array.prototype.slice.call(arg); }

function handleErr(name, e){
  if ( e instanceof Error ) throw e;
  this.err[name] = _.isArray(e) ? e : [e];
}

/**
 *  Handles sync or async err/out population of the xtruder object for 
 *  a validator function `fn`.  The `fn` argument may be undefined,
 *  in which case the `val` is simply assigned to `thisArg.out.name`.
 */
function runValFun(thisArg, name, val, fn){
  try {
    var res = fn ? fn(val) : val;
  } catch (e) {
    return handleErr.call(thisArg, name, e);
  }
  if ( thisArg.async ) {
    return q(res).then(
      function(r){thisArg.out[name] = r;},
      handleErr.bind(thisArg, name)
    );
  }
  thisArg.out[name] = res;
}

/**
 *  Attaches a validator function `fn` for a required parameter as a 
 *  validator method on the xtrudr object.
 */
function addRequired(fn, name){
  this.meths[name] = function(){
    var value = this.inp[name];
    if ( value===undefined )
      this.err[name] = ['is required'];
    else return runValFun(this, name, value, fn);
  }.bind(this);
}

/**
 *  Attaches a validator function `fn` for a permitted parameter as a 
 *  validator method on the xtrudr object.
 */
function addPermitted(fn, name){
  this.meths[name] = function(){
    var value = this.inp[name];
    if ( value!==undefined )
      return runValFun(this, name, value, fn);
  }.bind(this);
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

  add: function(methods){
    _.forEach(methods, function(method, name){
      that.meths[name] = method.bind(this);
    }, this);
    return that;
  },

  require: function(){
    var that = this;
    arg2arr(arguments).forEach(function(arg){
      if ( typeof arg === 'string' )
        addRequired.call(that, null, arg);
      else _.forEach(arg, addRequired, that);
    });
    return that;
  },

  permit: function(){
    var that = this;
    arg2arr(arguments).forEach(function(arg){
      if ( typeof arg === 'string' )
        addPermitted.call(that, null, arg);
      else _.forEach(arg, addPermitted, that);
    });
    return that;
  }
};

/**
 *  Need `async` parameter to ensure that a promise is returned even
 *  if a required parameter with an async validator function is 
 *  missing.
 */
module.exports = function(async){
  var v = function(inp){
    v.reset();
    _.assign(v.inp, inp);

    var results = _.map(v.meths, function(meth){ return meth(); });

    return async ? q.all(results).thenResolve(v) : v;

  };
  
  if ( async ) v.async = true;

  v.meths = v.do = {};
  _.assign(v, xtrudrMethods);
  return v.reset();
};