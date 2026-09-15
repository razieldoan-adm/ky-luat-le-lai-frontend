
import axios from "axios";

console.log(
  "API URL:",
  import.meta.env.VITE_BACKEND_URL
);

// ======================================================
// AXIOS INSTANCE
// ======================================================
const instance = axios.create({
  baseURL: import.meta.env.VITE_BACKEND_URL,
});

// ======================================================
// TỰ ĐỘNG GẮN JWT TOKEN NẾU ĐANG ĐĂNG NHẬP
//
// Nếu không có token:
// -> request vẫn được gửi bình thường
// -> phục vụ các trang xem không cần đăng nhập
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

// ======================================================
// XÓA PHIÊN ĐĂNG NHẬP
// ======================================================
const forceLogout = () => {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
  localStorage.removeItem("loginDate");

  sessionStorage.setItem(
    "sessionExpiredMessage",
    "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại."
  );

  if (
    window.location.pathname !== "/login"
  ) {
    window.location.href = "/login";
  }
};

// ======================================================
// XỬ LÝ RESPONSE
// ======================================================
instance.interceptors.response.use(
  (response) => {
    return response;
  },

  (error) => {
    const status =
      error.response?.status;

    const token =
      localStorage.getItem("token");

    // ==================================================
    // CHỈ XỬ LÝ 401 / 403 NẾU NGƯỜI DÙNG
    // ĐANG CÓ PHIÊN ĐĂNG NHẬP
    //
    // API công khai không có token:
    // -> KHÔNG redirect về login
    // ==================================================
    if (
      (status === 401 ||
        status === 403) &&
      token
    ) {
      const currentPath =
        window.location.pathname;

      if (
        currentPath !== "/login"
      ) {
        forceLogout();
      }
    }

    return Promise.reject(error);
  }
);

export default instance;

