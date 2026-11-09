// src/pages/violation/UnhandledViolationsPage.tsx
import { useState, useEffect } from 'react';
import {
  Box, Typography, TextField, MenuItem, Checkbox, FormControlLabel, Button,
  Table, TableHead, TableBody, TableRow, TableCell, Paper, Stack, ListItemText
} from '@mui/material';
import api from '../../api/api';
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import ExcelJS from 'exceljs';
dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.tz.setDefault("Asia/Ho_Chi_Minh");

interface Violation {
  _id: string;
  name: string;
  className: string;
  description: string;
  time: Date | string;
  handlingMethod: string;
  handled?: boolean;
  ruleCode?: string;
  groupCode?: string;
}

interface Rule {
  _id: string;
  ruleCode: string;
  groupCode: string;
  groupName?: string;
  title: string;
  point: number;
  active?: boolean;
}

interface Week {
  _id?: string;
  weekNumber?: number;
  start?: string;
  end?: string;
  label?: string;
}

const sortByTime = (data: Violation[]) => {
  return [...data].sort((a, b) => {
    const timeA = dayjs(a.time).isValid()
      ? dayjs(a.time).valueOf()
      : Number.MAX_SAFE_INTEGER;

    const timeB = dayjs(b.time).isValid()
      ? dayjs(b.time).valueOf()
      : Number.MAX_SAFE_INTEGER;

    return timeA - timeB;
  });
};

