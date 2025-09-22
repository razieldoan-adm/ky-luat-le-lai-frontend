import React, { useState, useEffect } from "react";
import {
  Button,
  Select,
  MenuItem,
  InputLabel,
  FormControl,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Box,
} from "@mui/material";
import * as XLSX from "xlsx";
import api from "../../api/api";

interface ClassOption {
  _id: string;
  name: string;
  teacher: string;
}

interface Student {
  _id?: string;
  name: string;
  className: string;
  fatherPhone?: string;
  motherPhone?: string;
}

const StudentListPage: React.FC = () => {
  const [classOptions, setClassOptions] = useState<ClassOption[]>([]);
  const [selectedClass, setSelectedClass] = useState<string>("");
  const [students, setStudents] = useState<Student[]>([]);

  // Lấy danh sách lớp
  useEffect(() => {
    const fetchClasses = async () => {
      try {
        const res = await api.get("/api/classes/with-teacher");
        setClassOptions(res.data);
      } catch (err) {
        console.error("Lỗi khi lấy danh sách lớp:", err);
      }
    };
    fetchClasses();
  }, []);

  // Load học sinh theo lớp
  const handleLoadStudents = async () => {
    if (!selectedClass) return;
    try {
      const res = await api.get(`/api/students/by-class/${selectedClass}`);
      setStudents(res.data);
    } catch (err) {
      console.error("Lỗi khi load học sinh:", err);
    }
  };

  // Import Excel
  const handleImportExcel = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const data = new Uint8Array(evt.target?.result as ArrayBuffer);
      const workbook = XLSX.read(data, { type: "array" });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData: any[] = XLSX.utils.sheet_to_json(worksheet);

      // Giả sử Excel có cột: Họ tên, Lớp, SĐT Ba, SĐT Mẹ
      const importedStudents: Student[] = jsonData.map((row, idx) => ({
        _id: undefined,
        name: row["Họ tên"] || "",
        className: row["Lớp"] || "",
        fatherPhone: row["SĐT Ba"] || "",
        motherPhone: row["SĐT Mẹ"] || "",
      }));

      setStudents(importedStudents);
    };
    reader.readAsArrayBuffer(file);
  };

  // Cập nhật SĐT trong bảng
  const handleChangePhone = (
    index: number,
    field: "fatherPhone" | "motherPhone",
    value: string
  ) => {
    const updated = [...students];
    updated[index][field] = value;
    setStudents(updated);
  };

  // Lưu thay đổi
  const handleSaveChanges = async () => {
    try {
      aw
