import { Container, Paper, Typography } from "@mui/material";

export default function TermsOfServicePage() {
  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Paper elevation={2} sx={{ p: { xs: 2, sm: 4 } }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Điều khoản sử dụng
        </Typography>

        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Hệ thống quản lý thi đua và kỷ luật học sinh
        </Typography>

        <Typography variant="h6" gutterBottom>
          1. Phạm vi sử dụng
        </Typography>

        <Typography paragraph>
          Hệ thống được cung cấp nhằm hỗ trợ nhà trường quản lý thi đua, kỷ
          luật, vi phạm học sinh và các dữ liệu liên quan đến hoạt động quản lý
          giáo dục.
        </Typography>

        <Typography variant="h6" gutterBottom>
          2. Tài khoản người dùng
        </Typography>

        <Typography paragraph>
          Người dùng có trách nhiệm bảo vệ thông tin đăng nhập của mình và
          không cung cấp tài khoản cho người khác sử dụng trái phép.
        </Typography>

        <Typography paragraph>
          Mỗi tài khoản chỉ được sử dụng trong phạm vi quyền hạn được cấp bởi
          hệ thống.
        </Typography>

        <Typography variant="h6" gutterBottom>
          3. Sử dụng dữ liệu
        </Typography>

        <Typography paragraph>
          Người dùng chỉ được nhập, xem, chỉnh sửa và xử lý dữ liệu phù hợp với
          nhiệm vụ và quyền hạn của mình.
        </Typography>

        <Typography variant="h6" gutterBottom>
          4. Hình ảnh và tệp tin
        </Typography>

        <Typography paragraph>
          Hình ảnh được tải lên hệ thống phải phục vụ cho mục đích quản lý của
          nhà trường và không được sử dụng để tải lên nội dung trái pháp luật
          hoặc không liên quan đến hoạt động của hệ thống.
        </Typography>

        <Typography variant="h6" gutterBottom>
          5. Google Drive
        </Typography>

        <Typography paragraph>
          Một số hình ảnh và tệp tin của hệ thống có thể được lưu trữ trên
          Google Drive thông qua kết nối OAuth. Người dùng sử dụng chức năng
          này đồng ý cho ứng dụng thực hiện các thao tác cần thiết đối với dữ
          liệu được ứng dụng quản lý.
        </Typography>

        <Typography variant="h6" gutterBottom>
          6. Hành vi sử dụng không phù hợp
        </Typography>

        <Typography paragraph>
          Người dùng không được cố ý truy cập trái phép, phá hoại, thay đổi
          hoặc sử dụng hệ thống ngoài mục đích được nhà trường cho phép.
        </Typography>

        <Typography variant="h6" gutterBottom>
          7. Thay đổi điều khoản
        </Typography>

        <Typography paragraph>
          Điều khoản sử dụng có thể được cập nhật khi hệ thống thay đổi chức
          năng hoặc quy trình vận hành. Nội dung cập nhật sẽ được công bố trên
          trang này.
        </Typography>

        <Typography variant="h6" gutterBottom>
          8. Liên hệ
        </Typography>

        <Typography paragraph>
          Các vấn đề liên quan đến tài khoản, dữ liệu hoặc việc sử dụng hệ
          thống cần được trao đổi với người quản trị hệ thống hoặc đơn vị quản
          lý của nhà trường.
        </Typography>

        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ mt: 4 }}
        >
          Cập nhật lần cuối: 16/09/2026
        </Typography>
      </Paper>
    </Container>
  );
}
