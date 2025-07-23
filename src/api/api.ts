import axios from 'axios';
console.log("API URL:", import.meta.env.VITE_BACKEND_URL);
const instance = axios.create({
  baseURL: import.meta.env.VITE_BACKEND_URL, // Sử dụng biến môi trường backend
  // withCredentials: true, // nếu backend yêu cầu cookie hoặc token
});

export default instance;
