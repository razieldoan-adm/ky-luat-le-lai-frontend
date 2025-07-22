import axios from 'axios';

const instance = axios.create({
  console.log('VITE_BACKEND_URL:', import.meta.env.VITE_BACKEND_URL);
  baseURL: import.meta.env.VITE_BACKEND_URL, // Sử dụng biến môi trường backend
  // withCredentials: true, // nếu backend yêu cầu cookie hoặc token
  
});

export default instance;
