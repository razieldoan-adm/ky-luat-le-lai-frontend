import React, { useEffect, useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  Chip,
  CircularProgress,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  List,
  ListItemButton,
  ListItemText,
  Stack,
} from '@mui/material';
import api from '../../api/api';

function removeVietnameseTones(str: string): string {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D');
}
let recognition: any = null;
let stopTimer: any = null;

interface LeaveApplication {
  _id: string;
  violationId: string;
  studentName: string;
  className: string;
  academicYear: string;
  weekNumber: number;
  ruleCode?: string;
  groupCode?: string;
  description?: string;
  originalPenalty?: number;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'OVERDUE';
  submittedAt?: string;
  deadlineAt?: string | null;
  processedAt?: string | null;
  processedBy?: string;
  note?: string;
}
interface StudentSuggestion {
  _id: string;
  name: string;
  className: string;
}
export default function LeaveApplicationsPage() {
  const [applications, setApplications] = useState<LeaveApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [processingId, setProcessingId] = useState<string | null>(null);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectNote, setRejectNote] = useState('');
  const [selectedApplication, setSelectedApplication] = useState<LeaveApplication | null>(null);  

  const [studentName, setStudentName] = useState('');
  const [studentSuggestions, setStudentSuggestions] = useState<StudentSuggestion[]>([]);
  
  const [selectedStudent, setSelectedStudent] = useState<StudentSuggestion | null>(null);
  
  const [isListening, setIsListening] = useState(false);
  
  const [directApplicationDialogOpen, setDirectApplicationDialogOpen] = useState(false);
  
  const [applicationContent, setApplicationContent] = useState('');


  // =========================
  // PHẦN 6 ĐẶT Ở ĐÂY
  // =========================
  useEffect(() => {
  const SR =
    (window as any).webkitSpeechRecognition ||
    (window as any).SpeechRecognition;

  if (!SR) {
    console.warn('Trình duyệt không hỗ trợ nhận dạng giọng nói');
    return;
  }

  recognition = new SR();
  recognition.lang = 'vi-VN';
  recognition.continuous = false;
  recognition.interimResults = true;

  return () => {
    try {
      recognition?.stop();
    } catch {
      // Không làm gì
    }

    clearTimeout(stopTimer);
  };
}, []);


  // =========================
// PHẦN 7
// =========================
const startVoice = () => {
  if (!recognition) {
    setError('Trình duyệt không hỗ trợ nhận dạng giọng nói.');
    return;
  }

  try {
    setIsListening(true);
    recognition.start();
  } catch (error) {
    console.error('Lỗi khởi động microphone:', error);
  }

  recognition.onresult = async (event: any) => {
    let interimText = '';
    let finalText = '';

    for (
      let i = event.resultIndex;
      i < event.results.length;
      i++
    ) {
      const transcript =
        event.results[i][0].transcript;

      if (event.results[i].isFinal) {
        finalText += transcript;
      } else {
        interimText += transcript;
      }
    }

    if (interimText) {
      setStudentName(interimText);
    }

    if (finalText) {
      const text = finalText.trim();

      setStudentName(text);
      setSelectedStudent(null);
      setStudentSuggestions([]);

      try {
        const params = new URLSearchParams();

        params.append('name', text);
        params.append(
          'normalizedName',
          removeVietnameseTones(text)
        );

        const res = await api.get(
          `/api/students/search?${params.toString()}`
        );

        setStudentSuggestions(res.data);
      } catch (error) {
        console.error(
          'Lỗi tìm học sinh bằng giọng nói:',
          error
        );

        setStudentSuggestions([]);
      }
    }

    clearTimeout(stopTimer);

    stopTimer = setTimeout(() => {
      try {
        recognition.stop();
      } catch {
        // Không làm gì
      }
    }, 200);
  };

  recognition.onerror = () => {
    setIsListening(false);
  };

  recognition.onend = () => {
    setIsListening(false);
  };
};

  // =========================
