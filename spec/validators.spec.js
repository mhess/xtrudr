var rewire = require('rewire'),
    val    = require('validator'),
    _      = require('lodash'),
    expect = require('chai').expect;

var validators = rewire('../lib/validators');

describe('convert', function(){
  var mockExports = {},
      convert = validators.__get__('convertObj').bind(mockExports),
      defaultMsgs = validators.__get__('defaultMsgs');

  function myConvert(name){
    convert(val[name], name);
    var cfgFn = mockExports[name];
    return cfgFn.bind(mockExports);
  }

  describe('in general', function(){

    it('should produce a cfg fn', function(){
      var cfgFn = myConvert('isEmail');
      expect(cfgFn).to.be.instanceOf(Function);
    });

    it('should produce chainable objects', function(){
      var valObj = myConvert('isEmail')();
          fns = valObj._fns;
      expect(fns).to.be.instanceOf(Array);
      expect(fns).to.have.length(1);
      expect(fns[0]).to.be.instanceOf(Function);
      expect(mockExports.isPrototypeOf(valObj)).to.be.true;
      valObj.isLength(3);
      expect(fns).to.have.length(2);
      expect(fns[1]).to.be.instanceOf(Function);
    });

  });

  describe('isEmail()', function(){
    var name = 'isEmail';
    var valFn, cfgFn = myConvert(name);

    beforeEach(function(){
      valObj = cfgFn();
      valFn = valObj._fns[0];
    });

    it('should throw default msg for invalid email', function(){
      expect(function(){valFn('foo');}).to.throw(defaultMsgs[name]);
    });

    it('should return undefined for valid email', function(){
      expect(valFn('foo@baz.com')).to.be.undefined;
    });

    it('should allow msg update', function(){
      var myMsg = 'custom';
      valObj.msg(myMsg);
      expect(valFn).to.throw(myMsg);
    });
  });

  describe('equals()', function(){
    var name = 'equals';
    var valFn, cfgFn = myConvert(name),
        cfgParam = 'foo';

    beforeEach(function(){
      valObj = cfgFn(cfgParam);
      valFn = valObj._fns[0];
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
      valObj.msg(myMsg);
      expect(valFn).to.throw(myMsg);
    });
  });

  describe('isLength()', function(){
    var name = 'isLength';
    var cfgFn = myConvert(name),
        min = 2, max = 3;

    it('should throw default msg for invalid length', function(){
      var valFn = cfgFn(min)._fns[0],
          defMsg = defaultMsgs[name]([null, min]);
      expect(function(){valFn('a');}).to.throw(defMsg);
      valFn = cfgFn(min, max)._fns[0];
      defMsg = defaultMsgs[name]([null, min, max]);
      expect(function(){valFn('abcd');}).to.throw(defMsg);
    });

    it('should return undefined for valid length', function(){
      expect(cfgFn(min)._fns[0]('abc')).to.be.undefined;
    });

    it('should allow msg update', function(){
      var myMsg = 'custom';
          valObj = cfgFn(min).msg(myMsg);
      expect(valObj._fns[0]).to.throw(myMsg);
    });
  });

  describe('toInt()', function(){
    var cfgFn = myConvert('toInt'),
        valFn = cfgFn(10)._fns[0];

    it('should return NaN for invalid int', function(){
      expect(valFn('a')).to.deep.equal(NaN);
    });

    it('should return int for valid int', function(){
      expect(valFn(1)).to.equal(1);
    });
  });

  describe('defaultMsgs fn for', function(){
    
    var dm = validators.defaultMsgs,
        now = new Date();

    it('contains works', function(){
      expect(dm.contains([null, 1])).to.equal('must contain 1');
    });

    it('matches works',function(){
      expect(dm.matches([null, /p/]))
      .to.equal('must match pattern /p/');
    });

    it('isDivisibleBy works', function(){
      expect(dm.isDivisibleBy([null, 3]))
      .to.equal('must be divisible by 3');
    });

    describe('isByteLength', function(){
      it('should do just min', function(){
        expect(dm.isByteLength([null, 1]))
        .to.equal("byte length must be greater than 1");
      });

      it('should do max/min', function(){
        expect(dm.isByteLength([null, 1, 2]))
        .to.equal("byte length must be between 1 and 2");
      });
    });

    it('isUUID works', function(){
      expect(dm.isUUID([null, 1])).to.equal('invalid v1 UUID');
    });

    it('isAfter works', function(){
      expect(dm.isAfter([null, now])).to.equal('must be after '+now);
    });

    it('isBefore works', function(){
      expect(dm.isBefore([null, now]))
      .to.equal('must be before '+now);
    });
  });

});