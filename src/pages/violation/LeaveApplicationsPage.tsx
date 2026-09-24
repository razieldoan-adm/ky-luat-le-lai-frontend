import { useEffect, useState } from 'react';
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
    </Box>
  );
}
