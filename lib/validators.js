var validator = require('validator'),
    _         = require('lodash'),
    fmt       = require('util').format;

function arg2arr(arg){ return Array.prototype.slice.call(arg); }

function setMsg(m){ this.theMsg = m; return this; }

var defaultMsgs = {
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
      "must be greater than "+args[1]-1 :
      fmt("must be between %s and %s", args[1], args[2]);
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
  isJSON: 'invalid json',
  isMultibyte: 'must be multi-byte',
  isAscii: 'must be ascii',
  isFullWidth: undefined,
  isHalfWidth: undefined,
  isVariableWidth: undefined,
  isSurrogatePair: undefined
};

var nonValidators = {version:1, extend:1, init:1, escape:1};

function convert(fn, name){
  this[name] = function(){
    var cfg = arg2arr(arguments),
        bool = defaultMsgs.hasOwnProperty(name);
    var valFn = function(i){
      var args = _.clone(cfg);
      args.unshift(i);
      var res = fn.apply(null, args);
      if ( !bool ) return res;
      if ( res ) return;
      var msg = valFn.theMsg;
      throw _.isFunction( msg ) ? msg(args) : msg;
    };
    valFn.msg = setMsg;
    valFn.msg(defaultMsgs[name]);
    return valFn;
  };
}

_(_.pick(validator,
  function(p, name){return !nonValidators[name];}
)).forEach(convert, exports);