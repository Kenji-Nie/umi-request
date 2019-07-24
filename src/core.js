import Onion from './onion/onion';
import { MapCache } from './utils';

class Core {
  constructor(initOptions, defaultMiddlewares) {
    this.onion = new Onion(defaultMiddlewares);
    this.mapCache = new MapCache(initOptions);
    this.requestInterceptors = [];
    this.responseInterceptors = [];
  }

  use(newMiddleware) {
    this.onion.use(newMiddleware);
    return this;
  }

  requestUse(handler) {
    if (typeof handler !== 'function') throw new TypeError('Interceptor must be function!');
    this.requestInterceptors.push(handler);
  }

  responseUse(handler) {
    if (typeof handler !== 'function') throw new TypeError('Interceptor must be function!');
    this.responseInterceptors.push(handler);
  }

  beforeRequest(ctx) {
    const reducer = (p1, p2) =>
      p1.then((ret = {}) => {
        ctx.req.url = ret.url || ctx.req.url;
        ctx.req.options = ret.options || ctx.req.options;
        return p2(ctx.req.url, ctx.req.options);
      });
    return this.requestInterceptors.reduce(reducer, Promise.resolve()).then((ret = {}) => {
      ctx.req.url = ret.url || ctx.req.url;
      ctx.req.options = ret.options || ctx.req.options;
      return Promise.resolve();
    });
  }

  request(url, options) {
    const { onion, responseInterceptors } = this;
    const obj = {
      req: { url, options },
      res: null,
      cache: this.mapCache,
      responseInterceptors,
    };
    if (typeof url !== 'string') {
      throw new Error('url MUST be a string');
    }

    return new Promise((resolve, reject) => {
      this.beforeRequest(obj)
        .then(() => onion.execute(obj))
        .then(() => {
          resolve(obj.res);
        })
        .catch(error => {
          const { errorHandler } = obj.req.options;
          if (errorHandler) {
            try {
              const data = errorHandler(error);
              resolve(data);
            } catch (e) {
              reject(e);
            }
          } else {
            reject(error);
          }
        });
    });
  }
}

export default Core;
