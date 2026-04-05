import axios from 'axios';
import http from 'http';
import https from 'https';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

// Use direct agents to bypass system proxy for server-side requests
export const apiServer = axios.create({
  baseURL: API_URL,
  httpAgent:  new http.Agent(),
  httpsAgent: new https.Agent(),
  proxy: false,
});
