import { useState, useEffect } from 'react';
import api from '../../api/api';

export interface Week {
  _id: string;
  weekNumber: number;
  startDate: string;
  endDate: string;
}

export interface WeeklyScore {
  _id?: string;               // ID từ backend
  className: string;
  grade: string;
  academicScore: number;      // điểm học tập
  hygieneScore: number;       // điểm vệ sinh
  attendanceScore: number;    // điểm chuyên cần
  lineUpScore: number;        // điểm xếp hàng
  totalViolation: number;     // tổng điểm vi phạm
  totalScore: number;         // điểm tổng (hoc tập + thưởng + nền nếp)
  rank: number;
  bonusScore?: number;        // ✅ bổ sung cột điểm thưởng
}

export interface ClassType {
  className: string;
  grade: string;
  teacher: string;
}

export default function useWeeklyScores() {
  const [weeks, setWeeks] = useState<Week[]>([]);
  const [selectedWeek, setSelectedWeek] = useState<Week | null>(null);
  const [scores, setScores] = useState<WeeklyScore[]>([]);
  const [classesWithTeacher, setClassesWithTeacher] = useState<ClassType[]>([]);
  const [loading, setLoading] = useState(false);

  // 🚀 Load weeks & classes on mount
  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await fetchWeeks();
      await fetchClassesWithTeacher();
      setLoading(false);
    };
    init();
  }, []);

  // 🗓️ Fetch academic weeks
  const fetchWeeks = async () => {
    try {
      const res = await api.get('/api/academic-weeks/study-weeks');
      setWeeks(res.data);
      if (res.data.length > 0) setSelectedWeek(res.data[0]);
    } catch (err) {
      console.error('Lỗi khi load weeks:', err);
    }
  };

  // 👨‍🏫 Fetch classes with homeroom teacher
  const fetchClassesWithTeacher = async () => {
    try {
      const res = await api.get('/api/classes/with-teacher');
      setClassesWithTeacher(res.data);
    } catch (err) {
      console.error('Lỗi khi load classes with teacher:', err);
    }
  };

  // 🔧 Merge classesWithTeacher with scores data
  const mergeScoresWithClasses = (classes: ClassType[], scores: WeeklyScore[]) => {
    return classes.map(cls => {
      const found = scores.find(s => s.className === cls.className);
      return found || {
        className: cls.className,
        grade: cls.grade,
        academicScore: 0,
        hygieneScore: 0,
        attendanceScore: 0,
        lineUpScore: 0,
        totalViolation: 0,
        totalScore: 0,
        rank: 0,
        bonusScore: 0,
      };
    });
  };

  // 📊 Fetch weekly scores & merge
  const fetchScores = async (weekNumber: number) => {
    try {
      setLoading(true);
      if (classesWithTeacher.length === 0) await fetchClassesWithTeacher();

      const res = await api.get('/api/class-weekly-scores', { params: { weekNumber } });
      const merged = mergeScoresWithClasses(classesWithTeacher, res.data);

      setScores(merged);
      setLoading(false);
      return merged;
    } catch (err) {
      console.error('Lỗi khi fetch scores:', err);
      setLoading(false);
      return [];
    }
  };

  // 🔢 Calculate scores
  const calculateScores = async (weekNumber: number) => {
    try {
      setLoading(true);
      if (classesWithTeacher.length === 0) await fetchClassesWithTeacher();

      const res = await api.post('/api/class-weekly-scores/calculate', { weekNumber });
      const merged = mergeScoresWithClasses(classesWithTeacher, res.data);

      setScores(merged);
      setLoading(false);
      return merged;
    } catch (err) {
      console.error('Lỗi khi calculate scores:', err);
      setLoading(false);
      return [];
    }
  };

  // ➕ Calculate total & rank
  const calculateTotalAndRank = async (weekNumber: number) => {
    try {
      setLoading(true);
      if (classesWithTeacher.length === 0) await fetchClassesWithTeacher();

      const res = await api.post('/api/class-weekly-scores/calculate-total-rank', { weekNumber });
      const merged = mergeScoresWithClasses(classesWithTeacher, res.data);

      setScores(merged);
      setLoading(false);
      return merged;
    } catch (err) {
      console.error('Lỗi khi calculate total & rank:', err);
      setLoading(false);
      return [];
    }
  };

  // 💾 Save scores (chỉ khi chưa có dữ liệu)
  const saveScores = async (weekNumber: number, scoresToSave: WeeklyScore[]) => {
    try {
      await api.post('/api/class-weekly-scores', {
        weekNumber,
        scores: scoresToSave,
      });
    } catch (err) {
      console.error('Lỗi khi save scores:', err);
    }
  };

  // 🔄 Update scores (khi đã có dữ liệu)
  const updateScores = async (weekNumber: number, scoresToUpdate: WeeklyScore[]) => {
    try {
      await Promise.all(
        scoresToUpdate.map(score =>
          api.put(`/api/class-weekly-scores/${score._id}`, score)
        )
      );
    } catch (err) {
      console.error('Lỗi khi update scores:', err);
    }
  };

  return {
    weeks,
    selectedWeek,
    setSelectedWeek,
    scores,
    setScores,
    classesWithTeacher,
    loading,
    fetchScores,
    calculateScores,
    calculateTotalAndRank,
    saveScores,
    updateScores,
    fetchClassesWithTeacher,
  };
}
