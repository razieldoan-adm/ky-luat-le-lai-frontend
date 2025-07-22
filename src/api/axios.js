import axios from 'axios';

console.log('VITE_BACKEND_URL:', import.meta.env.VITE_BACKEND_URL);

const instance = axios.create({
  baseURL: import.meta.env.VITE_BACKEND_URL, // Sử dụng biến môi trường backend
  // withCredentials: true,
});

export default instance;
