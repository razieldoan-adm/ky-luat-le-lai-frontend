import axios from 'axios';

const instance = axios.create({
  baseURL: 'https://ky-luat-le-lai-backend-production.up.railway.app',
  headers: {
    'Content-Type': 'application/json',
  },
});

instance.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('API error:', error.response || error.message);
    return Promise.reject(error);
  }
);

export default instance;
