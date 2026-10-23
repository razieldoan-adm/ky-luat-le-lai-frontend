import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Paper,
  Snackbar,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import dayjs from 'dayjs';
import api from '../../api/api';

interface Violation {
  _id: string;
  name: string;
  className: string;
  description: string;
  time: Date | string;
  handled?: boolean;
  handledBy?: string;
  weekNumber?: number;
  academicYear?: string;
  ruleCode?: string;
  groupCode?: string;
  handlingNote?: string;
  s2ReviewStatus?: 'NOT_APPLICABLE' | 'PENDING' | 'APPROVED';
  s2ApprovedBy?: string;
  application?: {
    _id: string;
    status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'OVERDUE';
    note?: string;
    processedBy?: string;
    submittedAt?: string;
    processedAt?: string;
  } | null;
}

interface Rule {
  _id: string;
  title: string;
  content: string;
  ruleCode?: string;
}

interface Week {
  _id: string;
  weekNumber: number;
  startDate: string;
  endDate: string;
}

interface ReviewRow {
  key: string;
  name: string;
  className: string;
  academicYear: string;
  weekNumber: number;
  description: string;
  count: number;
  violations: Violation[];
  reasons: string[];
  matchingRules: { ruleKey: string; description: string; count: number }[];
  eligibleByTotal: boolean;
  eligibleByRepeatedRule: boolean;
  s2Violation?: Violation;
}

