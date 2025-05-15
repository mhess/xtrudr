var rewire = require('rewire'),
    expect = require('chai').expect,
    q      = require('q');

var xtrudr = rewire('../index');

var syncOkFn = function(inp){ syncOkFn.count++; return inp+1; },
    syncErrFn = function(inp){ syncErrFn.count++; throw inp; };

var asyncOkFn = function(inp){ asyncOkFn.count++; return q(inp+1);},
    asyncErrFn = function(inp){
      asyncErrFn.count++;
      return q.reject(inp);
    };

function reset(){
  syncOkFn.count = 0; syncErrFn.count = 0;
  asyncOkFn.count = 0; asyncErrFn.count = 0;
}

describe('#permit()', function(){

  describe('with str argument', function(){
    var name = 'foo';
    var myXtrudr = xtrudr().permit(name);

    it('should simply pass parameter through', function(){
      var inp = {};
      inp[name] = 1;
      myXtrudr(inp);
      expect(myXtrudr.out).to.deep.equal(inp);
    });

    it('should not poplate anything if missing', function(){
      var inp = {baz:1};
      myXtrudr(inp);
      ['out', 'err'].forEach(function(p){
        expect(myXtrudr[p]).to.deep.equal({});
      });
      expect(myXtrudr.inp).to.deep.equal(inp);
    });

  });

  describe('with obj argument', function(){

    describe('and sync function', function(){

      var inp = {foo: 1},
          myXtrudr = xtrudr();

      beforeEach(reset);

      it('should call function and assign result', function(){
        var inp = {foo: 1};
        myXtrudr.permit({foo: syncOkFn})(inp);
        expect(syncOkFn.count).to.equal(1);
        expect(myXtrudr.out.foo).to.equal(2);
        expect(myXtrudr.err.foo).to.be.undefined;
      });

      it('should run function and assign error', function(){
        var inp = {foo: 1};
        myXtrudr.permit({foo: syncErrFn})(inp);
        expect(syncErrFn.count).to.equal(1);
        expect(myXtrudr.out.foo).to.be.undefined;
        expect(myXtrudr.err.foo).to.deep.equal([1]);
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
          expect(x).to.equal(myXtrudr);
          expect(asyncOkFn.count).to.equal(1);
          expect(x.out.foo).to.equal(2);
          expect(x.err.foo).to.be.undefined;
          done();
        });

      });

      it('should do nothing and return promise', function(done){
        var res = myXtrudr.permit({foo: asyncOkFn})({});
        expect(q.isPromise(res)).to.be.true;
        res.done(function(x){
          expect(x).to.equal(myXtrudr);
          expect(asyncOkFn.count).to.equal(0);
          expect(x.out).to.deep.equal({});
          expect(x.err).to.deep.equal({});
          done();
        });
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
      expect(myXtrudr.err).to.deep.equal({});
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
        expect(myXtrudr.err.foo).to.be.undefined;
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
          expect(x.err).to.deep.equal({});
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
          expect(x.err.foo).to.deep.equal([1]);
          expect(x.out).to.deep.equal({});
          done();
        });
      });
    });

  });
});

describe("runValFun()", function(){

  var runValFun = xtrudr.__get__('runValFun'),
      myXtrudr,
      name = 'foo',
      inp = 1;

  describe('with sync function', function(){

    beforeEach(function(){ myXtrudr = xtrudr(); });

    it('should assign function output to xtrudr.out', function(){
      var fn = function(a){return a;},
          res = runValFun(myXtrudr, name, inp, fn);
      expect(res).to.be.undefined;
      expect(myXtrudr.out[name]).to.equal(inp);
    });

    it('should assign thrown err to xtrudr.err', function(){
      var fn = function(i){ throw i; },
          res = runValFun(myXtrudr, name, inp, fn);
      expect(res).to.be.undefined;
      expect(myXtrudr.err[name]).to.deep.equal([inp]);
    });
  });

  describe('with async function', function(){

    var myXtrudr;

    beforeEach(function(){ myXtrudr = xtrudr(true); });

    it('should assign function output and return prom', function(done){
      var fn = function(i){ return q(i); },
          res = runValFun(myXtrudr, name, inp, fn);
      expect(q.isPromise(res)).to.be.true;
      res.done(function(){
        expect(myXtrudr.out[name]).to.deep.equal(inp);
        done();
      });
    });

    it('should assign err to xtrudr.err and return prom', function(done){
      var fn = function(i){ return q.reject(i); },
          res = runValFun(myXtrudr, name, inp, fn);
      expect(q.isPromise(res)).to.be.true;
      res.done(function(){
        expect(myXtrudr.err[name]).to.deep.equal([inp]);
        done();
      });
    });

  });
});