import {assert} from 'chai';
import * as request from 'supertest';
import * as Koa from 'koa';
import *  as route from './router';

const methods = require('methods').map(function (method) {
  // normalize method names for tests
  if (method == 'delete') method = 'del';
  if (method == 'connect') return; // WTF  
  return method;
}).filter(Boolean)


methods.forEach(function (method) {
  const app = new Koa();
  let fn = route.Methods.get(method);
  app.use(fn('/:user(tj)', async function (user, next) {    
      this.body = user;    
  }))

  describe('route.' + method + '()', function () {
    describe('when method and path match', function () {
      it('should 200', function (done) {
        request(app.listen())[method]('/tj')
          .expect(200)
          .expect(method === 'head' ? '' : 'tj', done);
      })
    })

    describe('when only method matches', function () {
      it('should 404', function (done) {
        request(app.listen())
        [method]('/tjayyyy')
          .expect(404, done);
      })
    })

    describe('when only path matches', function () {
      it('should 404', function (done) {
        request(app.listen())
        [method === 'get' ? 'post' : 'get']('/tj')
          .expect(404, done);
      })
    })
  })
})

describe('route.all()', function () {
  describe('should work with', function () {
    methods.forEach(function (method) {
      const app = new Koa();
      let all = route.all('/:user(tj)', function (user, next) {
        let ctx = this as Koa.Context;
        this.body = user;
      });
      app.use(all);

      it(method, function (done) {
        request(app.listen())
        [method]('/tj')
          .expect(200)
          .expect(method === 'head' ? '' : 'tj', done);
      })
    })
  })

  describe('when patch does not match', function () {
    it('should 404', function (done) {
      const app = new Koa();
      app.use(route.all('/:user(tj)', function (user) {
        this.body = user;
      }))

      request(app.listen())
        .get('/tjayyyyyy')
        .expect(404, done);
    })
  })
})

describe('route params', function () {

  methods.forEach(function (method) {
    const app = new Koa();

    app.use(route.Methods.get(method)('/:user(tj)', async function (user, next) {
      await next();
    }))

    app.use(route.Methods.get(method)('/:user(tj)', async function (user, next) {
      this.body = user;
      await next();
    }))

    app.use(route.Methods.get(method)('/:user(tj)', function (user, next) {
      this.status = 201;
    }))

    it('should work with method ' + method, function (done) {
      request(app.listen())
      [method]('/tj')
        .expect(201)
        .expect(method === 'head' ? '' : 'tj', done);
    })
  })

  it('should work with method head when get is defined', function (done) {
    const app = new Koa();

    app.use(route.get('/tj', function (name) {
      this.body = 'foo';
    }));

    request(app.listen())
    ['head']('/tj')
      .expect(200, done)
  })

  it('should be decoded', function (done) {
    const app = new Koa();

    app.use(route.get('/package/:name', function (name) {
      assert.equal(name, 'http://github.com/component/tip');
      done();
    }));

    request(app.listen())
      .get('/package/' + encodeURIComponent('http://github.com/component/tip'))
      .end(function () { });
  })

  it('should be null if not matched', function (done) {
    const app = new Koa();

    app.use(route.get('/api/:resource/:id?', function (resource, id) {
      assert.equal(resource, 'users');
      assert.isTrue(id == null);
      done();
    }));

    request(app.listen())
      .get('/api/users')
      .end(function () { });
  })

  it('should use the given options', function (done) {
    const app = new Koa();

    app.use(route.get('/api/:resource/:id', function (resource, id) {
      assert.equal(resource, 'users');
      assert.equal(id, '1')
      done();
    }, { end: false }));

    request(app.listen())
      .get('/api/users/1/posts')
      .end(function () { });
  })
})