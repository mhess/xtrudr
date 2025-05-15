var validator = require('validator'),
    _         = require('lodash'),
    fmt       = require('util').format;

function arg2arr(arg){ return Array.prototype.slice.call(arg); }

var defaultMsgs = exports.defaultMsgs = {
  equals: function(args){ return 'must equal '+ args[1]; },
  contains: function(args){ return 'must contain '+ args[1]; },
  matches: function(args){ return 'must match pattern '+ args[1]; },
  isEmail: 'invalid email',
  isURL: 'invalid URL',
  isIP: 'invalid IP address',
  isAlpha: 'must be alpha',
  isNumeric: 'must be numeric',
  isAlphanumeric: 'must be alphanumeric',
  isHexadecimal: 'must be hex',
  isHexColor: 'must be hex color',
  isLowercase: 'must be lowercase',
  isUppercase: 'must be uppercase',
  isInt: 'must be int',
  isFloat: 'must be float',
  isDivisibleBy: function(args){
    return 'must be divisible by '+args[1];
  },
  isNull: 'must be null',
  isLength: function(args){
    return args.length===2 ?
      fmt("must be at least %s chars", (args[1])) :
      fmt("must be between %s and %s chars", args[1], args[2]);
  },
  isByteLength: function(args){
    return args.length===2 ?
      "byte length must be greater than "+ args[1] :
      fmt("byte length must be between %s and %s", args[1], args[2]);
  },
  isUUID: function(args){
    return fmt('invalid v%s UUID', args[1]);
  },
  isDate: 'invalid date',
  isAfter: function(args){return fmt('must be after %s', args[1]);},
  isBefore: function(args){return fmt('must be before %s', args[1]);},
  isIn: 'invalid',
  isCreditCard: 'invalid card number',
  isISBN: 'invalid ISBN',
  isJSON: 'invalid JSON',
  isMultibyte: 'must be multi-byte',
  isAscii: 'must be ASCII',
  isFullWidth: undefined,
  isHalfWidth: undefined,
  isVariableWidth: undefined,
  isSurrogatePair: undefined
};

function setMsgObj(m){
  var fns = this._fns;
  fns[fns.length-1].theMsg = m;
  return this;
}

function next(fn){ this._fns.push(fn); return this; }

function convertObj(fn, name){
  this[name] = function(){

    var cfg = arg2arr(arguments),
        bool = defaultMsgs.hasOwnProperty(name);

    var valFn = function(i){
      var args = _.clone(cfg);
      args.unshift(i);
      var res = fn.apply(null, args);
      if ( !bool ) return res;
      if ( res===false ) {
        var msg = valFn.hasOwnProperty('theMsg') ?
          valFn.theMsg : defaultMsgs[name];
        throw _.isFunction( msg ) ? msg(args) : msg;
      }
    };

    if ( this.hasOwnProperty('_fns') ) {
      this._fns.push(valFn);
      return this;
    } else {
      var accum = Object.create(this);
      accum._fns = [valFn];
      accum.msg = setMsgObj;
      accum.next = next;
      return accum;
    }
  };
}

var nonValidators = ['version', 'extend', 'init', 'escape'];

var fns = exports.fns = {};

_.forEach(_.omit(validator, nonValidators), convertObj, fns);