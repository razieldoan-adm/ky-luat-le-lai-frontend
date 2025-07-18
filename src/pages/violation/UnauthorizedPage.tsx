import {
  Box,
  
} from '@mui/material';
export default function UnauthorizedPage() {
  return (
    <Box sx={{ p: 5, textAlign: 'center' }}>
      <h2>🚫 Không có quyền truy cập</h2>
      <p>Vui lòng liên hệ admin nếu cần thêm quyền.</p>
    </Box>
  );
}
