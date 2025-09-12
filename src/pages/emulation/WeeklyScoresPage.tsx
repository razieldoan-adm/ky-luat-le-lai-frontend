import React, { useEffect, useState } from "react";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { motion } from "framer-motion";

type ClassScore = {
  _id: string;
  className: string;
  grade: string;
  academicScore: number;   // SĐB
  bonusScore: number;      // ✅ Điểm thưởng
  violationScore: number;  // ❌ Điểm kỷ luật
  hygieneScore: number;    // Vệ sinh
  diligenceScore: number;  // Chuyên cần
};

export default function WeeklyScoresPage() {
  const [week, setWeek] = useState<number>(1);
  const [data, setData] = useState<ClassScore[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchScores = async () => {
      setLoading(true);
      try {
        const res = await fetch(
          `https://ky-luat-le-lai-backend.onrender.com/api/class-violation-scores/week/${week}`
        );
        if (!res.ok) throw new Error("Fetch failed");
        const json = await res.json();
        setData(Array.isArray(json) ? json : []);
      } catch (err) {
        console.error(err);
        setData([]);
      } finally {
        setLoading(false);
      }
    };
    fetchScores();
  }, [week]);

  // Tính toán điểm tổng dựa trên số liệu từ CSDL
  const processed = data.map((cls) => {
    const totalViolation = cls.violationScore;
    const totalScore =
      cls.academicScore +
      cls.bonusScore +
      cls.hygieneScore +
      cls.diligenceScore -
      totalViolation;

    return { ...cls, totalViolation, totalScore };
  });

  // Sắp xếp theo grade -> điểm giảm dần
  const grouped: Record<string, ClassScore[]> = {};
  processed.forEach((cls) => {
    if (!grouped[cls.grade]) grouped[cls.grade] = [];
    grouped[cls.grade].push(cls);
  });
  Object.keys(grouped).forEach((g) => {
    grouped[g].sort((a, b) => b.totalScore - a.totalScore);
  });

  return (
    <div className="p-6">
      <motion.h1
        className="text-2xl font-bold mb-4"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        Bảng điểm thi đua tuần
      </motion.h1>

      {/* Dropdown chọn tuần */}
      <div className="mb-6">
        <Select onValueChange={(v) => setWeek(Number(v))} defaultValue={String(week)}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Chọn tuần" />
          </SelectTrigger>
          <SelectContent>
            {Array.from({ length: 20 }, (_, i) => (
              <SelectItem key={i + 1} value={String(i + 1)}>
                Tuần {i + 1}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <p>Đang tải dữ liệu...</p>
      ) : (
        Object.keys(grouped).map((grade) => (
          <Card key={grade} className="mb-6 shadow-md">
            <CardContent>
              <h2 className="text-xl font-semibold mb-4">
                Khối {grade}
              </h2>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Lớp</TableHead>
                    <TableHead>SĐB</TableHead>
                    <TableHead>Điểm thưởng</TableHead>
                    <TableHead>Vệ sinh</TableHead>
                    <TableHead>Chuyên cần</TableHead>
                    <TableHead>Vi phạm</TableHead>
                    <TableHead>Tổng điểm</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {grouped[grade].map((cls, idx) => (
                    <TableRow
                      key={cls._id}
                      className={idx === 0 ? "bg-green-100" : ""}
                    >
                      <TableCell>{cls.className}</TableCell>
                      <TableCell>{cls.academicScore}</TableCell>
                      <TableCell>{cls.bonusScore}</TableCell>
                      <TableCell>{cls.hygieneScore}</TableCell>
                      <TableCell>{cls.diligenceScore}</TableCell>
                      <TableCell className="text-red-500 font-semibold">
                        -{cls.totalViolation}
                      </TableCell>
                      <TableCell className="font-bold">
                        {cls.totalScore}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}
