// src/utils/weekHelper.ts
import dayjs from "dayjs";
import api from "../api/api";

type WeeksResult = { weeks: number[]; currentWeek: number | null };

/**
 * Trả về mảng tuần [1..currentWeek] và currentWeek (tính theo startSchoolDate trong settings).
 * Cách tính: lấy số ngày chênh lệch, rồi floor(days/7)+1 => ổn định hơn diff(..., 'week').
 */
export const getWeeksAndCurrentWeek = async (): Promise<WeeksResult> => {
  try {
    const res = await api.get("/api/settings");
    const startDateStr: string | undefined = res.data?.startSchoolDate;
    const totalWeeks: number = res.data?.totalWeeks ?? 35;

    if (!startDateStr) {
      console.warn("weekHelper: settings.startSchoolDate not set");
      return { weeks: [], currentWeek: null };
    }

    const start = dayjs(startDateStr).startOf("day");
    const today = dayjs().startOf("day");

    // số ngày đã trôi qua (today - start)
    const daysDiff = today.diff(start, "day");

    // nếu hôm nay còn trước ngày bắt đầu -> chưa có tuần nào (hoặc mặc định tuần 1 tuỳ yêu cầu)
    if (daysDiff < 0) {
      return { weeks: [], currentWeek: null };
    }

    // tuần hiện tại = floor(daysDiff / 7) + 1
    let currentWeek = Math.floor(daysDiff / 7) + 1;

    // đảm bảo không vượt quá totalWeeks
    if (currentWeek > totalWeeks) currentWeek = totalWeeks;

    const weeks = Array.from({ length: currentWeek }, (_, i) => i + 1);
    return { weeks, currentWeek };
  } catch (err) {
    console.error("Lỗi khi tải settings để tính tuần:", err);
    return { weeks: [], currentWeek: null };
  }
};

/**
 * Lấy riêng tuần hiện tại (number) hoặc null nếu chưa tới startDate.
 */
export const getCurrentWeekOnly = async (): Promise<number | null> => {
  const { currentWeek } = await getWeeksAndCurrentWeek();
  return currentWeek;
};