// PHẦN 8
// =========================
useEffect(() => {
  if (!studentName.trim()) {
    setStudentSuggestions([]);
    return;
  }

  if (selectedStudent) {
    return;
  }

  const timeout = setTimeout(() => {
    const params = new URLSearchParams();

    params.append('name', studentName.trim());
    params.append(
      'normalizedName',
      removeVietnameseTones(studentName.trim())
    );

    api
      .get(`/api/students/search?${params.toString()}`)
      .then((res) => {
        setStudentSuggestions(res.data);
      })
      .catch((err) => {
        console.error('Lỗi tìm học sinh:', err);
        setStudentSuggestions([]);
      });
  }, 300);

  return () => clearTimeout(timeout);
}, [studentName, selectedStudent]);
  
  
  const fetchApplications = async () => {
    try {
      setLoading(true);
      setError('');

      const res = await api.get('/api/leave-applications');

      console.log('📋 API đơn xin phép:', res.data);

      const data = res.data?.data || [];

      setApplications(data);
    } catch (err: any) {
      console.error('Lỗi lấy danh sách đơn xin phép:', err);

      setError(
        err?.response?.data?.message ||
          'Không thể tải danh sách đơn xin phép.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id: string) => {
  try {
    setProcessingId(id);

    await api.patch(`/api/leave-applications/${id}/approve`);

    await fetchApplications();
  } catch (error: any) {
    console.error('Lỗi duyệt đơn:', error);

    setError(
      error?.response?.data?.message ||
        'Không thể duyệt đơn xin phép.'
    );
  } finally {
    setProcessingId(null);
  }
};

  const handleOpenReject = (application: LeaveApplication) => {
    setSelectedApplication(application);
    setRejectNote('');
    setRejectDialogOpen(true);
  };

  const handleReject = async () => {
  if (!selectedApplication) return;

  if (!rejectNote.trim()) {
    setError('Vui lòng nhập lý do từ chối đơn.');
    return;
  }

  try {
    setProcessingId(selectedApplication._id);

    await api.patch(
      `/api/leave-applications/${selectedApplication._id}/reject`,
      {
        note: rejectNote.trim(),
      }
    );

    setRejectDialogOpen(false);
    setSelectedApplication(null);
    setRejectNote('');

    await fetchApplications();
  } catch (error: any) {
    console.error('Lỗi từ chối đơn:', error);

    setError(
      error?.response?.data?.message ||
        'Không thể từ chối đơn xin phép.'
    );
  } finally {
    setProcessingId(null);
  }
};
  
  useEffect(() => {
    fetchApplications();
  }, []);

  const getStatusLabel = (status: LeaveApplication['status']) => {
    switch (status) {
      case 'PENDING':
        return 'Chờ duyệt';
      case 'APPROVED':
        return 'Đã duyệt';
      case 'REJECTED':
        return 'Từ chối';
      case 'OVERDUE':
        return 'Quá hạn';
      default:
        return status;
    }
  };

  const getStatusColor = (
    status: LeaveApplication['status']
  ): 'warning' | 'success' | 'error' | 'default' => {
    switch (status) {
      case 'PENDING':
        return 'warning';
      case 'APPROVED':
        return 'success';
      case 'REJECTED':
        return 'error';
      case 'OVERDUE':
        return 'error';
      default:
        return 'default';
    }
  };

  const formatDate = (value?: string | null) => {
    if (!value) return '-';

    return new Date(value).toLocaleString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <Box sx={{ maxWidth: '100%', mx: 'auto', py: 3 }}>
      <Typography
        variant="h4"
        fontWeight="bold"
        align="center"
        gutterBottom
      >
        Nhận đơn xin phép
      </Typography>
    <Paper
  elevation={3}
  sx={{
    p: 3,
    mb: 3,
    borderRadius: 3,
  }}
>
  <Typography
    variant="h6"
    fontWeight="bold"
    sx={{ mb: 2 }}
  >
    Nộp đơn xin phép trực tiếp
  </Typography>

  <Stack
    direction={{ xs: 'column', sm: 'row' }}
    spacing={1}
  >
    <TextField
      fullWidth
      label="Nhập tên học sinh"
      placeholder="Nhập hoặc đọc tên học sinh..."
      value={studentName}
      onChange={(e) => {
        setStudentName(e.target.value);
        setSelectedStudent(null);
      }}
    />

    <Button
      variant={isListening ? 'contained' : 'outlined'}
      color={isListening ? 'error' : 'secondary'}
      onClick={startVoice}
      sx={{
        minWidth: { xs: '100%', sm: 130 },
      }}
    >
      {isListening ? '🎙️ Đang nghe...' : '🎤 Nói'}
    </Button>
  </Stack>

  {selectedStudent && (
    <Alert
      severity="success"
      sx={{ mt: 2 }}
    >
      Đã chọn học sinh:{' '}
      <strong>{selectedStudent.name}</strong>
      {' — '}
      <strong>{selectedStudent.className}</strong>
    </Alert>
  )}

  {studentSuggestions.length > 0 && !selectedStudent && (
    <Paper
      elevation={2}
      sx={{
        mt: 2,
        maxHeight: 250,
        overflowY: 'auto',
      }}
    >
      <Typography
        sx={{
          px: 2,
          pt: 1.5,
          fontWeight: 600,
        }}
      >
        Gợi ý học sinh:
      </Typography>

      <List>
        {studentSuggestions.map((student) => (
          <ListItemButton
            key={student._id}
            onClick={() => {
              setSelectedStudent(student);
              setStudentName(student.name);
              setStudentSuggestions([]);

              setDirectApplicationDialogOpen(true);
            }}
          >
            <ListItemText
              primary={`Tên: ${student.name}`}
              secondary={`Lớp: ${student.className}`}
            />
          </ListItemButton>
        ))}
      </List>
    </Paper>
  )}
</Paper>

      <Dialog
  open={directApplicationDialogOpen}
  onClose={() => {
    setDirectApplicationDialogOpen(false);
    setApplicationContent('');
  }}
  fullWidth
  maxWidth="sm"
>
  <DialogTitle>
    Nộp đơn xin phép
  </DialogTitle>

  <DialogContent>
    <Typography sx={{ mb: 2 }}>
      Học sinh:{' '}
      <strong>{selectedStudent?.name}</strong>
      <br />
      Lớp:{' '}
      <strong>{selectedStudent?.className}</strong>
    </Typography>

    <TextField
      label="Nội dung xin phép"
      fullWidth
      multiline
      minRows={4}
      value={applicationContent}
      onChange={(e) =>
        setApplicationContent(e.target.value)
      }
      placeholder="Nhập nội dung xin phép..."
    />
  </DialogContent>

  <DialogActions>
    <Button
      onClick={() => {
        setDirectApplicationDialogOpen(false);
        setApplicationContent('');
        setSelectedStudent(null);
        setStudentName('');
        setStudentSuggestions([]);
      }}
    >
      Hủy
    </Button>

    <Button
      variant="contained"
      disabled={!applicationContent.trim()}
      onClick={() => {
        // Chưa gọi API ở bước này
        console.log('Học sinh:', selectedStudent);
        console.log(
          'Nội dung xin phép:',
          applicationContent
        );
      }}
    >
      Nộp đơn
    </Button>
  </DialogActions>
</Dialog>
      <Typography
        align="center"
        color="text.secondary"
        sx={{ mb: 3 }}
      >
        Danh sách đơn xin phép của học sinh
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Paper
        elevation={3}
        sx={{
          borderRadius: 3,
          overflowX: 'auto',
        }}
      >
        {loading ? (
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              py: 6,
            }}
          >
            <CircularProgress />
          </Box>
        ) : (
          <Table size="small">
            <TableHead>
              <TableRow sx={{ backgroundColor: '#87cafe' }}>
                <TableCell>STT</TableCell>
                <TableCell>Họ tên</TableCell>
                <TableCell>Lớp</TableCell>
                <TableCell>Tuần</TableCell>
                <TableCell>Lỗi vi phạm</TableCell>
                <TableCell>Điểm phạt</TableCell>
                <TableCell>Ngày nộp</TableCell>
                <TableCell>Hạn xử lý</TableCell>
                <TableCell>Trạng thái</TableCell>
                <TableCell>Ghi chú</TableCell>
                <TableCell>Thao tác</TableCell>
              </TableRow>
            </TableHead>

            <TableBody>
              {applications.length > 0 ? (
                applications.map((application, index) => (
                  <TableRow key={application._id}>
                    <TableCell>{index + 1}</TableCell>

                    <TableCell>
                      {application.studentName}
                    </TableCell>

                    <TableCell>
                      {application.className}
                    </TableCell>

                    <TableCell>
                      {application.weekNumber}
                    </TableCell>

                    <TableCell>
                      {application.description || '-'}
                    </TableCell>

                    <TableCell>
                      {application.originalPenalty ?? 0}
                    </TableCell>

                    <TableCell>
                      {formatDate(application.submittedAt)}
                    </TableCell>

                    <TableCell>
                      {formatDate(application.deadlineAt)}
                    </TableCell>

                    <TableCell>
                      <Chip
                        label={getStatusLabel(application.status)}
                        color={getStatusColor(application.status)}
                        size="small"
                      />
                    </TableCell>

                    <TableCell>
                      {application.note || '-'}
                    </TableCell>
                    <TableCell>
  {application.status === 'PENDING' ? (
    <Box sx={{ display: 'flex', gap: 1 }}>
      <Button
        variant="contained"
        color="success"
        size="small"
        disabled={processingId === application._id}
        onClick={() => handleApprove(application._id)}
      >
        Duyệt
      </Button>

      <Button
        variant="outlined"
        color="error"
        size="small"
        disabled={processingId === application._id}
        onClick={() => handleOpenReject(application)}
      >
        Từ chối
      </Button>
    </Box>
  ) : (
    '-'
  )}
</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={10}
                    align="center"
                    sx={{ py: 4 }}
                  >
                    Chưa có đơn xin phép.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        )}
      </Paper>
      <Dialog
  open={rejectDialogOpen}
  onClose={() => {
    if (processingId === null) {
      setRejectDialogOpen(false);
    }
  }}
  fullWidth
  maxWidth="sm"
>
  <DialogTitle>Từ chối đơn xin phép</DialogTitle>

  <DialogContent>
    <Typography sx={{ mb: 2 }}>
      Học sinh: <strong>{selectedApplication?.studentName}</strong>
      <br />
      Lớp: <strong>{selectedApplication?.className}</strong>
    </Typography>

    <TextField
      label="Lý do từ chối"
      fullWidth
      multiline
      minRows={3}
      value={rejectNote}
      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setRejectNote(e.target.value)}
      placeholder="Ví dụ: Không nộp đơn đúng hạn..."
    />
  </DialogContent>

  <DialogActions>
    <Button
      onClick={() => setRejectDialogOpen(false)}
      disabled={processingId !== null}
    >
      Hủy
    </Button>

    <Button
      variant="contained"
      color="error"
      onClick={handleReject}
      disabled={
        processingId !== null || !rejectNote.trim()
      }
    >
      {processingId !== null ? 'Đang xử lý...' : 'Xác nhận từ chối'}
    </Button>
  </DialogActions>
</Dialog>
    </Box>
  );
}
