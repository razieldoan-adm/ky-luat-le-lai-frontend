import React, { useState, useEffect, useMemo } from 'react';
import { 
    Container, Typography, Box, Grid, Table, 
    TableBody, TableCell, TableContainer, TableHead, 
    TableRow, Paper, Checkbox, Select, MenuItem, 
    FormControl, InputLabel, Button, LinearProgress, Alert 
} from '@mui/material';

// --- Giả định API Service ---
// Giả định bạn có một service hoặc instance axios để gọi API
const api = {
    // Giả định hàm này trả về danh sách lớp với className và grade
    getClasses: () => Promise.resolve([
        { className: '6A1', grade: '6', teacher: 'Cô A' },
        { className: '6A2', grade: '6', teacher: 'Cô B' },
        { className: '7B1', grade: '7', teacher: 'Thầy C' },
        { className: '8C1', grade: '8', teacher: 'Cô D' },
        // ... thêm các lớp khác
    ]),
    // Hàm này gọi API POST để lưu dữ liệu
    saveScores: (payload: any) => {
        // Thay thế bằng endpoint POST thực tế của bạn
        console.log("Saving Payload:", payload);
        return fetch('/api/class-hygiene-scores', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });
    },
    // Hàm này gọi API GET để lấy dữ liệu tuần
    getScoresByWeek: (weekNumber: number) => {
        // Thay thế bằng endpoint GET thực tế của bạn
        return fetch(`/api/class-hygiene-scores/by-week?weekNumber=${weekNumber}`)
            .then(res => res.json());
    },
};

// --- CÁC HẰNG SỐ VÀ CẤU TRÚC DỮ LIỆU ---

// Danh sách các khối học để nhóm lớp
const GRADES = ['6', '7', '8', '9'];

// Mô tả các cột (tương đương 6 ô check/ngày)
const COLUMN_HEADERS = [
    { label: 'Vắng Trực Sáng', session: 'Sáng', error: 'Lỗi 1' },
    { label: 'Quên Đèn/Quạt Sáng', session: 'Sáng', error: 'Lỗi 2' },
    { label: 'Quên Khóa Cửa Sáng', session: 'Sáng', error: 'Lỗi 3' },
    { label: 'Vắng Trực Chiều', session: 'Chiều', error: 'Lỗi 1' },
    { label: 'Quên Đèn/Quạt Chiều', session: 'Chiều', error: 'Lỗi 2' },
    { label: 'Quên Khóa Cửa Chiều', session: 'Chiều', error: 'Lỗi 3' },
];
const DAYS_OF_WEEK = ['T2', 'T3', 'T4', 'T5', 'T6'];
const SLOTS_PER_DAY = 6; // 6 lỗi/ngày

// Cấu trúc dữ liệu lớp học
interface ClassData {
    className: string;
    grade: string;
    scores: number[]; // Mảng 30 phần tử (5 ngày * 6 lỗi)
    total: number;
}

// Cấu trúc dữ liệu tuần (Giả định lấy được từ một hàm tính tuần)
interface WeekOption {
    weekNumber: number;
    label: string;
    startDate: string; // Quan trọng để gửi lên Backend
}

// Hàm giả định tính toán các tuần
const generateWeekOptions = (): WeekOption[] => {
    // Đây chỉ là dữ liệu giả định, bạn cần thay thế bằng logic tính tuần thực tế
    const today = new Date();
    const currentWeekNumber = Math.ceil((today.getDate() + 6) / 7); // Rất thô sơ, chỉ dùng ví dụ
    
    return Array.from({ length: 4 }, (_, i) => {
        const weekNum = currentWeekNumber + i;
        const startDate = new Date(); // Cần tính ngày bắt đầu tuần thực tế
        return {
            weekNumber: weekNum,
            label: `Tuần ${weekNum} (01/10 - 05/10)`, // Ví dụ
            startDate: startDate.toISOString().split('T')[0],
        };
    });
};

// Hàm tính tổng số lỗi (số lần giá trị là 1 trong mảng 30 điểm)
const calculateTotal = (scores: number[]): number => {
    return scores.filter(s => s === 1).length;
};

// --- COMPONENT CHÍNH ---

