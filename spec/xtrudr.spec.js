var rewire = require('rewire'),
    expect = require('chai').expect,
    q      = require('q');

var xtrudr = rewire('../xtrudr');

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

describe('#permit()', function(){

  describe('with str arg', function(){
    var name = 'foo';
    var myXtrudr = xtrudr().permit(name);

    it('should simply pass parameter through', function(){
      var inp = {};
      inp[name] = 1;
      xpect(myXtrudr(inp), inp, inp);
    });

    it('should not poplate anything if missing', function(){
      var inp = {baz:1};
      xpect(myXtrudr(inp), inp, {});
    });

  });

  describe('with array arg', function(){

    it('should permit all names in array', function(){
      var myXtrudr = xtrudr().permit(['foo', 'baz']),
          inp = {foo:1, baz:2, zab: 3};
      xpect(myXtrudr(inp), inp, {foo:1,baz:2});
    });

  });

  describe('with obj arg', function(){

    describe('and sync function', function(){

      var inp = {foo: 1},
          myXtrudr = xtrudr();

      beforeEach(reset);

      it('should call function and assign result', function(){
        var inp = {foo: 1};
        myXtrudr.permit({foo: syncOkFn})(inp);
        expect(syncOkFn.count).to.equal(1);
        xpect(myXtrudr, inp, {foo:2});
      });

      it('should run function and assign error', function(){
        var inp = {foo: 1};
        myXtrudr.permit({foo: syncErrFn})(inp);
        expect(syncErrFn.count).to.equal(1);
        xpect(myXtrudr, inp, {}, {foo:[0]});
      });

    });

    describe('and async function', function(){

      var myXtrudr;
      beforeEach(function(){ reset(); myXtrudr = xtrudr(true); });

      it('should assign result and return promise', function(done){
        var inp = {foo: 1},
            res = myXtrudr.permit({foo: asyncOkFn})(inp);
        expect(q.isPromise(res)).to.be.true;
        res.done(function(x){
          expect(asyncOkFn.count).to.equal(1);
          xpect(myXtrudr, inp, {foo:2});
          done();
        });

      });

      it('should do nothing and return promise', function(done){
        var res = myXtrudr.permit({foo: asyncOkFn})({});
        expect(q.isPromise(res)).to.be.true;
        res.done(function(x){
          expect(asyncOkFn.count).to.equal(0);
          xpect(myXtrudr, {}, {});
          done();
        });
      });

      it('should assign err and return promise', function(){

      });

    });
  });
});

describe('#require()', function(){

  describe('with str argument', function(){

    var name = 'foo';
    var myXtrudr = xtrudr().require(name);

    it('should simply pass parameter through', function(){
      var inp = {foo:1};
      myXtrudr(inp);
      expect(myXtrudr.out).to.deep.equal(inp);
      expect(myXtrudr.err).to.be.undefined;
    });

    it('should populate err if parameter is missing', function(){
      myXtrudr({});
      expect(myXtrudr.out).to.deep.equal({});
      expect(myXtrudr.err).to.deep.equal({foo:['is required']});
    });
  });

  describe('with obj argument', function(){

    describe('and sync function', function(){

      beforeEach(reset);
      var myXtrudr = xtrudr();

      it('should call function and assign result', function(){
        var inp = {foo: 1};
        myXtrudr.require({foo: syncOkFn})(inp);
        expect(syncOkFn.count).to.equal(1);
        expect(myXtrudr.out.foo).to.equal(2);
        expect(myXtrudr.err).to.be.undefined;
      });

      it('should populate err if parameter is missing', function(){
        myXtrudr.require({foo: syncErrFn})({});
        expect(myXtrudr.out).to.deep.equal({});
        expect(myXtrudr.err).to.deep.equal({foo:['is required']});
      });

    });

    describe('and async function', function(){

      var myXtrudr;
      beforeEach(function(){ reset(); myXtrudr = xtrudr(true); });

      it('should assign result and return promise', function(done){
        var inp = {foo:1},
            res = myXtrudr.require({foo: asyncOkFn})(inp);
        expect(q.isPromise(res)).to.be.true;
        res.done(function(x){
          expect(x).to.equal(myXtrudr);
          expect(x.err).to.be.undefined;
          expect(x.out.foo).to.equal(2);
          done();
        });
      });

      it('should assign err if missing and return prom', function(done){
        var res = myXtrudr.require({foo: asyncOkFn})({});
        expect(q.isPromise(res)).to.be.true;
        res.done(function(x){
          expect(x).to.equal(myXtrudr);
          expect(x.err.foo).to.deep.equal(['is required']);
          expect(x.out).to.deep.equal({});
          done();
        });
      });

      it('should assign err thrown by fn and return prom', function(done){
        var res = myXtrudr.require({foo: asyncErrFn})({foo:1});
        expect(q.isPromise(res)).to.be.true;
        res.done(function(x){
          expect(x).to.equal(myXtrudr);
          expect(x.err.foo).to.deep.equal([0]);
          expect(x.out).to.deep.equal({});
          done();
        });
      });
    });

  });
});

