
import React, {
  createContext,
  useContext,
  useState,
  useEffect
} from "react";

export interface User {
  username: string;
  role: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (userData: User, token: string) => void;
  logout: () => void;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(
  undefined
);

const LOGIN_DATE_KEY = "loginDate";

// ======================================================
// LẤY NGÀY HIỆN TẠI THEO GIỜ VIỆT NAM
// ======================================================
const getVietnamDate = (): string => {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(new Date());
};

export const AuthProvider: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // ======================================================
  // LOGOUT
  // ======================================================
  const logout = () => {
    setUser(null);
    setToken(null);

    localStorage.removeItem("user");
    localStorage.removeItem("token");
    localStorage.removeItem(LOGIN_DATE_KEY);
  };

  // ======================================================
  // KIỂM TRA PHIÊN HIỆN TẠI
  // ======================================================
  const checkSession = () => {
    const storedUser = localStorage.getItem("user");
    const storedToken = localStorage.getItem("token");
    const storedLoginDate =
      localStorage.getItem(LOGIN_DATE_KEY);

    // Không có phiên đăng nhập
    if (
      !storedUser ||
      storedUser === "undefined" ||
      !storedToken ||
      !storedLoginDate
    ) {
      return;
    }

    const today = getVietnamDate();

    // ====================================================
    // ĐÃ SANG NGÀY MỚI
    // ====================================================
    if (storedLoginDate !== today) {
      console.log(
        "Phiên đăng nhập đã hết hạn:",
        storedLoginDate,
        "=>",
        today
      );

      // Xóa phiên
      localStorage.removeItem("user");
      localStorage.removeItem("token");
      localStorage.removeItem(LOGIN_DATE_KEY);

      setUser(null);
      setToken(null);

      // Lưu thông báo
      sessionStorage.setItem(
        "sessionExpiredMessage",
        "Phiên đăng nhập của bạn đã hết hạn do đã sang ngày mới. Vui lòng đăng nhập lại."
      );

      // Chỉ chuyển Login nếu người dùng
      // thực sự đang ở một trang cần phiên
      if (window.location.pathname !== "/login") {
        window.location.href = "/login";
      }
    }
  };

  // ======================================================
  // KHỞI TẠO AUTH
  // ======================================================
  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    const storedToken = localStorage.getItem("token");
    const storedLoginDate =
      localStorage.getItem(LOGIN_DATE_KEY);

    // ====================================================
    // KHÔNG CÓ PHIÊN
    // ====================================================
    if (
      !storedUser ||
      storedUser === "undefined" ||
      !storedToken
    ) {
      setUser(null);
      setToken(null);
      setLoading(false);
      return;
    }

    // ====================================================
    // TRƯỜNG HỢP PHIÊN CŨ CHƯA CÓ loginDate
    //
    // Không ép người dùng đăng nhập lại ngay.
    // Gán ngày hiện tại cho phiên cũ.
    // ====================================================
    if (!storedLoginDate) {
      localStorage.setItem(
        LOGIN_DATE_KEY,
        getVietnamDate()
      );
    }

    // ====================================================
    // KIỂM TRA NGÀY ĐĂNG NHẬP
    // ====================================================
    const loginDate =
      localStorage.getItem(LOGIN_DATE_KEY);

    const today = getVietnamDate();

    if (loginDate !== today) {
      console.log(
        "Phiên cũ đã hết hạn:",
        loginDate,
        "=>",
        today
      );

      localStorage.removeItem("user");
      localStorage.removeItem("token");
      localStorage.removeItem(LOGIN_DATE_KEY);

      setUser(null);
      setToken(null);
      setLoading(false);

      sessionStorage.setItem(
        "sessionExpiredMessage",
        "Phiên đăng nhập của bạn đã hết hạn do đã sang ngày mới. Vui lòng đăng nhập lại."
      );

      if (window.location.pathname !== "/login") {
        window.location.href = "/login";
      }

      return;
    }

    // ====================================================
    // KHÔI PHỤC USER
    // ====================================================
    try {
      const parsedUser: User =
        JSON.parse(storedUser);

      setUser(parsedUser);
      setToken(storedToken);
    } catch (err) {
      console.error(
        "Lỗi parse user:",
        err
      );

      localStorage.removeItem("user");
      localStorage.removeItem("token");
      localStorage.removeItem(LOGIN_DATE_KEY);

      setUser(null);
      setToken(null);
    }

    setLoading(false);

    // ====================================================
    // KIỂM TRA MỖI 30 GIÂY
    //
    // Nếu người dùng đang mở hệ thống qua 00:00
    // thì tự động logout.
    // ====================================================
    const interval = window.setInterval(() => {
      checkSession();
    }, 30 * 1000);

    return () => {
      window.clearInterval(interval);
    };
  }, []);

  // ======================================================
  // LOGIN
  // ======================================================
  const login = (
    userData: User,
    newToken: string
  ) => {
    const today = getVietnamDate();

    setUser(userData);
    setToken(newToken);

    localStorage.setItem(
      "user",
      JSON.stringify(userData)
    );

    localStorage.setItem(
      "token",
      newToken
    );

    localStorage.setItem(
      LOGIN_DATE_KEY,
      today
    );

    console.log(
      "Đăng nhập ngày:",
      today
    );
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        login,
        logout,
        loading
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context =
    useContext(AuthContext);

  if (!context) {
    throw new Error(
      "useAuth must be used within an AuthProvider"
    );
  }

  return context;
};

