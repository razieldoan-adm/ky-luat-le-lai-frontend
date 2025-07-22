import axios from 'axios';

const instance = axios.create({
  baseURL: 'https://ky-luat-le-lai-backend-production.up.railway.app',
  // Nếu backend của bạn cần gửi credentials (cookie, JWT trong cookie)
  // uncomment dòng sau:
  // withCredentials: true,

  headers: {
    'Content-Type': 'application/json',
    // Nếu dùng token auth, thêm Authorization ở đây:
    // 'Authorization': `Bearer ${token}`
  },
});

// Optional: interceptors để log hoặc handle error chung
instance.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('API error:', error.response || error.message);
    return Promise.reject(error);
  }
);

export default instance;
