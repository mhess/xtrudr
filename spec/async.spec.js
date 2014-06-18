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

describe('Async API', function(){

  ['permit', 'require'].forEach(function(meth){

    describe('#'+meth+'()', function(){

      describe('with str arg', function(){
        var name = 'foo';
        var myXtrudr = x(true)[meth](name);

        it('should simply pass parameter through', function(){
          var inp = {};
          inp[name] = 1;
          return myXtrudr(inp).then(function(r){
            xpect(r, inp, inp);
          });
        });

        if ( meth === 'permit' ) {
          it('should not populate anything if missing', function(){
            var inp = {baz:1};
            return myXtrudr(inp).then(function(r){
              xpect(r, inp, {});
            });
          });
        } else {
          it('should assign error for missing', function(){
            var inp = {baz:1};
            return myXtrudr(inp).then(function(r){
              xpect(r, inp, {}, {foo:['is required']});
            });
          });
        }
      });

      describe('with array arg', function(){

        var myXtrudr = x(true)[meth](['foo', 'baz']);

        it('should allow all names in array', function(){
          var inp = {foo:1, baz:2, zab: 3};
          return myXtrudr(inp).then(function(r){
            xpect(r, inp, {foo:1, baz:2});
          });
        });

        if ( meth === 'permit' ) {
          it('should not populate anything if missing', function(){
            var inp = {zab: 3};
            return myXtrudr(inp).then(function(r){
              xpect(r, inp, {});
            });
          });
        } else {
          it('should assign errors for missing', function(){
            var inp = {zab: 3};
            return myXtrudr(inp).then(function(r){
              xpect(r, inp, {}, {
                foo:['is required'],
                baz:['is required']
              });
            });
          });
        }

      });

      describe('with obj arg and validator', function(){
        var inp = {foo: 1},
            myXtrudr = x(true)[meth]({foo: syncOkFn});

        beforeEach(reset);

        if ( meth === 'permit' ) {
          it('should not populate anything if missing', function(){
            var inp = {baz:1};
            return myXtrudr(inp).then(function(r){
              xpect(r, inp, {});
            });
          });
        } else {
          it('should assign error for missing', function(){
            var inp = {baz:1};
            return myXtrudr(inp).then(function(r){
              xpect(r, inp, {}, {foo:['is required']});
            });
          });
        }

        it('should call function and assign result', function(){
          return myXtrudr(inp).then(function(r){
            expect(syncOkFn.count).to.equal(1);
            xpect(r, inp, {foo:2});
          });
        });

        it('should call function and assign error', function(){
          return x(true)[meth]({foo: syncErrFn})(inp)
            .then(function(r){
              expect(syncErrFn.count).to.equal(1);
              xpect(r, inp, {}, {foo:[0]});
            });
        });
      });
    });
  });

/* 

TARGETS:

  async xtrudr with:
  
    * simple sync require/permit
    * required error and sync/async errors
    * async and sync validator errors
    * no errors

*/

  describe('combined sync/async single validator fns', function(){

    function asyncCondFn(i){
      return function(j){
        return j < i ? q(j+1) : q.reject(-j-1);
      };
    }

    function syncCondFn(i){
      return function(j){
        if ( j < i ) return j+1;
        throw -j-1;
      };
    }

    var myInst = x(true)
      .require('foo')
      .require({
        sync: syncCondFn(1),
        async1: asyncCondFn(2),
        async2: asyncCondFn(3)
      });

    it('should assign all sync and async errs', function(){
      var inp = {sync: 1, async1: 2, async2: 3};
      return myInst(inp).then(function(r){
        xpect(r, inp, {}, {
          foo: [x.defaultMsgs.required],
          sync: [-2],
          async1: [-3],
          async2: [-4]
        });
      });
    });

    it('should handle valid sync and invalid async', function(){
      var inp = {foo: 1, sync: 0, async1: 2, async2: 3};
      return myInst(inp).then(function(r){
        xpect(r, inp, {foo:1, sync:1}, {async1:[-3], async2:[-4]});
      });
    });

    it('should handle invalid sync and valid async', function(){
      var inp = {foo:1, sync: 1, async1: 1, async2: 2};
      return myInst(inp).then(function(r){
        xpect(r, inp, {foo:1, async1: 2, async2: 3}, {sync: [-2]});
      });
    });

    it('should handle valid sync and async', function(){
      var inp = {foo:1, sync: 0, async1: 1, async2: 2};
      return myInst(inp).then(function(r){
        xpect(r, inp, {foo:1, sync:1, async1: 2, async2: 3});
      });
    });
  });

  describe('#add()', function(){
    var props,
      checkNamed = false, namedDefered = q.defer(),
      checkGeneral = false, generalDefered = q.defer();
    var myInst = x(true)
      .permit({
        foo: function(){
          checkGeneral = generalDefered.promise.isFulfilled();
          namedDefered.resolve(1);
          return namedDefered.promise;
        }
      })
      .require('baz') // needed to keep `err` property defined
      .add(function(inp, out, err){
        props = {inp:inp, out:out, err:err};
        checkNamed = namedDefered.promise.isFulfilled();
        generalDefered.resolve(1);
        return generalDefered.promise;
      });

    before(function(){
      return myInst({foo:1});
    });

    it('should get access to instance props', function(){
      _.forEach(props, function(p, n){
        expect(myInst[n]).to.equal(p);
      });
    });

    it('should be executed after named validators', function(){
      expect(checkNamed).to.be.true;
      expect(checkGeneral).to.be.false;
    });
  });

});


  // describe('#require() with validator as', function(){

  //   describe('array of fns', function(){

  //     function bazFn(i){ if (!i) throw "baz"; }
  //     function zabFn(i){ if (!i) throw "zab"; }
  //     function lastFn(){ return 'baz'; }
      
  //     var myXtrudr = x(true).require({
  //       foo: [syncOkFn, bazFn, zabFn, lastFn]
  //     });

  //     beforeEach(reset);

  //     it('should use value returned by last fn', function(){
  //       var inp = {foo: 1};
  //       expect(myXtrudr(inp), inp, {foo: 'baz'});
  //       expect(syncOkFn.count).to.equal(1);
  //     });

  //     it('should concatenate and assign errs', function(){
  //       var inp = {foo: 0};
  //       expect(myXtrudr(inp), inp, {}, {foo:['baz', 'zab']});
  //       expect(syncOkFn.count).to.equal(1);
  //     });
  //   });

  //   describe('chainable obj', function(){
  //     var myXtrudr = x(true).require({
  //       foo: x.isLength(2,2).msg(1).isInt().msg(2).toString().toInt()
  //     });

  //     it('should assign custom err msgs', function(){
  //       var inp = {foo: 'a'};
  //       xpect(myXtrudr(inp), inp, {}, {foo: [1,2]});

  //       inp = {foo: 1};
  //       xpect(myXtrudr(inp), inp, {}, {foo: [1]});

  //       inp = {foo: 'ab'};
  //       xpect(myXtrudr(inp), inp, {}, {foo: [2]});
  //     });

  //     it('should transform with final sanitizer', function(){
  //       var inp = {foo: '12'};
  //       xpect(myXtrudr(inp), inp, {foo: 12});
  //     });
  //   });
  // });