const ClassHygieneScorePage: React.FC = () => {
    const [classes, setClasses] = useState<any[]>([]);
    const [data, setData] = useState<{ [key: string]: ClassData[] }>({}); // Nhóm theo khối (grade)
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [selectedWeek, setSelectedWeek] = useState<WeekOption | null>(null);

    const weekOptions = useMemo(() => generateWeekOptions(), []);

    // 1. Khởi tạo dữ liệu (Tải danh sách lớp và điểm tuần)
    const initializeData = async (weekNum: number, allClasses: any[]) => {
        setLoading(true);
        setError(null);
        try {
            // Lấy điểm từ Backend (trả về mảng 30 điểm/lớp)
            const savedScores = await api.getScoresByWeek(weekNum);
            
            const initialData: { [key: string]: ClassData[] } = {};

            allClasses.forEach(cls => {
                const className = cls.className;
                
                // Tìm dữ liệu đã lưu cho lớp này
                const existingData = savedScores.find((s: any) => s.className === className);
                
                // Khởi tạo mảng 30 điểm (fill 0 nếu chưa có)
                const scores = existingData ? existingData.scores : Array(30).fill(0);
                
                const classEntry: ClassData = {
                    className: className,
                    grade: cls.grade,
                    scores: scores,
                    total: calculateTotal(scores),
                };

                if (!initialData[cls.grade]) {
                    initialData[cls.grade] = [];
                }
                initialData[cls.grade].push(classEntry);
            });

            // Sắp xếp lớp theo tên lớp trong từng khối (6A1, 6A2...)
            GRADES.forEach(grade => {
                if (initialData[grade]) {
                    initialData[grade].sort((a, b) => a.className.localeCompare(b.className));
                }
            });

            setData(initialData);

        } catch (err) {
            console.error("Lỗi khi tải hoặc khởi tạo dữ liệu:", err);
            setError("Không thể tải dữ liệu tuần. Vui lòng thử lại.");
        } finally {
            setLoading(false);
        }
    };

    // Tải danh sách lớp khi component mount
    useEffect(() => {
        const fetchClasses = async () => {
            try {
                const fetchedClasses = await api.getClasses();
                setClasses(fetchedClasses);
                
                // Chọn tuần đầu tiên mặc định
                if (weekOptions.length > 0) {
                    setSelectedWeek(weekOptions[0]);
                    initializeData(weekOptions[0].weekNumber, fetchedClasses);
                }
            } catch (err) {
                setError("Không thể tải danh sách lớp.");
                setLoading(false);
            }
        };
        fetchClasses();
    }, []);

    // Xử lý sự kiện khi thay đổi tuần
    const handleWeekChange = (event: any) => {
        const selected = weekOptions.find(w => w.weekNumber === event.target.value) || null;
        setSelectedWeek(selected);
        if (selected) {
            initializeData(selected.weekNumber, classes);
        }
    };

    // 2. Xử lý click vào ô Checkbox (Toggle giá trị 0 <-> 1)
    const handleToggle = (grade: string, className: string, index: number) => {
        setData(prevData => {
            const gradeData = prevData[grade];
            const classIndex = gradeData.findIndex(c => c.className === className);
            
            if (classIndex === -1) return prevData;

            const newScores = [...gradeData[classIndex].scores];
            // Toggle giá trị: 1 thành 0, 0 thành 1
            newScores[index] = newScores[index] === 1 ? 0 : 1;

            const newClassEntry: ClassData = {
                ...gradeData[classIndex],
                scores: newScores,
                total: calculateTotal(newScores),
            };

            const newGradeData = [...gradeData];
            newGradeData[classIndex] = newClassEntry;

            return {
                ...prevData,
                [grade]: newGradeData,
            };
        });
    };

    // 3. Xử lý lưu dữ liệu
    const handleSave = async () => {
        if (!selectedWeek || saving) return;
        setSaving(true);
        setError(null);

        try {
            // Chuẩn bị payload tương thích với Controller Backend
            const payload = {
                weekNumber: selectedWeek.weekNumber,
                weekStartDate: selectedWeek.startDate, // Truyền ngày bắt đầu tuần
                scores: GRADES.flatMap((g) => 
                    (data[g] || []).map((c) => ({
                        // Gửi className (thay vì classId) lên Backend
                        className: c.className, 
                        grade: c.grade,
                        scores: c.scores, // Mảng 30 điểm
                    }))
                ),
            };

            const response = await api.saveScores(payload);
            if (!response.ok) {
                throw new Error("Lỗi Server khi lưu.");
            }
            
            alert('Lưu điểm thành công!');
        } catch (err) {
            console.error("Lỗi khi lưu điểm:", err);
            setError('Lưu dữ liệu thất bại. Vui lòng kiểm tra console.');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <Container sx={{ mt: 5 }}>
                <LinearProgress />
                <Typography variant="h6" align="center" sx={{ mt: 2 }}>Đang tải dữ liệu...</Typography>
            </Container>
        );
    }
    
    // --- Giao diện hiển thị Lưới nhập liệu ---
    return (
        <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                <Typography variant="h4" component="h1">
                    Bảng Ghi Nhận Điểm Vệ Sinh Hàng Ngày
                </Typography>
                <Box display="flex" gap={2}>
                    <FormControl sx={{ minWidth: 200 }} size="small">
                        <InputLabel>Chọn Tuần</InputLabel>
                        <Select
                            value={selectedWeek?.weekNumber || ''}
                            label="Chọn Tuần"
                            onChange={handleWeekChange}
                        >
                            {weekOptions.map(week => (
                                <MenuItem key={week.weekNumber} value={week.weekNumber}>
                                    {week.label}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                    <Button 
                        variant="contained" 
                        color="primary" 
                        onClick={handleSave} 
                        disabled={saving || !selectedWeek}
                    >
                        {saving ? 'Đang Lưu...' : 'LƯU DỮ LIỆU'}
                    </Button>
                </Box>
            </Box>

            {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

            {/* Hiển thị bảng cho từng khối */}
            {GRADES.map(grade => {
                const gradeData = data[grade];
                if (!gradeData || gradeData.length === 0) return null;

                return (
                    <Box key={grade} component={Paper} elevation={3} sx={{ mb: 4 }}>
                        <Typography 
                            variant="h5" 
                            sx={{ p: 2, backgroundColor: '#f5f5f5', borderBottom: '1px solid #ddd' }}
                        >
                            Khối {grade}
                        </Typography>
                        <TableContainer>
                            <Table size="small" stickyHeader>
                                <TableHead>
                                    <TableRow>
                                        <TableCell sx={{ fontWeight: 'bold', width: '80px' }}>Lớp</TableCell>
                                        
                                        {/* Cột Điểm chi tiết (5 ngày * 6 lỗi) */}
                                        {DAYS_OF_WEEK.map((day, dIdx) => (
                                            <TableCell key={day} colSpan={SLOTS_PER_DAY} align="center" sx={{ fontWeight: 'bold', borderLeft: '1px solid #ddd' }}>
                                                {day}
                                            </TableCell>
                                        ))}
                                        
                                        <TableCell sx={{ fontWeight: 'bold', width: '80px' }}>Tổng Lỗi</TableCell>
                                    </TableRow>
                                    <TableRow>
                                        <TableCell></TableCell>
                                        {/* Cột Chi tiết 6 lỗi (Lỗi 1, 2, 3 Sáng/Chiều) */}
                                        {DAYS_OF_WEEK.map((day, dIdx) => (
                                            <React.Fragment key={`detail-${day}`}>
                                                {COLUMN_HEADERS.map((header, hIdx) => (
                                                    <TableCell 
                                                        key={`${day}-${hIdx}`} 
                                                        align="center" 
                                                        sx={{ fontSize: '0.75rem', p: '4px 2px' }}
                                                    >
                                                        {header.label.slice(0, 10)}...
                                                    </TableCell>
                                                ))}
                                            </React.Fragment>
                                        ))}
                                        <TableCell></TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {gradeData.map((cls, classIndex) => (
                                        <TableRow key={cls.className}>
                                            <TableCell sx={{ fontWeight: 'bold' }}>{cls.className}</TableCell>
                                            
                                            {/* 30 ô check (5 ngày x 6 lỗi) */}
                                            {cls.scores.map((score, scoreIndex) => (
                                                <TableCell key={scoreIndex} align="center" sx={{ p: 0 }}>
                                                    <Checkbox
                                                        checked={score === 1}
                                                        onChange={() => handleToggle(cls.grade, cls.className, scoreIndex)}
                                                        size="small"
                                                        sx={{ p: '2px' }}
                                                    />
                                                </TableCell>
                                            ))}

                                            {/* Tổng lỗi */}
                                            <TableCell align="center" sx={{ fontWeight: 'bold', color: cls.total > 0 ? 'red' : 'inherit' }}>
                                                {cls.total}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    </Box>
                );
            })}
        </Container>
    );
};

export default ClassHygieneScorePage;
