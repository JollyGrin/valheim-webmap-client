import { dev } from '$app/environment';
import axios from 'axios';

const DEV_URL = 'http://localhost:3000';
const PROD_URL = 'https://valheim-webmap-client-production-645a.up.railway.app';

export const apiClient = axios.create({
  baseURL: dev ? DEV_URL : PROD_URL,
  timeout: 2000
});
