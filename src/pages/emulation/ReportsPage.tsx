import React, { useState } from 'react';
import axios from 'axios';
import { Button, TextField, Stack } from '@mui/material';
import { exportWeeklyReport } from './exportReports';

const ReportsPage = () => {
  const [weekNumber, setWeekNumber] = useState('');

  const handleExport = async () => {
    try {
      const res = await axios.get(`/api/reports/week?weekNumber=${weekNumber}`);
      await exportWeeklyReport(res.data);
    } catch (err) {
      console.error(err);
      alert('Lỗi xuất file');
    }
  };

  return (
    <Stack spacing={2}>
      <TextField
        label="Tuần"
        value={weekNumber}
        onChange={(e) => setWeekNumber(e.target.value)}
        type="number"
      />
      <Button variant="contained" onClick={handleExport}>
        Xuất file Excel tổng hợp
      </Button>
    </Stack>
  );
};

export default ReportsPage;