describe('handleErr()', function(){
  var handleErr = xtrudr.__get__('handleErr');

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

describe("runValFun()", function(){

  var runValFun = xtrudr.__get__('runValFun'),
      myXtrudr, expInp = {}, expOut = {},
      name = 'foo', inp = 1;
      expInp[name] = inp;
      expOut[name] = syncOkFn(inp);

  beforeEach(function(){ reset(); });

  describe('with sync xtrudr', function(){

    function run(fns){
      var res = runValFun(myXtrudr, name, inp, fns);
      expect(res).to.be.undefined;
    }

    beforeEach(function(){ myXtrudr = xtrudr(); });

    it('should assign fn output to xtrudr.out', function(){
      run(syncOkFn);
      xpect(myXtrudr, {}, expOut, {});
    });

    it('should assign thrown err to xtrudr.err', function(){
      run(syncErrFn);
      xpect(myXtrudr, {}, {}, {foo: [0]});
    });

    it('should assign to out if fn returns nothing', function(){
      run(function(){});
      xpect(myXtrudr, {}, expInp, {});
    });

    it('should assign input if no fn', function(){
      run();
      xpect(myXtrudr, {}, expInp, {});
    });

    describe('with multiple fns', function(){
      
      it('should call all fns and only assign last val', function(){
        function second(i){return i+2;}
        run([syncOkFn, second]);
        expect(syncOkFn.count).to.equal(1);
        xpect(myXtrudr, {}, {foo:3}, {});
      });

      it('should concatenate errs and not assign out', function(){
        var fns = [syncOkFn, syncErrFn, syncErrFn];
        run(fns);
        expect(syncOkFn.count).to.equal(1);
        expect(syncErrFn.count).to.equal(2);
        xpect(myXtrudr, {}, {}, {foo: [0,0]});
      });
    });

  });

  describe('with async xtrudr', function(){

    beforeEach(function(){ myXtrudr = xtrudr(true); });

    function run(fns){
      var res = runValFun(myXtrudr, name, inp, fns);
      expect(q.isPromise(res)).to.be.true;
      return res;
    }

    it('should assign fn output and return prom', function(done){
      run(asyncOkFn).done(function(){
        xpect(myXtrudr, {}, expOut, {});
        done();
      });
    });

    it('should assign err and return prom', function(done){
      run(asyncErrFn).done(function(){
        xpect(myXtrudr, {}, {}, {foo:[0]});
        done();
      });
    });

    it('should assign out if fn returns nothing', function(done){
      run(function(){}).done(function(){
        xpect(myXtrudr, {}, expInp, {});
        done();
      });
    });

    it('should assign out if no fn', function(done){
      run().done(function(){
        xpect(myXtrudr, {}, expInp, {});
        done();
      });
    });

    describe('with multiple fns', function(){

      it('should call all fns and only assign last', function(done){
        function last(i){ return q(i+4); }
        run([syncOkFn, asyncOkFn, last]).done(function(){
          [syncOkFn, asyncOkFn].forEach(function(fn){
            expect(fn.count).to.equal(1);
          });
          xpect(myXtrudr, {}, {foo:5}, {});
          done();
        });
      });

      it('should concatenate errs and not assign out', function(done){
        run([asyncOkFn, syncErrFn, asyncErrFn]).done(function(){
          expect(asyncOkFn.count).to.equal(1);
          xpect(myXtrudr, {}, {}, {foo:[0,0]});
          done();
        });
      });
    });
  });
});