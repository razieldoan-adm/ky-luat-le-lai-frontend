
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

const AuthContext = createContext<AuthContextType | undefined>(undefined);

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

const LOGIN_DATE_KEY = "loginDate";

export const AuthProvider: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // ======================================================
  // LOGOUT HOÀN TOÀN
  // ======================================================
  const logout = () => {
    setUser(null);
    setToken(null);

    localStorage.removeItem("user");
    localStorage.removeItem("token");
    localStorage.removeItem(LOGIN_DATE_KEY);
  };

  // ======================================================
  // KIỂM TRA PHIÊN ĐĂNG NHẬP THEO NGÀY
  // ======================================================
  const checkLoginDate = () => {
    const storedLoginDate =
      localStorage.getItem(LOGIN_DATE_KEY);

    // Không có ngày đăng nhập
    if (!storedLoginDate) {
      return false;
    }

    const today = getVietnamDate();

    // Khác ngày => phiên đã hết hạn
    if (storedLoginDate !== today) {
      console.log(
        "Phiên đăng nhập đã hết hạn:",
        storedLoginDate,
        "=>",
        today
      );

      logout();

      return false;
    }

    return true;
  };

  // ======================================================
  // KHỞI TẠO AUTH
  // ======================================================
  useEffect(() => {
    const storedUser =
      localStorage.getItem("user");

    const storedToken =
      localStorage.getItem("token");

    const storedLoginDate =
      localStorage.getItem(LOGIN_DATE_KEY);

    // Không có thông tin đăng nhập
    if (
      !storedUser ||
      storedUser === "undefined" ||
      !storedToken ||
      !storedLoginDate
    ) {
      setUser(null);
      setToken(null);
      setLoading(false);
      return;
    }

    // ==================================================
    // KIỂM TRA NGÀY ĐĂNG NHẬP
    // ==================================================
    const today = getVietnamDate();

    if (storedLoginDate !== today) {
      console.log(
        "Phiên cũ đã hết hạn:",
        storedLoginDate,
        "=>",
        today
      );

      localStorage.removeItem("user");
      localStorage.removeItem("token");
      localStorage.removeItem(LOGIN_DATE_KEY);

      setUser(null);
      setToken(null);
      setLoading(false);

      // Đưa về login
      if (window.location.pathname !== "/login") {
        window.location.href = "/login";
      }

      return;
    }

    // ==================================================
    // KHÔI PHỤC PHIÊN HIỆN TẠI
    // ==================================================
    try {
      setUser(JSON.parse(storedUser));
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

    // ==================================================
    // KIỂM TRA MỖI 30 GIÂY
    // Để khi đang mở trang qua 00:00
    // hệ thống tự logout
    // ==================================================
    const interval = setInterval(() => {
      const valid = checkLoginDate();

      if (!valid) {
        if (
          window.location.pathname !== "/login"
        ) {
          window.location.href = "/login";
        }
      }
    }, 30 * 1000);

    return () => {
      clearInterval(interval);
    };
  }, []);

  // ======================================================
  // ĐĂNG NHẬP
  // ======================================================
  const login = (
    userData: User,
    token: string
  ) => {
    const today = getVietnamDate();

    setUser(userData);
    setToken(token);

    localStorage.setItem(
      "user",
      JSON.stringify(userData)
    );

    localStorage.setItem(
      "token",
      token
    );

    // Lưu ngày đăng nhập
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
```
