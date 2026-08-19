import axios from "axios";

console.log(
  "API URL:",
  import.meta.env.VITE_BACKEND_URL
);

const instance = axios.create({
  baseURL: import.meta.env.VITE_BACKEND_URL,
});

// ======================================================
// TỰ ĐỘNG GẮN JWT TOKEN
// ======================================================

instance.interceptors.request.use(
  (config) => {
    const token =
      localStorage.getItem("token");

    if (token) {
      config.headers.Authorization =
        `Bearer ${token}`;
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export default instance;
