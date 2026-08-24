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

// ======================================================
// XỬ LÝ TOKEN HẾT HẠN / KHÔNG CÒN ĐĂNG NHẬP
// ======================================================

instance.interceptors.response.use(
  (response) => {
    return response;
  },

  (error) => {
    const status =
      error.response?.status;

    // 401 = chưa đăng nhập / token không hợp lệ
    // 403 = token hết hạn hoặc không có quyền
    if (
      status === 401 ||
      status === 403
    ) {
      const currentPath =
        window.location.pathname;

      // Không xử lý lặp lại nếu đang ở trang đăng nhập
      if (
        currentPath !== "/login"
      ) {
        localStorage.removeItem("token");

        // Thông báo cho người dùng
        alert(
          "Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại."
        );

        // Chuyển về trang đăng nhập
        window.location.href =
          "/login";
      }
    }

    return Promise.reject(error);
  }
);

export default instance;
