var rewire = require('rewire'),
    val    = require('validator'),
    _      = require('lodash'),
    expect = require('chai').expect;

var validators = rewire('../lib/validators');

describe('convert', function(){
  var mockExports = {},
      convert = validators.__get__('convert').bind(mockExports),
      defaultMsgs = validators.__get__('defaultMsgs');

  describe('isEmail()', function(){
    var name = 'isEmail';
    convert(val[name], name);
    var valFn, cfgFn = mockExports[name];

    beforeEach(function(){ valFn = cfgFn(); });

    it('should assign config fn', function(){
      expect(cfgFn).to.be.instanceOf(Function);
      expect(valFn).to.be.instanceOf(Function);
      expect(valFn).to.have.ownProperty('msg');
    });

    it('should throw default msg for invalid email', function(){
      expect(function(){valFn('foo');}).to.throw(defaultMsgs[name]);
    });

    it('should return undefined for valid email', function(){
      expect(valFn('foo@baz.com')).to.be.undefined;
    });

    it('should allow msg update', function(){
      var myMsg = 'custom';
      valFn.msg(myMsg);
      expect(valFn).to.throw(myMsg);
    });
  });

  describe('equals()', function(){
    var name = 'equals';
    convert(val[name], name);
    var valFn, cfgFn = mockExports[name],
        cfgParam = 'foo';

    beforeEach(function(){ valFn = cfgFn(cfgParam); });

    it('should assign config fn', function(){
      expect(cfgFn).to.be.instanceOf(Function);
      expect(valFn).to.be.instanceOf(Function);
      expect(valFn).to.have.ownProperty('msg');
    });

    it('should throw default msg for non-equal', function(){
      var defMsg = defaultMsgs[name]([null, cfgParam]);
      expect(function(){valFn('baz');}).to.throw(defMsg);
    });

    it('should return undefined for equal', function(){
      expect(valFn(cfgParam)).to.be.undefined;
    });

    it('should allow msg update', function(){
      var myMsg = 'custom';
      valFn.msg(myMsg);
      expect(valFn).to.throw(myMsg);
    });
  });

  describe('isLength()', function(){
    var name = 'isLength';
    convert(val[name], name);
    var cfgFn = mockExports[name],
        min = 2, max = 3;

    it('should assign config fn', function(){
      var valFn = cfgFn(min);
      expect(cfgFn).to.be.instanceOf(Function);
      expect(valFn).to.be.instanceOf(Function);
      expect(valFn).to.have.ownProperty('msg');
    });

    it('should throw default msg for invalid length', function(){
      var valFn = cfgFn(min),
          defMsg = defaultMsgs[name]([null, min]);
      expect(function(){valFn('a');}).to.throw(defMsg);
      valFn = cfgFn(min, max);
      defMsg = defaultMsgs[name]([null, min, max]);
      expect(function(){valFn('abcd');}).to.throw(defMsg);
    });

    it('should return undefined for length', function(){
      expect(cfgFn(min)('abc')).to.be.undefined;
    });

    it('should allow msg update', function(){
      var myMsg = 'custom';
      cfgFn(min)().msg(myMsg);
      expect(valFn).to.throw(myMsg);
    });
  });

  describe('toInt()', function(){
    var name = 'toInt';
    convert(val[name], name);
    var cfgFn = mockExports[name];
        valFn = cfgFn(10);

    it('should assign config fn', function(){
      expect(cfgFn).to.be.instanceOf(Function);
      expect(valFn).to.be.instanceOf(Function);
      expect(valFn).to.have.ownProperty('msg');
    });

    it('should return NaN for invalid int', function(){
      expect(valFn('a')).to.deep.equal(NaN);
    });

    it('should return int for valid int', function(){
      expect(valFn(1)).to.equal(1);
    });
  });

});