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
          <TableHead><TableRow sx={{ '& th': { bgcolor: '#fff0c2', fontWeight: 'bold', whiteSpace: 'nowrap' } }}>
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
