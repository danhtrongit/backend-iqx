import { FastifyInstance } from 'fastify';
import httpProxy from '@fastify/http-proxy';
import { config } from '../config/env';

export default async function proxyRoutes(app: FastifyInstance) {
  // Common proxy headers
  const getProxyHeaders = () => ({
    'Accept': 'application/json, text/plain, */*',
    'Accept-Language': 'en-US,en;q=0.9,vi-VN;q=0.8,vi;q=0.7',
    'Connection': 'keep-alive',
    'Cache-Control': 'no-cache',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
  });

  // IQ Proxy: /proxy/iq/* -> https://iq.vietcap.com.vn/*
  await app.register(httpProxy, {
    upstream: config.PROXY_IQ_TARGET,
    prefix: '/iq',
    rewritePrefix: '',
    http: {
      requestOptions: {
        timeout: 30000,
      },
    },
    replyOptions: {
      onResponse: (request, reply, res) => {
        // Override CORS headers
        reply.header('access-control-allow-origin', request.headers.origin || '*');
        reply.header('access-control-allow-methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
        reply.header('access-control-allow-headers', request.headers['access-control-request-headers'] || '*');
        reply.header('vary', 'Origin');
        
        if (res.statusCode >= 400) {
          app.log.error({
            msg: 'IQ upstream error',
            status: res.statusCode,
            path: request.url,
          });
        }
        
        reply.send(res);
      },
      rewriteRequestHeaders: (req, headers) => {
        const proxyHeaders = getProxyHeaders();
        return {
          ...headers,
          ...proxyHeaders,
          'Referer': config.PROXY_IQ_TARGET + '/',
          'Origin': config.PROXY_IQ_TARGET,
          'x-forwarded-for': headers['x-forwarded-for'] || req.socket.remoteAddress || '',
        };
      },
    },
  });

  // Trading Proxy: /proxy/trading/* -> https://trading.vietcap.com.vn/*
  await app.register(httpProxy, {
    upstream: config.PROXY_TRADING_TARGET,
    prefix: '/trading',
    rewritePrefix: '',
    http: {
      requestOptions: {
        timeout: 30000,
      },
    },
    replyOptions: {
      onResponse: (request, reply, res) => {
        // Override CORS headers
        reply.header('access-control-allow-origin', request.headers.origin || '*');
        reply.header('access-control-allow-methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
        reply.header('access-control-allow-headers', request.headers['access-control-request-headers'] || '*');
        reply.header('vary', 'Origin');
        
        if (res.statusCode >= 400) {
          app.log.error({
            msg: 'Trading upstream error',
            status: res.statusCode,
            path: request.url,
          });
        }
        
        reply.send(res);
      },
      rewriteRequestHeaders: (req, headers) => {
        const proxyHeaders = getProxyHeaders();
        return {
          ...headers,
          ...proxyHeaders,
          'Referer': config.PROXY_TRADING_TARGET + '/',
          'Origin': config.PROXY_TRADING_TARGET,
          'x-forwarded-for': headers['x-forwarded-for'] || req.socket.remoteAddress || '',
        };
      },
    },
  });

  // AI Proxy: /proxy/ai/* -> https://ai.vietcap.com.vn/*
  await app.register(httpProxy, {
    upstream: config.PROXY_AI_TARGET,
    prefix: '/ai',
    rewritePrefix: '',
    http: {
      requestOptions: {
        timeout: 30000,
      },
    },
    replyOptions: {
      onResponse: (request, reply, res) => {
        // Override CORS headers
        reply.header('access-control-allow-origin', request.headers.origin || '*');
        reply.header('access-control-allow-methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
        reply.header('access-control-allow-headers', request.headers['access-control-request-headers'] || '*');
        reply.header('vary', 'Origin');
        
        if (res.statusCode >= 400) {
          app.log.error({
            msg: 'AI upstream error',
            status: res.statusCode,
            path: request.url,
          });
        }
        
        reply.send(res);
      },
      rewriteRequestHeaders: (req, headers) => {
        const proxyHeaders = getProxyHeaders();
        return {
          ...headers,
          ...proxyHeaders,
          'Referer': config.PROXY_AI_TARGET + '/',
          'Origin': config.PROXY_AI_TARGET,
          'x-forwarded-for': headers['x-forwarded-for'] || req.socket.remoteAddress || '',
        };
      },
    },
  });
}