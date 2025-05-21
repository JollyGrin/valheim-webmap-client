import axios from 'axios';

const DEV_URL = 'http://localhost:3000';
const PROD_URL = 'https://valheim-webmap-client-production.up.railway.app';

export const apiClient = axios.create({
  baseURL: PROD_URL,
  timeout: 2000
});
