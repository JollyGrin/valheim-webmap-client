import axios from 'axios';

const DEV_URL = 'http://localhost:3000';
const PROD_URL = 'valheim-webmap-client-production-645a.up.railway.app';

export const apiClient = axios.create({
  baseURL: PROD_URL,
  timeout: 2000
});
