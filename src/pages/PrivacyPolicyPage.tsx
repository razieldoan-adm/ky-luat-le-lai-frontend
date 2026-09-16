import { Box, Container, Paper, Typography } from "@mui/material";

export default function PrivacyPolicyPage() {
  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Paper elevation={2} sx={{ p: { xs: 2, sm: 4 } }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Chính sách quyền riêng tư
        </Typography>

        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Hệ thống quản lý thi đua và kỷ luật học sinh
        </Typography>

        <Typography variant="h6" gutterBottom>
          1. Giới thiệu
        </Typography>

        <Typography paragraph>
          Hệ thống quản lý thi đua và kỷ luật học sinh được xây dựng nhằm hỗ
          trợ nhà trường trong việc quản lý thông tin học sinh, ghi nhận các
          trường hợp vi phạm, theo dõi kết quả thi đua và thực hiện các nghiệp
          vụ quản lý liên quan.
        </Typography>

        <Typography variant="h6" gutterBottom>
          2. Thông tin được thu thập
        </Typography>

        <Typography paragraph>
          Hệ thống có thể lưu trữ các thông tin cần thiết phục vụ công tác
          quản lý của nhà trường, bao gồm thông tin học sinh, lớp học, giáo
          viên, dữ liệu vi phạm, kết quả thi đua và các hình ảnh được người
          dùng có thẩm quyền tải lên hệ thống.
        </Typography>

        <Typography variant="h6" gutterBottom>
          3. Sử dụng Google Drive
        </Typography>

        <Typography paragraph>
          Hệ thống sử dụng Google Drive để lưu trữ hình ảnh liên quan đến các
          trường hợp vi phạm. Việc kết nối với Google Drive được thực hiện
          thông qua cơ chế xác thực OAuth của Google.
        </Typography>

        <Typography paragraph>
          Hệ thống chỉ sử dụng quyền truy cập cần thiết để thực hiện chức năng
          lưu trữ và quản lý các tệp do ứng dụng tạo hoặc sử dụng.
        </Typography>

        <Typography variant="h6" gutterBottom>
          4. Bảo vệ thông tin
        </Typography>

        <Typography paragraph>
          Dữ liệu được sử dụng cho mục đích quản lý nội bộ của nhà trường.
          Người dùng chỉ được truy cập các chức năng và dữ liệu phù hợp với
          quyền được cấp trong hệ thống.
        </Typography>

        <Typography variant="h6" gutterBottom>
          5. Chia sẻ thông tin
        </Typography>

        <Typography paragraph>
          Hệ thống không chủ động bán hoặc cung cấp thông tin cá nhân của học
          sinh cho bên thứ ba vì mục đích thương mại. Thông tin chỉ được sử
          dụng trong phạm vi cần thiết cho hoạt động quản lý của nhà trường và
          các dịch vụ được hệ thống sử dụng.
        </Typography>

        <Typography variant="h6" gutterBottom>
          6. Quyền truy cập Google
        </Typography>

        <Typography paragraph>
          Việc cấp quyền Google cho ứng dụng có thể được người dùng quản lý
          thông qua tài khoản Google của mình. Người dùng có thể xem hoặc thu
          hồi quyền truy cập ứng dụng từ phần quản lý tài khoản Google.
        </Typography>

        <Typography variant="h6" gutterBottom>
          7. Thay đổi chính sách
        </Typography>

        <Typography paragraph>
          Chính sách quyền riêng tư có thể được cập nhật khi hệ thống được
          thay đổi hoặc bổ sung chức năng. Phiên bản mới sẽ được công bố trên
          trang này.
        </Typography>

        <Box sx={{ mt: 4 }}>
          <Typography variant="body2" color="text.secondary">
            Cập nhật lần cuối: 16/09/2026
          </Typography>
        </Box>
      </Paper>
    </Container>
  );
}
