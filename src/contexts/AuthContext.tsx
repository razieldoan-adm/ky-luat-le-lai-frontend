
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
// Format: YYYY-MM-DD
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
  // KHỞI TẠO VÀ KIỂM TRA PHIÊN
  // ======================================================
  useEffect(() => {
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
      setUser(null);
      setToken(null);
      setLoading(false);
      return;
    }

    const today = getVietnamDate();

    // ====================================================
    // ĐÃ QUA NGÀY MỚI -> HẾT PHIÊN
    // ====================================================
    if (storedLoginDate !== today) {
      console.log(
        "Phiên đăng nhập đã hết hạn:",
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

      if (window.location.pathname !== "/login") {
        window.location.href = "/login";
      }

      return;
    }

    // ====================================================
    // KHÔI PHỤC PHIÊN
    // ====================================================
    try {
      const parsedUser = JSON.parse(storedUser);

      setUser(parsedUser);
      setToken(storedToken);
    } catch (err) {
      console.error("Lỗi parse user:", err);

      localStorage.removeItem("user");
      localStorage.removeItem("token");
      localStorage.removeItem(LOGIN_DATE_KEY);

      setUser(null);
      setToken(null);
    }

    setLoading(false);

    // ====================================================
    // KIỂM TRA ĐỊNH KỲ
    // Nếu đang mở trang qua 00:00 thì tự logout
    // ====================================================
    const interval = window.setInterval(() => {
      const currentLoginDate =
        localStorage.getItem(LOGIN_DATE_KEY);

      const currentToday = getVietnamDate();

      if (
        currentLoginDate &&
        currentLoginDate !== currentToday
      ) {
        console.log(
          "Đã sang ngày mới, tự động đăng xuất."
        );

        localStorage.removeItem("user");
        localStorage.removeItem("token");
        localStorage.removeItem(LOGIN_DATE_KEY);

        setUser(null);
        setToken(null);

        if (window.location.pathname !== "/login") {
          window.location.href = "/login";
        }
      }
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
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error(
      "useAuth must be used within an AuthProvider"
    );
  }

  return context;
};

