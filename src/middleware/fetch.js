import 'whatwg-fetch';
import { timeout2Throw } from '../utils';

export default function fetchMiddleware(ctx, next) {
  const {
    req: { options = {}, url = '' },
    cache,
    responseInterceptors,
  } = ctx;
  const { timeout = 0, type = 'normal', useCache = false, method = 'get', params, ttl } = options;

  if (type !== 'normal') {
    return next();
  }
  if (!window || !window.fetch) {
    throw new Error('window or window.fetch not exist!');
  }

  // 从缓存池检查是否有缓存数据
  const needCache = method.toLowerCase() === 'get' && useCache;
  if (needCache) {
    let responseCache = cache.get({
      url,
      params,
    });
    if (responseCache) {
      responseCache = responseCache.clone();
      responseCache.useCache = true;
      ctx.res = responseCache;
      return next();
    }
  }
  let response;
  if (timeout > 0) {
    response = Promise.race([window.fetch(url, options), timeout2Throw(timeout)]);
  } else {
    response = window.fetch(url, options);
  }

  // 执行 response 的拦截器
  responseInterceptors.forEach(handler => {
    response = response.then(res => handler(res, options));
  });

  return response.then(res => {
    // 是否存入缓存池
    if (needCache) {
      if (res.status === 200) {
        const copy = res.clone();
        copy.useCache = true;
        cache.set({ url, params }, copy, ttl);
      }
    }

    ctx.res = res;
    return next();
  });
}