export default function StudentConductReviewPage() {
  const [violations, setViolations] = useState<Violation[]>([]);
  const [rules, setRules] = useState<Rule[]>([]);
  const [weeks, setWeeks] = useState<Week[]>([]);
  const [classList, setClassList] = useState<string[]>([]);
  const [directLeaveRuleCodes, setDirectLeaveRuleCodes] = useState<string[]>([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedWeek, setSelectedWeek] = useState('');
  const [loading, setLoading] = useState(true);
  const [applicationSubmitting, setApplicationSubmitting] = useState(false);
  const [selectedReviewRow, setSelectedReviewRow] = useState<ReviewRow | null>(null);
  const [applicationChoiceOpen, setApplicationChoiceOpen] = useState(false);
  const [applicationLimitOpen, setApplicationLimitOpen] = useState(false);
  const [violationForApplication, setViolationForApplication] = useState<Violation | null>(null);
  const [applicationSubmissionCount, setApplicationSubmissionCount] = useState(0);
  const [applicationSubmissionLimit, setApplicationSubmissionLimit] = useState(2);
  const [applicationMode, setApplicationMode] = useState<'APPROVED' | 'PENDING' | null>(null);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success' as 'success' | 'error' | 'warning',
  });
  const lastNotifiedReviewKeys = useRef<string[]>([]);
  const [seenReviewKeys, setSeenReviewKeys] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('seenRepeatedViolationReviewKeys');
      return saved ? (JSON.parse(saved) as string[]) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoading(true);
      try {
        const [violationRes, applicationRes, rulesRes, classesRes, weeksRes, currentWeekRes, directRulesRes] = await Promise.all([
          api.get('/api/violations/all/all-student'),
          api.get('/api/leave-applications/eligible'),
          api.get('/api/rules'),
          api.get('/api/classes'),
          api.get('/api/academic-weeks/study-weeks'),
          api.get('/api/academic-weeks/current'),
          api.get('/api/direct-leave-rules'),
        ]);
        if (!active) return;
        const applicationList = applicationRes.data?.data || [];
        const applicationMap = new Map<string, Violation['application']>(
          applicationList.map((item: any) => [String(item._id), item.application || null]),
        );
        const merged: Violation[] = (violationRes.data || []).map((v: Violation) => ({
          ...v,
          application: applicationMap.get(String(v._id)) || null,
        }));
        setViolations(merged);
        setRules(rulesRes.data || []);
        setClassList((classesRes.data || []).filter((c: any) => c.teacher).map((c: any) => c.className));
        setWeeks(weeksRes.data || []);
        if (currentWeekRes.data?.weekNumber) setSelectedWeek(String(currentWeekRes.data.weekNumber));
        setDirectLeaveRuleCodes(directRulesRes.data?.data?.ruleCodes || []);
      } catch (error) {
        console.error('Lỗi tải dữ liệu danh sách xem xét rèn luyện:', error);
        setSnackbar({ open: true, message: 'Không thể tải dữ liệu. Vui lòng tải lại trang.', severity: 'error' });
      } finally {
        if (active) setLoading(false);
      }
    };
    void load();
    return () => { active = false; };
  }, []);

  // Tổng hợp độc lập với bộ lọc; đổi lớp/tuần chỉ lọc kết quả đã tính.
  const allReviewRows = useMemo<ReviewRow[]>(() => {
    const rulesByCode = new Map<string, Rule>();
    const rulesByTitle = new Map<string, Rule>();
    const rulesByContent = new Map<string, Rule>();
    for (const rule of rules) {
      if (rule.ruleCode) rulesByCode.set(String(rule.ruleCode).trim().toUpperCase(), rule);
      if (rule.title) rulesByTitle.set(String(rule.title).trim().toLocaleLowerCase('vi'), rule);
      if (rule.content) rulesByContent.set(String(rule.content).trim().toLocaleLowerCase('vi'), rule);
    }

    const studentGroups = new Map<string, ReviewRow>();
    const s2ByStudentWeek = new Map<string, Violation>();
    for (const v of violations) {
      const nameKey = String(v.name || '').trim().toLocaleLowerCase('vi');
      const classKey = String(v.className || '').trim().toUpperCase();
      const academicYear = String(v.academicYear || '').trim();
      const weekNumber = Number(v.weekNumber);
      const groupKey = [nameKey, classKey, academicYear, weekNumber].join('|');

      if (
        String(v.groupCode || '').trim().toUpperCase() === 'S2' &&
        String(v.handlingNote || '').includes('[AUTO_S2_WEEKLY]')
      ) {
        s2ByStudentWeek.set(groupKey, v);
      }

      const isSummary =
        String(v.ruleCode || '').trim().toUpperCase() === 'S2-01' ||
        String(v.groupCode || '').trim().toUpperCase() === 'S2' ||
        String(v.description || '').trim().toLocaleLowerCase('vi') === 'tái vi phạm nhiều lần nội quy nhà trường';
      if (isSummary || !Number.isFinite(weekNumber) || weekNumber < 1) continue;

      const ruleCode = String(v.ruleCode || '').trim().toUpperCase();
      const descriptionKey = String(v.description || '').trim().toLocaleLowerCase('vi');
      const ruleKey = ruleCode || descriptionKey;
      const rule = (ruleCode ? rulesByCode.get(ruleCode) : undefined)
        || rulesByTitle.get(descriptionKey)
        || rulesByContent.get(descriptionKey);
      const ruleDescription = rule?.title || v.description || ruleCode || 'Chưa xác định tên lỗi';
      let row = studentGroups.get(groupKey);
      if (!row) {
        row = {
          key: groupKey,
          name: v.name,
          className: v.className,
          academicYear,
          weekNumber,
          description: '',
          count: 0,
          violations: [],
          reasons: [],
          matchingRules: [],
          eligibleByTotal: false,
          eligibleByRepeatedRule: false,
        };
        studentGroups.set(groupKey, row);
      }
      row.count += 1;
      row.violations.push(v);
      const matchingRule = row.matchingRules.find((item) => item.ruleKey === ruleKey);
      if (matchingRule) matchingRule.count += 1;
      else row.matchingRules.push({ ruleKey, description: ruleDescription, count: 1 });
    }

    return Array.from(studentGroups.values())
      .map((row) => {
        row.eligibleByTotal = row.count >= 5;
        row.eligibleByRepeatedRule = row.matchingRules.some((item) => item.count >= 3);
        row.reasons = [
          ...(row.eligibleByTotal ? ['Tổng số lần vi phạm từ 5 lần'] : []),
          ...(row.eligibleByRepeatedRule ? ['Cùng một nội quy từ 3 lần'] : []),
        ];
        row.description = row.matchingRules
          .filter((item) => item.count >= 3)
          .map((item) => `${item.description} (${item.count} lần)`)
          .join('; ') || `${row.matchingRules.length} nội dung vi phạm khác nhau`;
        row.s2Violation = s2ByStudentWeek.get(row.key);
        return row;
      })
      .filter((row) => row.eligibleByTotal || row.eligibleByRepeatedRule)
      .sort((a, b) => b.count - a.count || a.className.localeCompare(b.className));
  }, [violations, rules]);

  const repeatedViolationRows = useMemo(
    () => allReviewRows.filter((row) => (!selectedClass || row.className === selectedClass)
      && (!selectedWeek || String(row.weekNumber) === selectedWeek)),
    [allReviewRows, selectedClass, selectedWeek],
  );
  const unseenReviewRows = useMemo(
    () => repeatedViolationRows.filter((row) => !seenReviewKeys.includes(row.key)),
    [repeatedViolationRows, seenReviewKeys],
  );

  useEffect(() => {
    const newlyDetected = unseenReviewRows.filter((row) => !lastNotifiedReviewKeys.current.includes(row.key));
    if (newlyDetected.length > 0) {
      lastNotifiedReviewKeys.current = Array.from(new Set([
        ...lastNotifiedReviewKeys.current,
        ...newlyDetected.map((row) => row.key),
      ]));
      setSnackbar({
        open: true,
        message: `Phát hiện ${newlyDetected.length} học sinh đủ điều kiện xem xét hạ rèn luyện. Vui lòng kiểm tra danh sách.`,
        severity: 'warning',
      });
    }
  }, [unseenReviewRows]);

  const getApplicationSummary = (row: ReviewRow) => {
    const apps = row.violations.map((v) => v.application).filter((app) => app != null);
    return {
      total: apps.length,
      approved: apps.filter((app) => app?.status === 'APPROVED').length,
      pending: apps.filter((app) => app?.status === 'PENDING').length,
      rejected: apps.filter((app) => app?.status === 'REJECTED').length,
      overdue: apps.filter((app) => app?.status === 'OVERDUE').length,
    };
  };

  const refreshViolations = async () => {
    const [violationRes, applicationRes] = await Promise.all([
      api.get('/api/violations/all/all-student'),
      api.get('/api/leave-applications/eligible'),
    ]);
    const applicationList = applicationRes.data?.data || [];
    const applicationMap = new Map<string, Violation['application']>(
      applicationList.map((item: any) => [String(item._id), item.application || null]),
    );
    setViolations((violationRes.data || []).map((v: Violation) => ({
      ...v,
      application: applicationMap.get(String(v._id)) || null,
    })));
  };

  const handleApproveS2Review = async (row: ReviewRow) => {
    try {
      setApplicationSubmitting(true);
      const response = await api.post('/api/violations/review-s2/approve', {
        name: row.name, className: row.className, academicYear: row.academicYear, weekNumber: row.weekNumber,
      });
      setSnackbar({ open: true, message: response.data?.message || 'Đã duyệt hạ rèn luyện.', severity: 'success' });
      await refreshViolations();
      setSelectedReviewRow((previous) => previous ? { ...previous, s2Violation: response.data?.violation || previous.s2Violation } : previous);
    } catch (error: any) {
      setSnackbar({ open: true, message: error?.response?.data?.message || 'Không thể duyệt hạ rèn luyện.', severity: 'warning' });
    } finally {
      setApplicationSubmitting(false);
    }
  };

  const getViolationRuleCode = (violation: Violation) => {
    if (violation.ruleCode) return violation.ruleCode;
    return rules.find((rule) => rule.title?.trim().toLowerCase() === violation.description?.trim().toLowerCase())?.ruleCode || '';
  };
  const isViolationEligibleForLeave = (violation: Violation) => {
    const code = getViolationRuleCode(violation);
    return !!code && directLeaveRuleCodes.includes(code);
  };

  const handleSubmitApplication = (violation: Violation) => {
    if (violation.application) {
      setSnackbar({ open: true, message: 'Vi phạm này đã có đơn xin phép.', severity: 'warning' });
      return;
    }
    if (!isViolationEligibleForLeave(violation)) {
      setSnackbar({ open: true, message: 'Lỗi vi phạm này không nằm trong danh sách được phép nộp đơn xin phép.', severity: 'warning' });
      return;
    }
    setViolationForApplication(violation);
    setApplicationChoiceOpen(true);
  };

  const createApplicationFromViolation = async (mode: 'APPROVED' | 'PENDING', isException = false) => {
    if (!violationForApplication) return;
    try {
      setApplicationSubmitting(true);
      const violation = violationForApplication;
      const res = await api.post('/api/leave-applications', { violationId: violation._id, isException });
      let newApplication = res.data?.data;
      if (mode === 'APPROVED') {
        const applicationId = newApplication?._id || newApplication?.id;
        if (!applicationId) throw new Error('API tạo đơn không trả về mã đơn xin phép.');
        const approveRes = await api.patch(`/api/leave-applications/${applicationId}/approve`);
        newApplication = approveRes.data?.data || { ...newApplication, status: 'APPROVED' };
        await api.patch(`/api/violations/${violation._id}/handle`, { handled: false, handledBy: '', handlingMethod: '' });
      }
      setViolations((prev) => prev.map((v) => v._id === violation._id
        ? { ...v, application: newApplication, ...(mode === 'APPROVED' ? { handled: false, handledBy: '' } : {}) }
        : v));
      setSelectedReviewRow((prev) => prev ? {
        ...prev,
        violations: prev.violations.map((v) => v._id === violation._id
          ? { ...v, application: newApplication, ...(mode === 'APPROVED' ? { handled: false, handledBy: '' } : {}) }
          : v),
      } : prev);
      setApplicationChoiceOpen(false);
      setApplicationLimitOpen(false);
      setViolationForApplication(null);
      setApplicationMode(null);
      setSnackbar({ open: true, message: mode === 'APPROVED' ? 'Đã tạo và duyệt đơn trực tiếp.' : 'Đã tạo đơn. Đơn đang ở trạng thái chờ duyệt.', severity: 'success' });
    } catch (error: any) {
      setSnackbar({ open: true, message: error?.response?.data?.message || error?.message || 'Không thể tạo đơn xin phép.', severity: 'error' });
    } finally {
      setApplicationSubmitting(false);
    }
  };

  const handleChooseApplicationMode = async (mode: 'APPROVED' | 'PENDING') => {
    if (!violationForApplication) return;
    const ruleCode = getViolationRuleCode(violationForApplication);
    if (!ruleCode) {
      setSnackbar({ open: true, message: 'Không xác định được mã lỗi để kiểm tra số lần nộp đơn.', severity: 'error' });
      return;
    }
    try {
      setApplicationSubmitting(true);
      const params = new URLSearchParams();
      params.append('studentName', violationForApplication.name);
      params.append('className', violationForApplication.className);
      params.append('academicYear', violationForApplication.academicYear || '2026-2027');
      params.append('ruleCode', ruleCode);
      const res = await api.get(`/api/leave-applications/monthly-count?${params.toString()}`);
      const data = res.data?.data;
      const count = Number(data?.count || 0);
      const limit = Number(data?.limit || 2);
      setApplicationSubmissionCount(count);
      setApplicationSubmissionLimit(limit);
      setApplicationMode(mode);
      if (count >= limit) {
        setApplicationLimitOpen(true);
        return;
      }
      await createApplicationFromViolation(mode, false);
    } catch (error: any) {
      setSnackbar({ open: true, message: error?.response?.data?.message || 'Không thể kiểm tra số lần nộp đơn.', severity: 'error' });
    } finally {
      setApplicationSubmitting(false);
    }
  };

  const handleSubmitApplicationException = async () => {
    if (applicationMode) await createApplicationFromViolation(applicationMode, true);
  };

  const handleApproveApplication = async (violation: Violation) => {
    if (!violation.application?._id) return;
    try {
      setApplicationSubmitting(true);
      const res = await api.patch(`/api/leave-applications/${violation.application._id}/approve`);
      const updatedApp = res.data?.data || { ...violation.application, status: 'APPROVED' as const };
      setViolations((prev) => prev.map((v) => v._id === violation._id ? { ...v, application: updatedApp, handled: false, handledBy: '' } : v));
      setSelectedReviewRow((prev) => prev ? {
        ...prev,
        violations: prev.violations.map((v) => v._id === violation._id ? { ...v, application: updatedApp, handled: false, handledBy: '' } : v),
      } : prev);
      setSnackbar({ open: true, message: 'Đã duyệt đơn xin phép.', severity: 'success' });
    } catch (error: any) {
      setSnackbar({ open: true, message: error?.response?.data?.message || 'Không thể duyệt đơn xin phép.', severity: 'error' });
    } finally {
      setApplicationSubmitting(false);
    }
  };

  const markSeenAndOpen = () => {
    const merged = Array.from(new Set([...seenReviewKeys, ...repeatedViolationRows.map((row) => row.key)]));
    setSeenReviewKeys(merged);
    try { localStorage.setItem('seenRepeatedViolationReviewKeys', JSON.stringify(merged)); } catch { /* storage may be unavailable */ }
  };

  return (
    <Box sx={{ maxWidth: '100%', mx: 'auto', py: 3 }}>
      <Typography variant="h4" fontWeight="bold" align="center" gutterBottom>
        Danh sách học sinh cần xem xét rèn luyện
      </Typography>
      <Typography color="text.secondary" align="center" sx={{ mb: 3 }}>
        Đưa vào danh sách nếu tổng vi phạm từ 5 lần trở lên HOẶC cùng một nội quy từ 3 lần trở lên trong cùng tuần. Đây là danh sách xem xét, không tự động hạ bậc.
      </Typography>

      <Paper elevation={2} sx={{ p: 2, borderRadius: 2, mb: 3, border: unseenReviewRows.length ? '1px solid #ed6c02' : '1px solid #d7dce2' }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ xs: 'stretch', sm: 'center' }} justifyContent="space-between">
          <Box>
            <Typography fontWeight="bold">{repeatedViolationRows.length} học sinh đủ điều kiện xem xét</Typography>
            {unseenReviewRows.length > 0 && <Typography color="warning.dark" variant="body2">Có {unseenReviewRows.length} trường hợp mới chưa xem.</Typography>}
          </Box>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
            <TextField select size="small" label="Lọc theo lớp" value={selectedClass} onChange={(e) => setSelectedClass(e.target.value)} sx={{ minWidth: 150 }}>
              <MenuItem value="">Tất cả lớp</MenuItem>
              {classList.map((cls) => <MenuItem key={cls} value={cls}>{cls}</MenuItem>)}
            </TextField>
            <TextField select size="small" label="Tuần học" value={selectedWeek} onChange={(e) => setSelectedWeek(e.target.value)} sx={{ minWidth: 220 }}>
              <MenuItem value="">Tất cả tuần</MenuItem>
              {weeks.map((w) => <MenuItem key={w._id} value={String(w.weekNumber)}>Tuần {w.weekNumber} ({dayjs(w.startDate).format('DD/MM')} - {dayjs(w.endDate).format('DD/MM')})</MenuItem>)}
            </TextField>
            <Button variant="outlined" onClick={() => { setSelectedClass(''); setSelectedWeek(''); }}>Xóa lọc</Button>
            <Button variant="contained" onClick={markSeenAndOpen}>Đánh dấu đã xem</Button>
          </Stack>
        </Stack>
      </Paper>

      <Paper elevation={2} sx={{ borderRadius: 2, overflowX: 'auto' }}>
        <Table size="small" stickyHeader>
          <TableHead><TableRow sx={{ '& th': { bgcolor: '#fff0c2', fontWeight: 'bold', whiteSpace: 'nowrap' } }>
            {['STT', 'Họ tên', 'Lớp', 'Năm học', 'Tuần', 'Lý do xem xét', 'Tổng lần vi phạm', 'Đơn xin phép', 'Thao tác'].map((label) => <TableCell key={label}>{label}</TableCell>)}
          </TableRow></TableHead>
          <TableBody>
            {loading ? <TableRow><TableCell colSpan={9} align="center">Đang tải dữ liệu...</TableCell></TableRow>
              : repeatedViolationRows.length ? repeatedViolationRows.map((row, index) => {
                const apps = getApplicationSummary(row);
                return <TableRow key={row.key} sx={{ bgcolor: row.count >= 5 ? '#ffe0e0' : '#fffaf0' }}>
                  <TableCell>{index + 1}</TableCell><TableCell sx={{ whiteSpace: 'nowrap' }}>{row.name}</TableCell><TableCell>{row.className}</TableCell><TableCell>{row.academicYear || '-'}</TableCell><TableCell>{row.weekNumber}</TableCell>
                  <TableCell sx={{ minWidth: 240 }}>{row.reasons.join(' · ')}{row.eligibleByRepeatedRule && <Typography variant="caption" display="block" color="text.secondary">{row.description}</Typography>}</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 'bold', color: row.count >= 5 ? 'error.main' : 'warning.dark' }}>{row.count}</TableCell>
                  <TableCell sx={{ minWidth: 220 }}>{apps.total === 0 ? 'Chưa có đơn' : `Tổng ${apps.total} · Duyệt ${apps.approved} · Chờ ${apps.pending}${apps.rejected ? ` · Từ chối ${apps.rejected}` : ''}${apps.overdue ? ` · Quá hạn ${apps.overdue}` : ''}`}</TableCell>
                  <TableCell><Button size="small" variant="outlined" onClick={() => setSelectedReviewRow(row)}>Xem thông tin</Button></TableCell>
                </TableRow>;
              }) : <TableRow><TableCell colSpan={9} align="center" sx={{ py: 5 }}>Chưa có học sinh nào đạt điều kiện trong phạm vi lọc.</TableCell></TableRow>}
          </TableBody>
        </Table>
      </Paper>

      <Dialog open={!!selectedReviewRow} onClose={() => setSelectedReviewRow(null)} fullWidth maxWidth="lg">
        <DialogTitle>Chi tiết vi phạm và đơn xin phép{selectedReviewRow && <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>{selectedReviewRow.name} · Lớp {selectedReviewRow.className} · Tuần {selectedReviewRow.weekNumber} · {selectedReviewRow.description}</Typography>}</DialogTitle>
        <DialogContent dividers>
          {selectedReviewRow && <>
            <Typography fontWeight="bold" sx={{ mb: 1 }}>Các lần vi phạm ({selectedReviewRow.violations.length})</Typography>
            <Box sx={{ overflowX: 'auto', mb: 3 }}><Table size="small">
              <TableHead><TableRow>{['STT', 'Ngày giờ', 'Nội dung', 'Tình trạng xử lý', 'Đơn xin phép', 'Thao tác'].map((label) => <TableCell key={label} sx={{ fontWeight: 'bold', whiteSpace: 'nowrap' }}>{label}</TableCell>)}</TableRow></TableHead>
              <TableBody>{selectedReviewRow.violations.map((v, idx) => <TableRow key={v._id}>
                <TableCell>{idx + 1}</TableCell><TableCell sx={{ whiteSpace: 'nowrap' }}>{v.time ? dayjs(v.time).format('DD/MM/YYYY HH:mm') : 'Không rõ'}</TableCell><TableCell>{v.description}</TableCell>
                <TableCell>{v.application?.status === 'APPROVED' ? 'Đã duyệt đơn' : v.application?.status === 'PENDING' ? 'Đang chờ duyệt đơn' : v.application?.status === 'REJECTED' ? 'Đơn bị từ chối' : v.application?.status === 'OVERDUE' ? 'Đơn quá hạn' : v.handled ? `Đã xử lý (${v.handledBy || 'chưa rõ'})` : 'Chưa xử lý'}</TableCell>
                <TableCell>{v.application?.status === 'APPROVED' ? 'Đã nộp · Đã duyệt' : v.application?.status === 'PENDING' ? 'Đã nộp · Chờ duyệt' : v.application?.status === 'REJECTED' ? 'Đã nộp · Từ chối' : v.application?.status === 'OVERDUE' ? 'Đã nộp · Quá hạn' : 'Chưa có đơn'}{v.application?.note ? <Typography variant="caption" display="block">Ghi chú: {v.application.note}</Typography> : null}</TableCell>
                <TableCell sx={{ minWidth: 160 }}><Stack direction="row" spacing={1} flexWrap="wrap">
                  {v.application?.status === 'PENDING' && <Button size="small" variant="contained" color="success" disabled={applicationSubmitting} onClick={() => void handleApproveApplication(v)}>Duyệt đơn</Button>}
                  {!v.application && <Button size="small" variant="outlined" color="warning" disabled={applicationSubmitting} onClick={() => handleSubmitApplication(v)}>Nộp đơn</Button>}
                </Stack></TableCell>
              </TableRow>)}</TableBody>
            </Table></Box>
            <Alert severity={selectedReviewRow.s2Violation?.s2ReviewStatus === 'APPROVED' ? 'success' : 'warning'} sx={{ mb: 2 }}>
              Điều kiện xem xét: tổng vi phạm từ 5 lần hoặc cùng một nội quy từ 3 lần trong cùng tuần.
              {selectedReviewRow.s2Violation?.s2ReviewStatus === 'APPROVED' ? ` Đã duyệt hạ rèn luyện S2${selectedReviewRow.s2Violation.s2ApprovedBy ? ` bởi ${selectedReviewRow.s2Violation.s2ApprovedBy}` : ''}.` : ' S2 đang chờ duyệt không làm giảm điểm hạnh kiểm. Chỉ duyệt khi tất cả lỗi liên quan đã được PGT xử lý.'}
            </Alert>
            <Button variant="contained" color="error" disabled={applicationSubmitting || selectedReviewRow.s2Violation?.s2ReviewStatus === 'APPROVED'} onClick={() => void handleApproveS2Review(selectedReviewRow)}>
              {selectedReviewRow.s2Violation?.s2ReviewStatus === 'APPROVED' ? 'Đã duyệt hạ rèn luyện' : 'Duyệt hạ rèn luyện S2'}
            </Button>
          </>}
        </DialogContent>
        <DialogActions><Button onClick={() => setSelectedReviewRow(null)}>Đóng</Button></DialogActions>
      </Dialog>

      <Dialog open={applicationChoiceOpen} onClose={() => { if (!applicationSubmitting) { setApplicationChoiceOpen(false); setViolationForApplication(null); } }} fullWidth maxWidth="sm">
        <DialogTitle>Nộp đơn xin phép</DialogTitle><DialogContent dividers>
          <Alert severity="info" sx={{ mb: 2 }}>Lỗi này đã được cấu hình cho phép nộp đơn xin phép.</Alert>
          <Typography sx={{ mb: 1 }}>Học sinh: <strong>{violationForApplication?.name}</strong></Typography><Typography sx={{ mb: 1 }}>Lớp: <strong>{violationForApplication?.className}</strong></Typography><Typography sx={{ mb: 2 }}>Nội dung vi phạm: <strong>{violationForApplication?.description}</strong></Typography>
          <Stack spacing={1.5}><Button variant="contained" color="success" disabled={applicationSubmitting} onClick={() => void handleChooseApplicationMode('APPROVED')}>Duyệt trực tiếp</Button><Button variant="outlined" color="warning" disabled={applicationSubmitting} onClick={() => void handleChooseApplicationMode('PENDING')}>Chờ bổ sung đơn</Button></Stack>
        </DialogContent><DialogActions><Button disabled={applicationSubmitting} onClick={() => { setApplicationChoiceOpen(false); setViolationForApplication(null); }}>Hủy</Button></DialogActions>
      </Dialog>

      <Dialog open={applicationLimitOpen} onClose={() => { if (!applicationSubmitting) { setApplicationLimitOpen(false); setApplicationMode(null); } }} fullWidth maxWidth="sm">
        <DialogTitle>Cảnh báo số lần nộp đơn</DialogTitle><DialogContent dividers>
          <Alert severity="warning" sx={{ mb: 2 }}>Học sinh đã nộp đơn cho lỗi này <strong>{applicationSubmissionCount} lần</strong> trong tháng này.</Alert>
          <Typography sx={{ mb: 1 }}>Học sinh: <strong>{violationForApplication?.name}</strong></Typography><Typography sx={{ mb: 1 }}>Lớp: <strong>{violationForApplication?.className}</strong></Typography><Typography sx={{ mb: 2 }}>Nội dung: <strong>{violationForApplication?.description}</strong></Typography>
          <Alert severity="error">Đã hết số lần nộp đơn theo giới hạn hiện tại ({applicationSubmissionLimit} lần/tháng).</Alert>
        </DialogContent><DialogActions><Button disabled={applicationSubmitting} onClick={() => { setApplicationLimitOpen(false); setApplicationMode(null); }}>Không cho nộp</Button><Button variant="contained" color="warning" disabled={applicationSubmitting || !applicationMode} onClick={() => void handleSubmitApplicationException()}>{applicationSubmitting ? 'Đang nộp...' : 'Ngoại lệ – vẫn nộp'}</Button></DialogActions>
      </Dialog>

      <Snackbar open={snackbar.open} autoHideDuration={4000} onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert severity={snackbar.severity}>{snackbar.message}</Alert>
      </Snackbar>
    </Box>
  );
}

