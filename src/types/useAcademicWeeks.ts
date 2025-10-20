import { useState, useEffect } from "react";
import api from "../api/api";

interface AcademicWeek {
  _id: string;
  weekNumber: number;
  startDate: string;
  endDate: string;
}

export default function useAcademicWeeks(
  selectedClass?: string,
  loadRecords?: (week?: number, className?: string) => Promise<void>
) {
  const [weeks, setWeeks] = useState<AcademicWeek[]>([]);
  const [currentWeek, setCurrentWeek] = useState<number | null>(null);
  const [selectedWeek, setSelectedWeek] = useState<number | string>("");

  const loadWeeks = async () => {
    try {
      // ✅ Lấy danh sách tuần học
      const res = await api.get("/api/academic-weeks/study-weeks");
      setWeeks(res.data || []);
    } catch (err) {
      console.error("Lỗi khi tải danh sách tuần:", err);
      setWeeks([]);
    }

    try {
      // ✅ Lấy tuần hiện tại
      const cur = await api.get("/api/academic-weeks/current");
      const wk = cur.data?.weekNumber ?? null;
      setCurrentWeek(wk);
      setSelectedWeek(wk ?? "");

      // ✅ Gọi callback nếu có (để load dữ liệu theo tuần)
      if (loadRecords) {
        await loadRecords(wk ?? undefined, selectedClass || undefined);
      }
    } catch (err) {
      console.error("Lỗi khi tải tuần hiện tại:", err);
      setCurrentWeek(null);
      setSelectedWeek("");
      if (loadRecords) {
        await loadRecords(undefined, selectedClass || undefined);
      }
    }
  };

  useEffect(() => {
    loadWeeks();
  }, []);

  return {
    weeks,
    currentWeek,
    selectedWeek,
    setSelectedWeek,
    reloadWeeks: loadWeeks,
  };
}
