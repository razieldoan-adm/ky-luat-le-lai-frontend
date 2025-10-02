import { useEffect, useState } from "react";
import {
  Box,
  Button,
  CircularProgress,
  MenuItem,
  Select,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  Paper,
  TextField,
} from "@mui/material";
import api from "../../api/api";

interface WeeklyScoreRow {
  className: string;
  grade: string;
  weekNumber: number;
  attendanceScore: number;
  hygieneScore: number;
  lineUpScore: number;
  violationScore: number;
  academicScore: number;
  bonusScore: number;
  totalViolation: number;
  totalDiscipline: number;
  totalScore: number;
  ranking: number;
}

export default function WeeklyScoresPage() {
  const [loading, setLoading] = useState(false);
  const [week, setWeek] = useState<number | "">("");
  const [weeksWithData, setWeeksWithData] = useState<number[]>([]);
  const [scores, setScores] = useState<WeeklyScoreRow[]>([]);
  const [isTempLoaded, setIsTempLoaded] = useState(false);
  const [disciplineMax, setDisciplineMax] = useState<number>(100);
  const [homeroomSet, setHomeroomSet] = useState<Set<string>>(new Set());
  const [allowedClassSet, setAllowedClassSet] = useState<Set<string>>(new Set());
  const [localEdited, setLocalEdited] = useState(false);
  const [externalChangeAvailable, setExternalChangeAvailable] = useState(false);

  // helper: chuẩn hóa tên lớp để so sánh chính xác
  const normalizeClassName = (v: any) => String(v ?? "").trim().toUpperCase();

  useEffect(() => {
    fetchWeeksWithData();
    fetchSettings();
    fetchClassesWithGVCN();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchWeeksWithData = async () => {
    try {
      const res = await api.get<number[]>("/api/class-weekly-scores/weeks");
      setWeeksWithData(res.data || []);
    } catch (err) {
      console.error("Load weeks error:", err);
    }
  };

  const fetchSettings = async () => {
    try {
      const res = await api.get("/api/settings");
      const data = res.data;
      if (data) {
        if (Array.isArray(data) && data.length > 0) {
          setDisciplineMax(Number(data[0].disciplineMax ?? 100));
          if (data[0].allowedClasses) {
            const set = new Set<string>();
            data[0].allowedClasses.forEach((c: string) =>
              set.add(normalizeClassName(c))
            );
            setAllowedClassSet(set);
          }
        } else if (typeof data === "object") {
          setDisciplineMax(Number((data as any).disciplineMax ?? 100));
          if ((data as any).allowedClasses) {
            const set = new Set<string>();
            (data as any).allowedClasses.forEach((c: string) =>
              set.add(normalizeClassName(c))
            );
            setAllowedClassSet(set);
          }
        }
      }
    } catch (err) {
      console.error("Load settings error:", err);
      setDisciplineMax(100);
    }
  };

  const fetchClassesWithGVCN = async () => {
    try {
      const res = await api.get<any[]>("/api/classes/with-teacher");
      const arr = res.data || [];
      const set = new Set<string>();
      arr.forEach((c) => {
        if (c?.name) {
          set.add(normalizeClassName(c.name));
        }
      });
      setHomeroomSet(set);
    } catch (err) {
      console.error("Load classes error:", err);
    }
  };

  const fetchScores = async (weekNumber: number, isTemp = false) => {
    setLoading(true);
    try {
      let res;
      if (!isTemp && weeksWithData.includes(weekNumber)) {
        res = await api.get<WeeklyScoreRow[]>(
          `/api/class-weekly-scores?weekNumber=${weekNumber}`
        );
        let data = res.data || [];
        // lọc chỉ lớp có GVCN + nằm trong allowedClasses
        data = data.filter((r) => {
          const cls = normalizeClassName(r.className);
          return homeroomSet.has(cls) && allowedClassSet.has(cls);
        });
        const recalced = recalcAndRank(data);
        setScores(recalced);
        setIsTempLoaded(false);
        setLocalEdited(false);
        checkExternalChange(weekNumber);
      } else {
        res = await api.get<WeeklyScoreRow[]>("/api/class-weekly-scores/temp", {
          params: { weekNumber },
        });
        let data = res.data || [];
        data = data.filter((r) => {
          const cls = normalizeClassName(r.className);
          return homeroomSet.has(cls) && allowedClassSet.has(cls);
        });
        const recalced = recalcAndRank(data);
        setScores(recalced);
        setIsTempLoaded(true);
        setLocalEdited(false);
        setExternalChangeAvailable(false);
      }
    } catch (err) {
      console.error("Load scores error:", err);
    } finally {
      setLoading(false);
    }
  };

  const checkExternalChange = async (weekNumber: number) => {
    try {
      const res = await api.get<{ changed: boolean }>(
        `/api/class-weekly-scores/check-changes/${weekNumber}`
      );
      setExternalChangeAvailable(Boolean(res.data?.changed));
    } catch (err) {
      console.error("check-changes error:", err);
      setExternalChangeAvailable(false);
    }
  };

  const recalcAndRank = (list: WeeklyScoreRow[]) => {
    const arr = list.map((r) => ({ ...r }));

    arr.forEach((row) => {
      const attendance = Number(row.attendanceScore ?? 0);
      const hygiene = Number(row.hygieneScore ?? 0);
      const lineup = Number(row.lineUpScore ?? 0);
      const violation = Number(row.violationScore ?? 0);
      const bonus = Number(row.bonusScore ?? 0);
      const academic = Number(row.academicScore ?? 0);

      const totalViolation = violation + lineup + hygiene + attendance * 5;
      const totalDiscipline = Number(disciplineMax) - totalViolation;

      row.totalViolation = totalViolation;
      row.totalDiscipline = totalDiscipline;
      row.totalScore = totalDiscipline + bonus + academic;
    });

    const byGrade: Record<string, WeeklyScoreRow[]> = {};
    arr.forEach((r) => {
      const g = String(r.grade ?? "Khác");
      if (!byGrade[g]) byGrade[g] = [];
      byGrade[g].push(r);
    });

    Object.values(byGrade).forEach((group) => {
      const sorted = [...group].sort(
        (a, b) => (b.totalScore ?? 0) - (a.totalScore ?? 0)
      );
      let prevScore: number | null = null;
      let prevRank = 0;
      let count = 0;
      sorted.forEach((row) => {
        count++;
        const sc = Number(row.totalScore ?? 0);
        if (prevScore === null) {
          prevScore = sc;
          prevRank = 1;
          row.ranking = 1;
        } else {
          if (sc === prevScore) {
            row.ranking = prevRank;
          } else {
            row.ranking = count;
            prevRank = count;
            prevScore = sc;
          }
        }
      });
      sorted.forEach((rSorted) => {
        const original = arr.find(
          (x) =>
            normalizeClassName(x.className) ===
              normalizeClassName(rSorted.className) &&
            String(x.grade) === String(rSorted.grade)
        );
        if (original) original.ranking = rSorted.ranking;
      });
    });

    return arr;
  };

  const handleScoreChange = (
    index: number,
    field: "bonusScore" | "academicScore",
    value: number
  ) => {
    const updated = [...scores];
    if (index < 0 || index >= updated.length) return;
    updated[index] = { ...updated[index], [field]: value };
    const recalced = recalcAndRank(updated);
    setScores(recalced);
    setLocalEdited(true);
    setExternalChangeAvailable(false);
  };

  // ... (giữ nguyên các hàm handleSave, handleUpdate, handleExport, handleDelete, renderTableByGrade, return JSX như code bạn gửi)

}
