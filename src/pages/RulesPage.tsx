import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Box, Typography, Table, TableHead, TableRow,
  TableCell, TableBody
} from '@mui/material';

interface Rule {
  _id: string;
  title: string;
  point: number;
  content: string;
}

const RulesPage: React.FC = () => {
  const [rules, setRules] = useState<Rule[]>([]);

  const fetchRules = async () => {
    const res = await axios.get('/api/rules');
    setRules(res.data);
  };

  useEffect(() => {
    fetchRules();
  }, []);

  return (
    <Box p={2}>
      <Typography variant="h5">Nội quy</Typography>

      <Table>
        <TableHead>
          <TableRow>
            <TableCell>STT</TableCell>
            <TableCell>Nội dung</TableCell>
            <TableCell>Điểm trừ</TableCell>
            <TableCell>Ghi chú</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {rules.map((rule, index) => (
            <TableRow key={rule._id}>
              <TableCell>{index + 1}</TableCell>
              <TableCell>{rule.title}</TableCell>
              <TableCell>{rule.point}</TableCell>
              <TableCell>{rule.content}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Box>
  );
};

export default RulesPage;
