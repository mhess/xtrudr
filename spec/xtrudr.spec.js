var rewire = require('rewire'),
    expect = require('chai').expect,
    q      = require('q'),
    _      = require('lodash');

var x = rewire('../xtrudr');

var syncOkFn = function(inp){ syncOkFn.count++; return inp+1; },
    syncErrFn = function(inp){ syncErrFn.count++; throw inp-1; };

var asyncOkFn = function(inp){ asyncOkFn.count++; return q(inp+1);},
    asyncErrFn = function(inp){
      asyncErrFn.count++;
      return q.reject(inp-1);
    };

function reset(){
  syncOkFn.count = 0; syncErrFn.count = 0;
  asyncOkFn.count = 0; asyncErrFn.count = 0;
}

function xpect(x, inp, out, err){
  var args = arguments;
  ['inp', 'out', 'err'].forEach(function(t, i){
    expect(x[t]).to.deep.equal(args[i+1]);
  });
}

describe('Sync API', function(){
  ['permit', 'require'].forEach(function(meth){

    describe('#'+meth+'()', function(){

      describe('with str arg', function(){
        var name = 'foo';
        var myXtrudr = x()[meth](name);

        it('should simply pass parameter through', function(){
          var inp = {};
          inp[name] = 1;
          xpect(myXtrudr(inp), inp, inp);
        });

        if ( meth === 'permit' ) {
          it('should not populate anything if missing', function(){
            var inp = {baz:1};
            xpect(myXtrudr(inp), inp, {});
          });
        } else {
          it('should assign error for missing', function(){
            var inp = {baz:1};
            xpect(myXtrudr(inp), inp, {}, {foo:['is required']});
          });
        }
      });

      describe('with array arg', function(){

        var myXtrudr = x()[meth](['foo', 'baz']);

        it('should allow all names in array', function(){
          var inp = {foo:1, baz:2, zab: 3};
          xpect(myXtrudr(inp), inp, {foo:1, baz:2});
        });

        if ( meth === 'permit' ) {
          it('should not populate anything if missing', function(){
            var inp = {zab: 3};
            xpect(myXtrudr(inp), inp, {});
          });
        } else {
          it('should assign errors for missing', function(){
            var inp = {zab: 3};
            xpect(myXtrudr(inp), inp, {}, {
              foo:['is required'],
              baz:['is required']
            });
          });
        }

      });

      describe('with obj arg and validator', function(){
        var inp = {foo: 1},
            myXtrudr = x()[meth]({foo: syncOkFn});

        beforeEach(reset);

        if ( meth === 'permit' ) {
          it('should not populate anything if missing', function(){
            var inp = {baz:1};
            xpect(myXtrudr(inp), inp, {});
          });
        } else {
          it('should assign error for missing', function(){
            var inp = {baz:1};
            xpect(myXtrudr(inp), inp, {}, {foo:['is required']});
          });
        }

        it('should call function and assign result', function(){
          myXtrudr(inp);
          expect(syncOkFn.count).to.equal(1);
          xpect(myXtrudr, inp, {foo:2});
        });

        it('should call function and assign error', function(){
          var myXtrudr = x()[meth]({foo: syncErrFn})(inp);
          expect(syncErrFn.count).to.equal(1);
          xpect(myXtrudr, inp, {}, {foo:[0]});
        });
      });
    });
  });

  describe('#require() with validator as', function(){

    describe('array of fns', function(){

      function bazFn(i){ if (!i) throw "baz"; }
      function zabFn(i){ if (!i) throw "zab"; }
      function lastFn(){ return 'baz'; }
      
      var myXtrudr = x().require({
        foo: [syncOkFn, bazFn, zabFn, lastFn]
      });

      beforeEach(reset);

      it('should use value returned by last fn', function(){
        var inp = {foo: 1};
        expect(myXtrudr(inp), inp, {foo: 'baz'});
        expect(syncOkFn.count).to.equal(1);
      });

      it('should concatenate and assign errs', function(){
        var inp = {foo: 0};
        expect(myXtrudr(inp), inp, {}, {foo:['baz', 'zab']});
        expect(syncOkFn.count).to.equal(1);
      });
    });

    describe('chainable obj', function(){
      var myXtrudr = x().require({
        foo: x.isLength(2,2).msg(1).isInt().msg(2).toString().toInt()
      });

      it('should assign custom err msgs', function(){
        var inp = {foo: 'a'};
        xpect(myXtrudr(inp), inp, {}, {foo: [1,2]});

        inp = {foo: 1};
        xpect(myXtrudr(inp), inp, {}, {foo: [1]});

        inp = {foo: 'ab'};
        xpect(myXtrudr(inp), inp, {}, {foo: [2]});
      });

      it('should transform with final sanitizer', function(){
        var inp = {foo: '12'};
        xpect(myXtrudr(inp), inp, {foo: 12});
      });
    });
  });

  describe('#add()', function(){
    var props, checkNamed, checkGeneral,
        namedFlag = false, generalFlag = false;
    var myXtrudr = x()
      .permit({
        foo: function(){
          checkGeneral = generalFlag;
          namedFlag = true;
        }
      })
      .require('baz')
      .add(function(inp, out, err){
        checkNamed = namedFlag;
        generalFlag = true;
        props = {inp:inp, out:out, err:err};
      })({foo:1});

    it('should get access to instance props', function(){
      _.forEach(props, function(p, n){
        expect(myXtrudr[n]).to.equal(p);
      });
    });

    it('should be executed after named validators', function(){
      expect(checkNamed).to.be.true;
      expect(checkGeneral).to.be.false;
    });
  });

});

describe('handleErr()', function(){
  var handleErr = x.__get__('handleErr');

  it('should throw if given an Error inst', function(){
    var err = new Error('foo');
    try {
      handleErr('foo', err);
      throw "Should err!";
    } catch (e) { expect(e).to.equal(err); }
  });

  it('should create array with err', function(){
    var obj = {err:{}};
    handleErr.call(obj, 'foo', 1);
    expect(obj.err.foo).to.deep.equal([1]);
  });

  it('should concatenate errs', function(){
    var obj = {err:{foo:[1]}};
    handleErr.call(obj, 'foo', 2);
    expect(obj.err.foo).to.deep.equal([1,2]);
  });
});