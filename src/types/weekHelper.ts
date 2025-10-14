// src/utils/weekHelper.ts
import api from "../api/api";

// ✅ Hàm trả về danh sách tuần từ 1 → tuần hiện tại
export async function getWeeksAndCurrentWeek() {
  try {
    // Lấy cấu hình (đặc biệt là ngày bắt đầu năm học)
    const res = await api.get("/api/settings");
    const startDateStr = res.data?.startSchoolDate || "2025-09-02"; // fallback an toàn
    const totalWeeks = res.data?.totalWeeks || 35; // nếu có tổng số tuần trong settings

    const startDate = new Date(startDateStr);
    const now = new Date();

    // Tính số tuần trôi qua từ ngày bắt đầu
    const diffMs = now.getTime() - startDate.getTime();
    const diffWeeks = Math.floor(diffMs / (7 * 24 * 60 * 60 * 1000));
    const currentWeek = Math.max(1, Math.min(diffWeeks, totalWeeks));

    // ✅ Sinh danh sách tuần từ 1 → currentWeek
    const weeks = Array.from({ length: currentWeek }, (_, i) => i + 1);

    return { weeks, currentWeek };
  } catch (err) {
    console.error("❌ Lỗi khi tính tuần:", err);
    // fallback: ít nhất trả về tuần 1
    return { weeks: [1], currentWeek: 1 };
  }
}