export default function UnhandledViolationsPage() {
  const [violations, setViolations] = useState<Violation[]>([]);
  const [filtered, setFiltered] = useState<Violation[]>([]);
  const [selectedClasses, setSelectedClasses] = useState<string[]>([]);
  const [searchName, setSearchName] = useState('');
  const [classList, setClassList] = useState<string[]>([]);
  const [selectedWeek, setSelectedWeek] = useState<string | number | ''>('all');
  const [onlyFrequent, setOnlyFrequent] = useState(false);
  const [weekList, setWeekList] = useState<Week[]>([]);

  const [ruleList, setRuleList] = useState<Rule[]>([]);
  const [selectedRules, setSelectedRules] = useState<string[]>([]);
  
  useEffect(() => {
    fetchViolations();
    fetchClasses();
    fetchWeeks();
    fetchRules();
  }, []);

  const fetchRules = async () => {
    try {
      const res = await api.get('/api/rules');
  
      const activeRules = res.data.filter(
        (rule: Rule) => rule.active !== false
      );
  
      setRuleList(activeRules);
    } catch (err) {
      console.error('Lỗi khi lấy danh sách nội quy:', err);
    }
  };

  const fetchViolations = async () => {
    try {
      const res = await api.get('/api/violations/all/all-student');
      const sortedData = sortByTime(res.data);
      setViolations(sortedData);
      setFiltered(sortedData);
    } catch (err) {
      console.error('Lỗi khi lấy dữ liệu vi phạm:', err);
    }
  };

  const fetchClasses = async () => {
    try {
      const res = await api.get('/api/classes');
      const validClasses = res.data
        .filter((cls: any) => cls.teacher)
        .map((cls: any) => cls.className);
      setClassList(validClasses);
    } catch (err) {
      console.error('Lỗi khi lấy danh sách lớp:', err);
    }
  };

  const fetchWeeks = async () => {
    try {
      const res = await api.get('/api/academic-weeks/study-weeks');
      setWeekList(res.data);
    } catch (err) {
      console.error('Lỗi khi lấy danh sách tuần:', err);
    }
  };

  const applyFilters = () => {
    let data = [...violations];
    if (selectedClasses.length > 0) {
      data = data.filter((v) => selectedClasses.includes(v.className));
    }
    // Lọc theo lỗi vi phạm từ danh sách nội quy
    if (selectedRules.length > 0) {
      const selectedRuleTitles = ruleList
        .filter((rule) =>
          selectedRules.includes(rule.ruleCode)
        )
        .map((rule) => rule.title);
    
      data = data.filter((v) => {
        // Ưu tiên đối chiếu bằng ruleCode
        if (v.ruleCode) {
          return selectedRules.includes(v.ruleCode);
        }
    
        // Hỗ trợ dữ liệu vi phạm cũ chưa có ruleCode
        return selectedRuleTitles.includes(v.description);
      });
    }
    if (selectedWeek !== 'all' && selectedWeek !== '') {
      const week = weekList.find(
        (w) =>
          (w.weekNumber !== undefined && String(w.weekNumber) === String(selectedWeek)) ||
          w.label === selectedWeek
      );
      if (week) {
        const start = (week.start ?? (week as any).startDate) || '';
        const end = (week.end ?? (week as any).endDate) || '';
        if (start && end) {
          data = data.filter(
            (v) =>
              dayjs(v.time).isAfter(dayjs(start).subtract(1, 'day')) &&
              dayjs(v.time).isBefore(dayjs(end).add(1, 'day'))
          );
        }
      }
    }

    if (searchName) {
      const keyword = searchName.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      data = data.filter((v) => {
        const studentName = (v.name || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        return studentName.includes(keyword);
      });
    }

    if (onlyFrequent) {
      const countMap: { [key: string]: number } = {};
      data.forEach((v) => {
        const normalized = v.name.trim().toLowerCase();
        countMap[normalized] = (countMap[normalized] || 0) + 1;
      });
      data = data.filter((v) => countMap[v.name.trim().toLowerCase()] >= 3);
    }

    data = sortByTime(data);
    setFiltered(data);
    
        setFiltered(data);
      };

  const clearFilters = () => {
    setSelectedClasses([]);
    setSelectedRules([]);
    setSearchName('');
    setSelectedWeek('all');
    setOnlyFrequent(false);
    setFiltered(sortByTime(violations));
  };

  const handleExportExcel = async () => {
  try {
    if (filtered.length === 0) {
      alert('Không có dữ liệu để xuất Excel!');
      return;
    }

    const workbook = new ExcelJS.Workbook();

    workbook.creator = 'Hệ thống quản lý học sinh';
    workbook.created = new Date();

    const worksheet = workbook.addWorksheet('Học sinh vi phạm');

    // Tiêu đề
    worksheet.mergeCells('A1:G1');

    const title = worksheet.getCell('A1');
    title.value = 'DANH SÁCH HỌC SINH VI PHẠM';

    title.font = {
      name: 'Times New Roman',
      size: 16,
      bold: true,
    };

    title.alignment = {
      horizontal: 'center',
      vertical: 'middle',
    };

    worksheet.getRow(1).height = 30;

    // Thông tin xuất báo cáo
    worksheet.mergeCells('A2:G2');

    worksheet.getCell('A2').value =
      `Ngày xuất: ${dayjs().format('DD/MM/YYYY HH:mm')}`;

    worksheet.getCell('A2').font = {
      name: 'Times New Roman',
      italic: true,
      size: 11,
    };

    // Tiêu đề cột
    worksheet.columns = [
      { header: 'STT', key: 'stt', width: 8 },
      { header: 'Họ tên', key: 'name', width: 28 },
      { header: 'Lớp', key: 'className', width: 12 },
      { header: 'Lỗi vi phạm', key: 'description', width: 55 },
      { header: 'Thời gian', key: 'time', width: 18 },
      { header: 'Hình thức xử lý', key: 'handlingMethod', width: 25 },
      { header: 'Trạng thái', key: 'status', width: 18 },
    ];

    const headerRow = worksheet.getRow(4);

    headerRow.values = [
      'STT',
      'Họ tên',
      'Lớp',
      'Lỗi vi phạm',
      'Thời gian',
      'Hình thức xử lý',
      'Trạng thái',
    ];

    headerRow.height = 25;

    headerRow.eachCell((cell) => {
      cell.font = {
        name: 'Times New Roman',
        bold: true,
        size: 12,
      };

      cell.alignment = {
        horizontal: 'center',
        vertical: 'middle',
        wrapText: true,
      };

      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF87CAFE' },
      };

      cell.border = {
        top: { style: 'thin' },
        bottom: { style: 'thin' },
        left: { style: 'thin' },
        right: { style: 'thin' },
      };
    });

    // Xuất dữ liệu đã lọc, theo thứ tự thời gian cũ nhất trước
    const exportData = sortByTime(filtered);

    exportData.forEach((v, index) => {
      const row = worksheet.addRow([
        index + 1,
        v.name,
        v.className,
        v.description,
        dayjs(v.time).isValid()
          ? dayjs(v.time).toDate()
          : 'Không rõ',
        v.handlingMethod || '-',
        v.handled ? 'Đã xử lý' : 'Chưa xử lý',
      ]);

      row.font = {
        name: 'Times New Roman',
        size: 12,
      };

      row.alignment = {
        vertical: 'middle',
        wrapText: true,
      };

      row.height = 22;

      row.eachCell((cell, colNumber) => {
        cell.border = {
          top: { style: 'thin' },
          bottom: { style: 'thin' },
          left: { style: 'thin' },
          right: { style: 'thin' },
        };

        if ([1, 3, 5, 7].includes(colNumber)) {
          cell.alignment = {
            horizontal: 'center',
            vertical: 'middle',
            wrapText: true,
          };
        }

        if (colNumber === 5 && cell.value instanceof Date) {
          cell.numFmt = 'dd/mm/yyyy';
        }
      });
    });

    // Bộ lọc Excel
    worksheet.autoFilter = {
      from: 'A4',
      to: 'G4',
    };

    // Cố định tiêu đề
    worksheet.views = [
      { state: 'frozen', ySplit: 4 },
    ];

    // Tạo file
    const buffer = await workbook.xlsx.writeBuffer();

    const blob = new Blob([buffer as BlobPart], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });

    const url = window.URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = `BaoCao_HocSinhViPham_${dayjs().format('DDMMYYYY_HHmm')}.xlsx`;

    link.click();

    window.URL.revokeObjectURL(url);

  } catch (error) {
    console.error('Lỗi xuất Excel:', error);
    alert('Không thể xuất file Excel!');
  }
};
  return (
    <Box sx={{ maxWidth: '100%', mx: 'auto', py: 4 }}>
      <Typography variant="h4" fontWeight="bold" align="center" gutterBottom>
        Học sinh vi phạm (báo cáo)
      </Typography>

      <Paper sx={{ width: '100%', overflowX: 'auto', borderRadius: 3, mt: 2, p: 2, mb: 4 }} elevation={3}>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems="center" flexWrap="wrap">
          <TextField
            label="Chọn lớp"
            select
            SelectProps={{
              multiple: true,
              renderValue: (selected: any) => {
                if (!selected || (Array.isArray(selected) && selected.length === 0)) return 'Tất cả lớp';
                return Array.isArray(selected) ? selected.join(', ') : String(selected);
              },
            }}
            value={selectedClasses}
            onChange={(e) =>
              setSelectedClasses(typeof e.target.value === 'string'
                ? e.target.value.split(',')
                : (e.target.value as string[]))
            }
            sx={{ minWidth: 200 }}
          >
            {classList.map((cls) => (
              <MenuItem key={cls} value={cls}>
                <Checkbox checked={selectedClasses.indexOf(cls) > -1} />
                <ListItemText primary={cls} />
              </MenuItem>
            ))}
          </TextField>

          <TextField
            label="Chọn tuần"
            select
            value={selectedWeek}
            onChange={(e) => {
              const v = e.target.value as string;
              if (v === 'all') return setSelectedWeek('all');
              if (v === '') return setSelectedWeek('');
              setSelectedWeek(isNaN(Number(v)) ? v : Number(v));
            }}
            sx={{ minWidth: 200 }}
          >
            <MenuItem value="all">Tất cả tuần</MenuItem>
            {weekList.map((w) => {
              const start = (w.start ?? (w as any).startDate) || '';
              const end = (w.end ?? (w as any).endDate) || '';
              const label = w.weekNumber !== undefined ? `Tuần ${w.weekNumber}` : w.label ?? 'Tuần';
              const range = start && end ? ` (${dayjs(start).format('DD/MM')} - ${dayjs(end).format('DD/MM')})` : '';
              const value = w.weekNumber !== undefined ? w.weekNumber : (w.label ?? '');
              return (
                <MenuItem key={String(value)} value={value}>
                  {label + range}
                </MenuItem>
              );
            })}
          </TextField>
          
          <TextField
            label="Tìm theo tên học sinh"
            value={searchName}
            onChange={(e) => setSearchName(e.target.value)}
            sx={{ minWidth: 200 }}
          />
          <TextField
            label="Chọn lỗi vi phạm"
            select
            SelectProps={{
              multiple: true,
              renderValue: (selected: any) => {
                if (!selected || selected.length === 0) {
                  return 'Tất cả lỗi';
                }
          
                return ruleList
                  .filter((rule) =>
                    selected.includes(rule.ruleCode)
                  )
                  .map((rule) => rule.title)
                  .join(', ');
              },
            }}
            value={selectedRules}
            onChange={(e) =>
              setSelectedRules(
                typeof e.target.value === 'string'
                  ? e.target.value.split(',')
                  : (e.target.value as string[])
              )
            }
            sx={{ minWidth: 260 }}
          >
            {ruleList.map((rule) => (
              <MenuItem
                key={rule.ruleCode}
                value={rule.ruleCode}
              >
                <Checkbox
                  checked={selectedRules.includes(rule.ruleCode)}
                />
          
                <ListItemText
                  primary={rule.title}
                  secondary={`${rule.ruleCode} - ${rule.groupCode}`}
                />
              </MenuItem>
            ))}
          </TextField>
          <FormControlLabel
            control={<Checkbox checked={onlyFrequent} onChange={(e) => setOnlyFrequent(e.target.checked)} />}
            label="Chỉ học sinh >= 3 vi phạm"
          />

          <Button variant="contained" onClick={applyFilters}>Áp dụng</Button>
          <Button variant="outlined" onClick={clearFilters}>Xóa lọc</Button>
          <Button variant="contained" color="success" onClick={handleExportExcel} disabled={filtered.length === 0} startIcon={<span>📊</span>}>Xuất Excel</Button>
        </Stack>
      </Paper>

      <Paper elevation={3} sx={{ width: '100%', overflowX: 'auto', borderRadius: 3, mt: 2 }}>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ backgroundColor: '#87cafe' }}>
              <TableCell>STT</TableCell>
              <TableCell>Họ tên</TableCell>
              <TableCell>Lớp</TableCell>
              <TableCell>Lỗi vi phạm</TableCell>
              <TableCell>Thời gian</TableCell>
              <TableCell>Hình thức xử lý</TableCell>
              <TableCell>Trạng thái</TableCell>
            </TableRow>
          </TableHead>

          <TableBody>
            {filtered.length > 0 ? (
              filtered.map((v, i) => (
                <TableRow key={v._id}>
                  <TableCell>{i + 1}</TableCell>
                  <TableCell>{v.name}</TableCell>
                  <TableCell>{v.className}</TableCell>
                  <TableCell>{v.description}</TableCell>
                  <TableCell>{v.time ? dayjs(v.time).format('DD/MM/YYYY') : 'Không rõ'}</TableCell>
                  <TableCell>{v.handlingMethod || '-'}</TableCell>
                  <TableCell>{v.handled ? 'Đã xử lý' : 'Chưa xử lý'}</TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={7} align="center">
                  Không có dữ liệu phù hợp.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Paper>
    </Box>
  );
}
