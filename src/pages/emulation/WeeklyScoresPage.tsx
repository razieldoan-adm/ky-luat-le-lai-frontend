import React, { useEffect, useState } from "react";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Trophy } from "lucide-react";

type ClassScore = {
  className: string;
  grade: string;
  academicScore: number;
  bonusScore: number;
  violationScore: number;
  cleanlinessScore: number;
  attendanceScore: number;
  lineScore: number;
  totalDiscipline: number;
  finalScore: number;
  rank: number;
};

type GradeData = {
  [grade: string]: ClassScore[];
};

const WeeklyScoresPage: React.FC = () => {
  const [week, setWeek] = useState<string>("1");
  const [data, setData] = useState<GradeData>({});
  const [loading, setLoading] = useState<boolean>(false);

  // Load data từ backend
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const res = await fetch(
          `${import.meta.env.VITE_API_URL}/class-violation-scores/week/${week}`
        );
        if (!res.ok) throw new Error("Lỗi khi tải dữ liệu");
        const json = await res.json();
        setData(json);
      } catch (error) {
        console.error(error);
        setData({});
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [week]);

  return (
    <div className="p-6">
      <Card className="shadow-lg">
        <CardContent>
          <div className="flex items-center mb-4 space-x-3">
            <Trophy className="text-yellow-500 w-7 h-7" />
            <h2 className="text-xl font-bold">
              Kết quả thi đua toàn trường theo tuần
            </h2>
          </div>

          {/* Dropdown chọn tuần */}
          <div className="mb-6 w-40">
            <Select value={week} onValueChange={setWeek}>
              <SelectTrigger>
                <SelectValue placeholder="Chọn tuần" />
              </SelectTrigger>
              <SelectContent>
                {Array.from({ length: 20 }, (_, i) => (
                  <SelectItem key={i + 1} value={(i + 1).toString()}>
                    Tuần {i + 1}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {loading ? (
            <p>Đang tải dữ liệu...</p>
          ) : (
            Object.keys(data).map((grade) => (
              <div key={grade} className="mb-10">
                <h3 className="text-lg font-semibold mb-2">
                  Khối {grade} ({data[grade].length} lớp)
                </h3>

                <Table className="border">
                  <TableHeader>
                    <TableRow>
                      <TableHead>STT</TableHead>
                      <TableHead>Lớp</TableHead>
                      <TableHead>Học tập</TableHead>
                      <TableHead>Điểm thưởng</TableHead>
                      <TableHead>Kỷ luật</TableHead>
                      <TableHead>Vệ sinh</TableHead>
                      <TableHead>Chuyên cần</TableHead>
                      <TableHead>Xếp hàng</TableHead>
                      <TableHead>Tổng điểm Nề nếp</TableHead>
                      <TableHead>Tổng kết</TableHead>
                      <TableHead>Xếp hạng</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data[grade].map((cls, idx) => (
                      <TableRow
                        key={cls.className}
                        className={
                          cls.rank === 1
                            ? "bg-yellow-100 font-bold"
                            : ""
                        }
                      >
                        <TableCell>{idx + 1}</TableCell>
                        <TableCell>{cls.className}</TableCell>
                        <TableCell>{cls.academicScore}</TableCell>
                        <TableCell>{cls.bonusScore}</TableCell>
                        <TableCell>{cls.violationScore}</TableCell>
                        <TableCell>{cls.cleanlinessScore}</TableCell>
                        <TableCell>{cls.attendanceScore}</TableCell>
                        <TableCell>{cls.lineScore}</TableCell>
                        <TableCell>{cls.totalDiscipline}</TableCell>
                        <TableCell>{cls.finalScore}</TableCell>
                        <TableCell>{cls.rank}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default WeeklyScoresPage;
