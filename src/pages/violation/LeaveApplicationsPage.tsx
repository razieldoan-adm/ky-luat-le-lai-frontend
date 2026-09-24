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
} from '@mui/material';
import api from '../../api/api';

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

export default function LeaveApplicationsPage() {
  const [applications, setApplications] = useState<LeaveApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [processingId, setProcessingId] = useState<string | null>(null);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectNote, setRejectNote] = useState('');
  const [selectedApplication, setSelectedApplication] = useState<LeaveApplication | null>(null);  
  
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
