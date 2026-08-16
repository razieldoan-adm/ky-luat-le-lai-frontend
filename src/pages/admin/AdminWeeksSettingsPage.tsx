import { useEffect, useState } from 'react';
import api from '../../api/api';

import {
  Box,
  Paper,
  Typography,
  Button,
  Checkbox,
  TextField,
  Alert,
  Stack,
} from '@mui/material';

import dayjs from 'dayjs';

type AcademicWeek = {
  _id: string;
  startDate: string;
  endDate: string;
  weekNumber: number | null;
  isStudyWeek: boolean;
};

const AdminWeeksSettingsPage = () => {
  const [weeks, setWeeks] = useState<AcademicWeek[]>([]);

  const [editMode, setEditMode] =
    useState(false);

  // Ngày bắt đầu tuần 1
  const [startDate, setStartDate] =
    useState('');

  // Ngày kết thúc năm học
  const [endDate, setEndDate] =
    useState('');

  const [message, setMessage] =
    useState('');

  const [error, setError] =
    useState('');

  // =========================================================
  // LOAD TUẦN
  // =========================================================

  useEffect(() => {
    fetchWeeks();
  }, []);

  const fetchWeeks = async () => {
    try {
      const res =
        await api.get('/api/academic-weeks');

      setWeeks(res.data || []);

      setMessage('');
      setError('');
    } catch (err) {
      console.error(err);

      setError(
        'Không thể tải danh sách tuần'
      );
    }
  };

  // =========================================================
  // CHỌN / BỎ CHỌN TUẦN HỌC
  // =========================================================

  const handleCheckboxChange = (
    id: string
  ) => {
    setWeeks((prev) =>
      prev.map((week) =>
        week._id === id
          ? {
              ...week,
              isStudyWeek:
                !week.isStudyWeek,
            }
          : week
      )
    );
  };

  // =========================================================
  // TẠO TUẦN MỚI
  // =========================================================

  const generateWeeks = async () => {
    setMessage('');
    setError('');

    if (!startDate) {
      setError(
        'Vui lòng chọn ngày bắt đầu tuần 1'
      );
      return;
    }

    if (!endDate) {
      setError(
        'Vui lòng chọn ngày kết thúc năm học'
      );
      return;
    }

    const start = dayjs(startDate);
    const end = dayjs(endDate);

    if (!start.isValid()) {
      setError(
        'Ngày bắt đầu không hợp lệ'
      );
      return;
    }

    if (!end.isValid()) {
      setError(
        'Ngày kết thúc không hợp lệ'
      );
      return;
    }

    if (start.isAfter(end)) {
      setError(
        'Ngày bắt đầu không được lớn hơn ngày kết thúc năm học'
      );
      return;
    }

    const confirmed = window.confirm(
      'Tạo lại toàn bộ danh sách tuần? Dữ liệu tuần hiện tại sẽ được thay thế.'
    );

    if (!confirmed) {
      return;
    }

    try {
      const res =
        await api.post(
          '/api/academic-weeks/generate',
          {
            startDate,
            endDate,
          }
        );

      setMessage(
        res.data?.message ||
          'Đã tạo danh sách tuần'
      );

      setEditMode(false);

      await fetchWeeks();
    } catch (err: any) {
      console.error(err);

      setError(
        err?.response?.data?.message ||
          'Có lỗi khi tạo tuần'
      );
    }
  };

  // =========================================================
  // XÓA TOÀN BỘ
  // =========================================================

  const deleteAllWeeks = async () => {
    if (
      !window.confirm(
        'Bạn có chắc muốn xoá toàn bộ tuần học không?'
      )
    ) {
      return;
    }

    try {
      await api.delete(
        '/api/academic-weeks'
      );

      setWeeks([]);

      setMessage(
        'Đã xoá toàn bộ tuần'
      );

      setError('');
    } catch (err) {
      console.error(err);

      setError(
        'Có lỗi khi xoá tuần'
      );
    }
  };

  // =========================================================
  // LƯU THAY ĐỔI
  // =========================================================

  const saveChanges = async () => {
    try {
      const res =
        await api.put(
          '/api/academic-weeks/bulk',
          weeks
        );

      setMessage(
        res.data?.message ||
          'Đã lưu danh sách tuần'
      );

      setEditMode(false);

      await fetchWeeks();
    } catch (err: any) {
      console.error(err);

      setError(
        err?.response?.data?.message ||
          'Có lỗi khi lưu'
      );
    }
  };

  // =========================================================
  // CHUYỂN SANG CHẾ ĐỘ SỬA
  // =========================================================

  const handleEdit = () => {
    setEditMode(true);

    setMessage('');
    setError('');
  };

  // =========================================================
  // TUẦN HỌC ĐÃ CHỌN
  // =========================================================

  const selectedWeeks =
    weeks
      .filter(
        (week) =>
          week.isStudyWeek
      )
      .sort(
        (a, b) =>
          new Date(
            a.startDate
          ).getTime() -
          new Date(
            b.startDate
          ).getTime()
      );

  // =========================================================
  // TẠO MAP TUẦN
  // =========================================================

  const selectedOrderMap =
    new Map<string, number>();

  selectedWeeks.forEach(
    (week, index) => {
      selectedOrderMap.set(
        week._id,
        index + 1
      );
    }
  );

  // =========================================================
  // XÁC ĐỊNH TUẦN HIỆN TẠI
  // =========================================================

  const getCurrentWeekNumber = () => {
    const today = dayjs();

    for (
      let i = 0;
      i < selectedWeeks.length;
      i++
    ) {
      const week =
        selectedWeeks[i];

      const start =
        dayjs(week.startDate);

      const end =
        dayjs(week.endDate);

      if (
        today.isAfter(start) ||
        today.isSame(
          start,
          'day'
        )
      ) {
        if (
          today.isBefore(end) ||
          today.isSame(
            end,
            'day'
          )
        ) {
          return i + 1;
        }
      }
    }

    return null;
  };

  const currentWeekNumber =
    getCurrentWeekNumber();

  // =========================================================
  // CHIA THÀNH 4 CỘT
  // =========================================================

  const columnSize = 10;

  const columns: AcademicWeek[][] =
    [];

  for (
    let i = 0;
    i < weeks.length;
    i += columnSize
  ) {
    columns.push(
      weeks.slice(
        i,
        i + columnSize
      )
    );
  }

  // =========================================================
  // RENDER
  // =========================================================

  return (
    <Box p={2}>
      <Typography
        variant="h5"
        mb={2}
        fontWeight="bold"
      >
        Quản lý tuần học
      </Typography>

      {/* =====================================================
          THÔNG BÁO
      ===================================================== */}

      <Stack spacing={1} mb={2}>
        {message && (
          <Alert
            severity="success"
            onClose={() =>
              setMessage('')
            }
          >
            {message}
          </Alert>
        )}

        {error && (
          <Alert
            severity="error"
            onClose={() =>
              setError('')
            }
          >
            {error}
          </Alert>
        )}
      </Stack>

      {/* =====================================================
          CHỌN NGÀY TẠO TUẦN
      ===================================================== */}

      <Paper
        elevation={2}
        sx={{
          p: 2,
          mb: 2,
        }}
      >
        <Typography
          variant="h6"
          fontWeight="bold"
          mb={2}
        >
          Thiết lập thời gian năm học
        </Typography>

        <Box
          display="grid"
          gridTemplateColumns={{
            xs: '1fr',
            sm: '1fr 1fr',
            md: '280px 280px auto',
          }}
          gap={2}
          alignItems="center"
        >
          {/* NGÀY BẮT ĐẦU TUẦN 1 */}

          <TextField
            label="Ngày bắt đầu tuần 1"
            type="date"
            value={startDate}
            onChange={(e) =>
              setStartDate(
                e.target.value
              )
            }
            InputLabelProps={{
              shrink: true,
            }}
            fullWidth
            helperText="Chọn bất kỳ ngày nào"
          />

          {/* NGÀY KẾT THÚC */}

          <TextField
            label="Ngày kết thúc năm học"
            type="date"
            value={endDate}
            onChange={(e) =>
              setEndDate(
                e.target.value
              )
            }
            InputLabelProps={{
              shrink: true,
            }}
            fullWidth
          />

          <Button
            variant="contained"
            color="secondary"
            onClick={generateWeeks}
            sx={{
              height: 40,
              whiteSpace:
                'nowrap',
            }}
          >
            TẠO TUẦN MỚI
          </Button>
        </Box>

        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ mt: 1.5 }}
        >
          Tuần 1 được tính từ ngày bạn
          chọn đến hết Chủ nhật. Từ
          tuần 2 trở đi, mỗi tuần tính
          từ Thứ 2 đến hết Chủ nhật.
        </Typography>
      </Paper>

      {/* =====================================================
          NÚT ĐIỀU KHIỂN
      ===================================================== */}

      <Box
        mb={2}
        display="flex"
        gap={2}
        flexWrap="wrap"
      >
        {!editMode ? (
          <Button
            variant="contained"
            color="primary"
            onClick={handleEdit}
          >
            CẬP NHẬT
          </Button>
        ) : (
          <Button
            variant="contained"
            color="success"
            onClick={saveChanges}
          >
            LƯU
          </Button>
        )}

        <Button
          variant="contained"
          color="error"
          onClick={deleteAllWeeks}
        >
          XOÁ TOÀN BỘ
        </Button>
      </Box>

      {/* =====================================================
          DANH SÁCH TUẦN
      ===================================================== */}

      {weeks.length === 0 ? (
        <Paper
          sx={{
            p: 4,
            textAlign: 'center',
          }}
        >
          <Typography color="text.secondary">
            Chưa có danh sách tuần.
            Hãy chọn ngày và bấm
            "TẠO TUẦN MỚI".
          </Typography>
        </Paper>
      ) : (
        <Box
          display="flex"
          flexWrap="wrap"
          gap={2}
        >
          {columns.map(
            (
              column,
              colIndex
            ) => (
              <Paper
                key={colIndex}
                elevation={3}
                sx={{
                  flex:
                    '1 1 22%',
                  p: 2,
                  minWidth:
                    '260px',
                }}
              >
                <Typography
                  variant="subtitle1"
                  fontWeight="bold"
                  mb={1}
                >
                  Bảng {colIndex + 1}
                </Typography>

                {column.map(
                  (week) => {
                    const weekNumber =
                      selectedOrderMap.get(
                        week._id
                      );

                    const isCurrent =
                      currentWeekNumber ===
                      weekNumber;

                    return (
                      <Box
                        key={
                          week._id
                        }
                        display="flex"
                        alignItems="center"
                        justifyContent="space-between"
                        borderBottom={
                          1
                        }
                        borderColor="divider"
                        py={0.7}
                        gap={1}
                      >
                        {/* NGÀY */}

                        <Box
                          sx={{
                            flex: 1,
                            minWidth: 0,
                          }}
                        >
                          <Typography
                            variant="body2"
                            sx={{
                              whiteSpace:
                                'nowrap',
                              fontSize:
                                '13px',
                            }}
                          >
                            {dayjs(
                              week.startDate
                            ).format(
                              'DD/MM/YYYY'
                            )}
                            {' - '}
                            {dayjs(
                              week.endDate
                            ).format(
                              'DD/MM/YYYY'
                            )}
                          </Typography>
                        </Box>

                        {/* CHECKBOX */}

                        <Checkbox
                          checked={
                            week.isStudyWeek
                          }
                          disabled={
                            !editMode
                          }
                          onChange={() =>
                            handleCheckboxChange(
                              week._id
                            )
                          }
                        />

                        {/* TUẦN */}

                        <Typography
                          variant="body2"
                          sx={{
                            width:
                              '75px',
                            textAlign:
                              'center',
                            color:
                              isCurrent
                                ? 'green'
                                : 'inherit',
                            fontWeight:
                              isCurrent
                                ? 'bold'
                                : 'normal',
                            whiteSpace:
                              'nowrap',
                          }}
                        >
                          {week.isStudyWeek
                            ? `Tuần ${weekNumber}${
                                isCurrent
                                  ? ' ⭐'
                                  : ''
                              }`
                            : 'Nghỉ'}
                        </Typography>
                      </Box>
                    );
                  }
                )}
              </Paper>
            )
          )}
        </Box>
      )}
    </Box>
  );
};

export default AdminWeeksSettingsPage;
