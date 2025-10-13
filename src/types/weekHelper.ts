import dayjs from "dayjs";
import api from "../../api/api";

/**
 * Lấy danh sách tuần từ 1 đến tuần hiện tại (theo thời gian thực)
 * dựa trên ngày bắt đầu năm học trong settings.
 */
export const getWeeksAndCurrentWeek = async () => {
  try {
    const settingRes = await api.get("/api/settings");
    const startDate = dayjs(settingRes.data?.startSchoolDate || "2025-08-26"); // ví dụ ngày bắt đầu năm học
    const totalWeeks = settingRes.data?.totalWeeks || 35;

    // Tính tuần hiện tại theo ngày hôm nay
    const today = dayjs();
    let diffWeeks = today.diff(startDate, "week") + 1;
    if (diffWeeks > totalWeeks) diffWeeks = totalWeeks; // tránh vượt quá tổng số tuần

    // Tạo danh sách [1..tuần hiện tại]
    const weeks = Array.from({ length: diffWeeks }, (_, i) => i + 1);

    return { weeks, currentWeek: diffWeeks };
  } catch (err) {
    console.error("❌ Lỗi khi tải tuần:", err);
    return { weeks: [], currentWeek: null };
  }
};
