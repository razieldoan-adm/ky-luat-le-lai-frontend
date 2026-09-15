
import axios from "axios";

console.log(
  "API URL:",
  import.meta.env.VITE_BACKEND_URL
);

const LOGIN_DATE_KEY = "loginDate";

// ======================================================
// LẤY NGÀY HIỆN TẠI THEO GIỜ VIỆT NAM
// Format: YYYY-MM-DD
// ======================================================
const getVietnamDate = () => {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(new Date());
};

// ======================================================
// KIỂM TRA PHIÊN THEO NGÀY
// ======================================================
const isLoginExpired = () => {
  const loginDate =
    localStorage.getItem(LOGIN_DATE_KEY);

  if (!loginDate) {
    return true;
  }

  const today = getVietnamDate();

  return loginDate !== today;
};

// ======================================================
// XÓA PHIÊN ĐĂNG NHẬP
// ======================================================
const forceLogout = () => {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
  localStorage.removeItem(LOGIN_DATE_KEY);

  if (
    window.location.pathname !== "/login"
  ) {
    alert(
      "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại."
    );

    window.location.href = "/login";
  }
};

// ======================================================
// AXIOS INSTANCE
// ======================================================
const instance = axios.create({
  baseURL: import.meta.env.VITE_BACKEND_URL,
});

// ======================================================
// TỰ ĐỘNG GẮN JWT TOKEN
// + KIỂM TRA NGÀY ĐĂNG NHẬP
// ======================================================
instance.interceptors.request.use(
  (config) => {
    // Nếu đang ở trang login
    // không cần kiểm tra phiên
    if (
      window.location.pathname === "/login"
    ) {
      return config;
    }

    // ==================================================
    // KIỂM TRA ĐÃ QUA NGÀY MỚI CHƯA
    // ==================================================
    if (isLoginExpired()) {
      forceLogout();

      return Promise.reject(
        new axios.Cancel(
          "Phiên đăng nhập đã hết hạn"
        )
      );
    }

    // ==================================================
    // GẮN TOKEN
    // ==================================================
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
// XỬ LÝ TOKEN KHÔNG HỢP LỆ / HẾT HẠN
// ======================================================
instance.interceptors.response.use(
  (response) => {
    return response;
  },

  (error) => {
    const status =
      error.response?.status;

    // ==================================================
    // 401 / 403
    // ==================================================
    if (
      status === 401 ||
      status === 403
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

