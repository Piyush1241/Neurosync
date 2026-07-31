import axios from 'axios';

export const api = axios.create({
  baseURL: 'https://neurosync-4giu.onrender.com',
  timeout: 10000,
});