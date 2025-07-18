import React, { useEffect, useState } from 'react';
import {
  Box, Typography, Table, TableHead, TableRow, TableCell, TableBody,
  Button, TextField, Stack
} from '@mui/material';
import axios from 'axios';

interface Rule {
  _id: string;
  title: string;
  point: number;
  content: string;
}

export default function AdminRulesPage() {
  const [rules, setRules] = useState<Rule[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editedRule, setEditedRule] = useState<Partial<Rule>>({});

  const fetchRules = async () => {
    const res = await axios.get('/api/rules', {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    });
    setRules(res.data);
  };

  useEffect(() => {
    fetchRules();
  }, []);

  const handleDelete = async (id: string) => {
    if (!window.confirm('Bạn có chắc muốn xóa?')) return;
    await axios.delete(`/api/rules/${id}`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    });
    fetchRules();
  };

  const handleSave = async (id: string) => {
    await axios.put(`/api/rules/${id}`, editedRule, {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    });
    setEditingId(null);
    fetchRules();
  };

  // Handle import
  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);

    await axios.post('/api/rules/import', formData, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`,
        'Content-Type': 'multipart/form-data'
      }
    });
    fetchRules();
  };

  // Handle download template


  return (
    <Box>
      <Typography variant="h5" mb={2}>Quản lý Nội Quy</Typography>

      <Stack direction="row" spacing={2} mb={2}>
        <Button variant="contained" component="label">
          Import File
          <input type="file" hidden onChange={handleImport} />
        </Button>
      </Stack>

      <Table>
        <TableHead>
          <TableRow>
            <TableCell>STT</TableCell>
            <TableCell>Nội dung</TableCell>
            <TableCell>Điểm trừ</TableCell>
            <TableCell>Ghi chú</TableCell>
            <TableCell>Hành động</TableCell>
          </TableRow>
        </TableHead>

        <TableBody>
          {rules.map((r, i) => (
            <TableRow key={r._id}>
              <TableCell>{i + 1}</TableCell>

              <TableCell>
                {editingId === r._id ? (
                  <TextField
                    value={editedRule.title || ''}
                    onChange={e => setEditedRule({ ...editedRule, title: e.target.value })}
                    size="small"
                  />
                ) : r.title}
              </TableCell>

              <TableCell>
                {editingId === r._id ? (
                  <TextField
                    type="number"
                    value={editedRule.point || 0}
                    onChange={e => setEditedRule({ ...editedRule, point: parseInt(e.target.value) })}
                    size="small"
                  />
                ) : r.point}
              </TableCell>

              <TableCell>
                {editingId === r._id ? (
                  <TextField
                    value={editedRule.content || ''}
                    onChange={e => setEditedRule({ ...editedRule, content: e.target.value })}
                    size="small"
                  />
                ) : r.content}
              </TableCell>

              <TableCell>
                {editingId === r._id ? (
                  <Stack direction="row" spacing={1}>
                    <Button variant="contained" color="primary" onClick={() => handleSave(r._id)}>Save</Button>
                    <Button variant="outlined" onClick={() => setEditingId(null)}>Cancel</Button>
                  </Stack>
                ) : (
                  <Stack direction="row" spacing={1}>
                    <Button variant="outlined" onClick={() => { setEditingId(r._id); setEditedRule(r); }}>Edit</Button>
                    <Button variant="outlined" color="error" onClick={() => handleDelete(r._id)}>Delete</Button>
                  </Stack>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Box>
  );
}
