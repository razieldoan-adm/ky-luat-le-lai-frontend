import React, { useEffect, useMemo, useState } from 'react';
import api from '../api/api';

import {
  Box,
  Typography,
  Paper,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Chip,
  Alert,
  Divider,
  CircularProgress,
  useMediaQuery,
  useTheme,
} from '@mui/material';

interface Rule {
  _id: string;
  groupCode: string;
  groupName: string;
  ruleCode: string;
  title: string;
  point: number;
  content: string;
  active: boolean;
}

const RulesPage: React.FC = () => {
  const [rules, setRules] = useState<Rule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const fetchRules = async () => {
    try {
      setLoading(true);
      setError('');

      const res = await api.get('/api/rules');

      // Chỉ lấy nội quy đang sử dụng
      const activeRules = res.data.filter(
        (rule: Rule) => rule.active !== false
      );

      setRules(activeRules);
    } catch (err) {
      console.error('Lỗi tải nội quy:', err);
      setError('Không thể tải danh sách nội quy.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRules();
  }, []);

  // ==========================================
  // NHÓM RULE
  // ==========================================

  const groupedRules = useMemo(() => {
    const groups: Record<string, Rule[]> = {};

    rules.forEach((rule) => {
      if (!groups[rule.groupCode]) {
        groups[rule.groupCode] = [];
      }

      groups[rule.groupCode].push(rule);
    });

    // Sắp xếp nhóm N1 → N5 → S1
    return Object.entries(groups).sort(([codeA], [codeB]) => {
      const getOrder = (code: string) => {
        if (code.startsWith('N')) {
          return Number(code.substring(1));
        }

        if (code === 'S1') {
          return 100;
        }

        return 999;
      };

      return getOrder(codeA) - getOrder(codeB);
    });
  }, [rules]);

  // ==========================================
  // MÀU NHÓM
  // ==========================================

  const getGroupColor = (groupCode: string) => {
    if (groupCode === 'S1') {
      return 'error';
    }

    return 'primary';
  };

  // ==========================================
  // LOADING
  // ==========================================

  if (loading) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="300px"
      >
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box
      sx={{
        p: {
          xs: 1,
          sm: 2,
          md: 3,
        },
        maxWidth: '1400px',
        mx: 'auto',
      }}
    >
      {/* ====================================== */}
      {/* TIÊU ĐỀ */}
      {/* ====================================== */}

      <Box mb={3}>
        <Typography
          variant={isMobile ? 'h5' : 'h4'}
          fontWeight={700}
          gutterBottom
        >
          NỘI QUY VÀ QUY ĐỊNH ĐIỂM THI ĐUA
        </Typography>

        <Typography
          variant="body1"
          color="text.secondary"
        >
          Danh sách các hành vi vi phạm và mức điểm
          thi đua lớp tương ứng.
        </Typography>
      </Box>

      {/* ====================================== */}
      {/* GIẢI THÍCH CÁCH TÍNH */}
      {/* ====================================== */}

      <Alert
        severity="info"
        sx={{
          mb: 3,
          borderRadius: 2,
        }}
      >
        <Typography fontWeight={700} mb={0.5}>
          Cách tính điểm
        </Typography>

        <Typography variant="body2">
          Mỗi lần học sinh được ghi nhận một lỗi sẽ
          được tính là một lần vi phạm. Điểm thi đua
          lớp được trừ theo mức điểm quy định của
          từng lỗi trong bảng dưới đây.
        </Typography>

        <Typography
          variant="body2"
          sx={{ mt: 0.5 }}
        >
          Ví dụ: Một lỗi có mức trừ 5 điểm, nếu được
          ghi nhận 3 lần thì lớp bị trừ tổng cộng 15
          điểm.
        </Typography>
      </Alert>

      {/* ====================================== */}
      {/* LỖI */}
      {/* ====================================== */}

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {groupedRules.map(([groupCode, groupRules]) => {
        const groupName =
          groupRules[0]?.groupName || '';

        const isSpecial = groupCode === 'S1';

        return (
          <Paper
            key={groupCode}
            elevation={2}
            sx={{
              mb: 3,
              overflow: 'hidden',
              borderRadius: 2,
              border: isSpecial
                ? '2px solid'
                : '1px solid',
              borderColor: isSpecial
                ? 'error.main'
                : 'divider',
            }}
          >
            {/* ================================== */}
            {/* HEADER NHÓM */}
            {/* ================================== */}

            <Box
              sx={{
                px: {
                  xs: 1.5,
                  sm: 2,
                },
                py: 1.5,
                backgroundColor: isSpecial
                  ? 'error.light'
                  : 'primary.main',
                color: isSpecial
                  ? 'error.contrastText'
                  : 'primary.contrastText',
              }}
            >
              <Box
                display="flex"
                alignItems="center"
                gap={1}
                flexWrap="wrap"
              >
                <Chip
                  label={groupCode}
                  color={getGroupColor(groupCode)}
                  sx={{
                    fontWeight: 700,
                    backgroundColor: isSpecial
                      ? 'error.main'
                      : 'white',
                    color: isSpecial
                      ? 'white'
                      : 'primary.main',
                  }}
                />

                <Typography
                  variant="h6"
                  fontWeight={700}
                >
                  {groupName}
                </Typography>
              </Box>
            </Box>

            {/* ================================== */}
            {/* GHI CHÚ S1 */}
            {/* ================================== */}

            {isSpecial && (
              <Alert
                severity="error"
                sx={{
                  borderRadius: 0,
                  '& .MuiAlert-message': {
                    width: '100%',
                  },
                }}
              >
                <Typography fontWeight={700}>
                  Nhóm đặc biệt nghiêm trọng
                </Typography>

                <Typography variant="body2">
                  Các lỗi thuộc nhóm này không tính
                  vào điểm hạnh kiểm tuần theo cách
                  trừ điểm thông thường. Lỗi được sử
                  dụng để xem xét hạ trực tiếp một bậc
                  hạnh kiểm theo quy định của nhà
                  trường.
                </Typography>
              </Alert>
            )}

            {/* ================================== */}
            {/* BẢNG */}
            {/* ================================== */}

            <Box
              sx={{
                overflowX: 'auto',
              }}
            >
              <Table
                size={isMobile ? 'small' : 'medium'}
              >
                <TableHead>
                  <TableRow
                    sx={{
                      backgroundColor: 'grey.100',
                    }}
                  >
                    <TableCell
                      align="center"
                      sx={{
                        fontWeight: 700,
                        width: 60,
                      }}
                    >
                      STT
                    </TableCell>

                    <TableCell
                      sx={{
                        fontWeight: 700,
                        width: 100,
                      }}
                    >
                      Mã lỗi
                    </TableCell>

                    <TableCell
                      sx={{
                        fontWeight: 700,
                      }}
                    >
                      Nội dung vi phạm
                    </TableCell>

                    <TableCell
                      align="center"
                      sx={{
                        fontWeight: 700,
                        width: 120,
                        whiteSpace: 'nowrap',
                      }}
                    >
                      Điểm trừ
                    </TableCell>
                  </TableRow>
                </TableHead>

                <TableBody>
                  {groupRules.map((rule, index) => (
                    <TableRow
                      key={rule._id}
                      hover
                      sx={{
                        '&:last-child td': {
                          borderBottom: 0,
                        },
                      }}
                    >
                      {/* STT */}
                      <TableCell align="center">
                        {index + 1}
                      </TableCell>

                      {/* MÃ LỖI */}
                      <TableCell>
                        <Chip
                          label={rule.ruleCode}
                          size="small"
                          variant="outlined"
                          color={
                            isSpecial
                              ? 'error'
                              : 'primary'
                          }
                          sx={{
                            fontWeight: 700,
                          }}
                        />
                      </TableCell>

                      {/* NỘI DUNG */}
                      <TableCell>
                        <Typography
                          variant="body2"
                          fontWeight={500}
                        >
                          {rule.title}
                        </Typography>

                        {rule.content && (
                          <Typography
                            variant="caption"
                            color="text.secondary"
                            display="block"
                            sx={{ mt: 0.5 }}
                          >
                            {rule.content}
                          </Typography>
                        )}
                      </TableCell>

                      {/* ĐIỂM */}
                      <TableCell align="center">
                        <Typography
                          fontWeight={800}
                          color={
                            isSpecial
                              ? 'error.main'
                              : 'error.main'
                          }
                        >
                          -{rule.point}
                        </Typography>

                        <Typography
                          variant="caption"
                          color="text.secondary"
                        >
                          điểm/lần
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Box>
          </Paper>
        );
      })}

      {/* ====================================== */}
      {/* QUY TẮC CHUNG */}
      {/* ====================================== */}

      <Divider sx={{ my: 3 }} />

      <Paper
        elevation={1}
        sx={{
          p: 2,
          borderRadius: 2,
          backgroundColor: 'grey.50',
        }}
      >
        <Typography
          variant="h6"
          fontWeight={700}
          gutterBottom
        >
          Lưu ý
        </Typography>

        <Typography
          variant="body2"
          color="text.secondary"
          paragraph
        >
          • Điểm trừ thi đua của lớp được tính theo
          đúng mức điểm quy định tại từng lỗi.
        </Typography>

        <Typography
          variant="body2"
          color="text.secondary"
          paragraph
        >
          • Một lỗi được ghi nhận nhiều lần thì tính
          điểm theo số lần vi phạm thực tế.
        </Typography>

        <Typography
          variant="body2"
          color="text.secondary"
        >
          • Các lỗi thuộc nhóm đặc biệt nghiêm trọng
          được xử lý theo quy định riêng của nhà
          trường.
        </Typography>
      </Paper>
    </Box>
  );
};

export default RulesPage;
