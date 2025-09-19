import { useEffect, useState } from "react";
import {
  Box,
  Typography,
  Button,
  Paper,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Snackbar,
  Alert,
  TextField,
} from "@mui/material";
import { useParams, useNavigate } from "react-router-dom";
import api from "../../api/api";

interface Violation {
  _id: string;
  description: string;
  points: number;
  handlingMethod?: string;
  createdAt?: string;
}

interface Student {
  _id: string;
  name: string;
  class: string;
  violations: Violation[];
}

export default function ViolationDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [student, setStudent] = useState<Student | null>(null);
  const [openSnackbar, setOpenSnackbar] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const [snackbarSeverity, setSnackbarSeverity] =
    useState<"success" | "error">("success");

  const [customDate, setCustomDate] = useState("");

  useEffect(() => {
    fetchStudent();
  }, [id]);

  const fetchStudent = async () => {
    try {
      const res = await api.get(`/api/students/${id}`);
      setStudent(res.data);
    } catch (err) {
      console.error("Lỗi khi tải học sinh:", err);
    }
  };

  const handleDeleteViolation = async (violationId: string) => {
    try {
      await api.delete(`/api/students/${id}/violations/${violationId}`);
      setSnackbarMessage("Xóa vi phạm thành công!");
      setSnackbarSeverity("success");
      setOpenSnackbar(true);
      fetchStudent();
    } catch (err) {
      console.error("Lỗi khi xóa vi phạm:", err);
      setSnackbarMessage("Xóa vi phạm thất bại!");
      setSnackbarSeverity("error");
      setOpenSnackbar(true);
    }
  };

  // 👉 Hàm lấy ngày theo dd/mm/yyyy
  const getFormattedDate = () => {
    const today = new Date();
    const year = today.getFullYear();

    if (customDate) {
      // Nếu người dùng nhập, customDate dạng yyyy-mm-dd → tách dd/mm
      const [y, m, d] = customDate.split("-");
      return `${d}/${m}/${year}`;
    } else {
      // Nếu để trống → lấy hệ thống
      const d = String(today.getDate()).padStart(2, "0");
      const m = String(today.getMonth() + 1)
