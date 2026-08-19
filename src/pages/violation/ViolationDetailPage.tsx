import { useEffect, useState } from "react";
import {
  Box,
  Button,
  Card,
  CardContent,
  Typography,
  Stack,
  Snackbar,
  Alert,
  Select,
  MenuItem,
  InputLabel,
  FormControl,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  TextField,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Chip,
  Divider,
} from "@mui/material";

import { useParams, useNavigate, useLocation } from "react-router-dom";
import api from "../../api/api";

import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.tz.setDefault("Asia/Ho_Chi_Minh");

// ============================================================
// INTERFACE
// ============================================================

interface Violation {
  _id: string;
  description: string;

  ruleCode?: string;
  groupCode?: string;

  time?: string;
  handled: boolean;
  handlingMethod: string;
  handledBy?: string;
  handlingNote?: string;
  weekNumber?: number;
  penalty?: number;
}

interface Rule {
  _id: string;
  title: string;
  point: number;

  ruleCode: string;
  groupCode: string;
  groupName?: string;
  
  content?: string;
  active?: boolean;
}

interface StudentConductScore {
  _id?: string;

  name: string;
  className: string;
  academicYear: string;
  weekNumber: number;

  maxScore: number;

  groupViolations: {
    N1: number;
    N2: number;
    N3: number;
    N4: number;
    N5: number;
    S1: number;
  };

  totalConductViolations: number;
  totalDeduction: number;
  finalScore: number;

  hasSeriousViolation: boolean;

  status: "DRAFT" | "FINAL";
}

// ============================================================
// COMPONENT
// ============================================================

const ViolationDetailPage = () => {
  const { name } = useParams<{ name: string }>();

  const navigate = useNavigate();
  const location = useLocation();

  const className =
    new URLSearchParams(location.search).get("className") || "";

  // ==========================================================
  // STATE
  // ==========================================================

  const [violations, setViolations] = useState<Violation[]>([]);
  const [rules, setRules] = useState<Rule[]>([]);

  const [selectedRuleId, setSelectedRuleId] = useState("");

  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");

  const [snackbarSeverity, setSnackbarSeverity] = useState<
    "success" | "error"
  >("success");

  // ==========================================================
  // TUẦN HIỆN TẠI
  // ==========================================================

  const [currentWeek, setCurrentWeek] = useState<number | null>(null);
  const [academicYear, setAcademicYear] = useState<string>("");
  const getCurrentAcademicYear = (
  date: Date = new Date()
): string => {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;

  // Tháng 1 -> tháng 7 vẫn thuộc năm học
  // bắt đầu từ năm trước
  if (month < 8) {
    return `${year - 1}-${year}`;
  }
  return `${year}-${year + 1}`;
};
  // ==========================================================
  // ĐIỂM HẠNH KIỂM
  // ==========================================================

  const [conductScore, setConductScore] =
    useState<StudentConductScore | null>(null);

  const [maxConductScore, setMaxConductScore] =
    useState(100);

  // ==========================================================
  // NGÀY NHẬP LỖI
  // ==========================================================

  const [dayInput, setDayInput] = useState("");
  const [monthInput, setMonthInput] = useState("");

  // ==========================================================
  // DIALOG SỬA
  // ==========================================================

  const [editDialogOpen, setEditDialogOpen] =
    useState(false);

  const [editItem, setEditItem] =
    useState<Violation | null>(null);

  const [editDescription, setEditDescription] =
    useState("");

  const [editDate, setEditDate] =
    useState("");

  // ==========================================================
  // LOAD DATA
  // ==========================================================

useEffect(() => {
  if (!name || !className) return;

  const loadPage = async () => {
    await fetchViolations();
    await fetchRules();
    await fetchSettings();
    await fetchCurrentWeek();
  };

  loadPage();
}, [name, className]);

  // ==========================================================
  // LẤY SETTINGS
  // ==========================================================

const fetchSettings = async () => {
  try {
    const res = await api.get(
      "/api/settings"
    );

    console.log(
      "SETTINGS:",
      res.data
    );

    if (
      res.data?.maxConductScore !==
      undefined
    ) {
      setMaxConductScore(
        Number(
          res.data.maxConductScore
        )
      );
    }

    // ==========================================
    // LẤY NĂM HỌC
    // ==========================================

    const settingAcademicYear =
      res.data?.academicYear;

    if (
      settingAcademicYear
    ) {
      setAcademicYear(
        String(settingAcademicYear)
      );
    } else {
      setAcademicYear(
        getCurrentAcademicYear()
      );
    }

  } catch (err) {
    console.error(
      "Lỗi khi lấy settings:",
      err
    );

    // Nếu không lấy được settings
    // vẫn xác định năm học từ ngày hiện tại
    setAcademicYear(
      getCurrentAcademicYear()
    );
  }
};

  // ==========================================================
  // LẤY VI PHẠM
  // ==========================================================

  const fetchViolations = async () => {
    try {
      const res = await api.get(
        `/api/violations/${encodeURIComponent(
          name || ""
        )}?className=${encodeURIComponent(
          className
        )}`
      );

      setViolations(res.data || []);
    } catch (err) {
      console.error(
        "Lỗi lấy vi phạm:",
        err
      );

      setViolations([]);
    }
  };

  // ==========================================================
  // LẤY RULE
  // ==========================================================

  const fetchRules = async () => {
    try {
      const res =
        await api.get("/api/rules");

      setRules(res.data || []);
    } catch (err) {
      console.error(
        "Lỗi khi lấy rules:",
        err
      );
    }
  };

  // ==========================================================
  // LẤY TUẦN HIỆN TẠI
  // ==========================================================

  const fetchCurrentWeek = async () => {
  try {
    const res = await api.get(
      "/api/academic-weeks/study-weeks"
    );

    const weeks = res.data || [];

    const now = new Date();

    const currentWeekFound =
      weeks.find((w: any) => {
        const start =
          new Date(w.startDate);

        const end =
          new Date(w.endDate);

        return (
          now >= start &&
          now <= end
        );
      });

    if (!currentWeekFound) {
      console.warn(
        "Không tìm thấy tuần học hiện tại."
      );

      return;
    }

    const week =
      Number(
        currentWeekFound.weekNumber
      );

    // AcademicWeek hiện tại không có academicYear
    // nên dùng academicYear đã lấy từ settings
    // hoặc tự suy ra từ ngày hiện tại.

    const year =
      academicYear ||
      getCurrentAcademicYear();

    setCurrentWeek(week);
    setAcademicYear(year);

    await fetchConductScore(
      week,
      year
    );

  } catch (err) {
    console.error(
      "Lỗi khi lấy tuần hiện tại:",
      err
    );
  }
};

  // ==========================================================
  // LẤY ĐIỂM HẠNH KIỂM
  // ==========================================================

  const fetchConductScore = async (
  weekNumber: number,
  year: string
) => {
  if (
    !name ||
    !className ||
    !year
  ) {
    console.warn(
      "Thiếu dữ liệu lấy điểm HK:",
      {
        name,
        className,
        year,
        weekNumber,
      }
    );

    return;
  }

  try {
    const res =
      await api.get(
        "/api/student-conduct-scores/student",
        {
          params: {
            name,
            className,
            academicYear: year,
            weekNumber,
          },
        }
      );

    console.log(
      "CONDUCT SCORE:",
      res.data
    );

    setConductScore(
      res.data || null
    );

  } catch (err) {
    console.error(
      "Lỗi khi lấy điểm hạnh kiểm:",
      err
    );

    setConductScore(null);
  }
};

  // ==========================================================
  // SAU KHI GHI / XÓA / SỬA → LOAD LẠI HK
  // ==========================================================

  const refreshConductScore = async () => {
  if (
    currentWeek !== null &&
    academicYear
  ) {
    await fetchConductScore(
      currentWeek,
      academicYear
    );
  }
};

  // ==========================================================
  // NGÀY VI PHẠM
  // ==========================================================

  const getViolationDate = (): Date => {
    const now = new Date();

    const year =
      now.getFullYear();

    if (
      dayInput &&
      monthInput
    ) {
      const dd =
        parseInt(
          dayInput,
          10
        );

      const mm =
        parseInt(
          monthInput,
          10
        ) - 1;

      if (
        !isNaN(dd) &&
        !isNaN(mm) &&
        dd > 0 &&
        dd <= 31 &&
        mm >= 0 &&
        mm < 12
      ) {
        const customDate =
          new Date(
            year,
            mm,
            dd,
            12,
            0,
            0,
            0
          );

        if (
          !isNaN(
            customDate.getTime()
          )
        ) {
          return customDate;
        }
      }
    }

    return new Date();
  };

  // ==========================================================
  // HIỂN THỊ NGÀY
  // ==========================================================

  const renderTime = (
    time?: string
  ) => {
    if (!time) return "N/A";

    const parsed =
      new Date(time);

    if (
      !isNaN(
        parsed.getTime()
      )
    ) {
      return parsed.toLocaleDateString(
        "vi-VN"
      );
    }

    return time;
  };

  // ==========================================================
  // TÌM RULE CỦA LỖI
  // ==========================================================

  const getRuleForViolation = (
    violation: Violation
  ) => {
    return rules.find(
      (r) =>
        r.title ===
        violation.description
    );
  };

  // ==========================================================
  // ➕ GHI NHẬN LỖI
  // ==========================================================

  const handleAddViolation = async () => {
  const selectedRule =
    rules.find(
      (r) =>
        r._id === selectedRuleId
    );

  if (
    !selectedRule ||
    !name ||
    !className
  ) {
    setSnackbarMessage(
      "Vui lòng chọn lỗi vi phạm và đảm bảo có tên/lớp."
    );

    setSnackbarSeverity("error");
    setSnackbarOpen(true);

    return;
  }

  try {
    const weeksRes =
      await api.get(
        "/api/academic-weeks/study-weeks"
      );

    const weeks =
      weeksRes.data || [];

    const now = new Date();

    const currentWeekFound =
      weeks.find(
        (w: any) => {
          const start =
            new Date(
              w.startDate
            );

          const end =
            new Date(
              w.endDate
            );

          return (
            now >= start &&
            now <= end
          );
        }
      );

    if (!currentWeekFound) {
      setSnackbarMessage(
        "Không xác định được tuần học hiện tại."
      );

      setSnackbarSeverity("error");
      setSnackbarOpen(true);

      return;
    }

    const weekNumber =
      Number(
        currentWeekFound.weekNumber
      );

    const year =
      academicYear ||
      getCurrentAcademicYear();

    if (!year) {
      setSnackbarMessage(
        "Không xác định được năm học."
      );

      setSnackbarSeverity("error");
      setSnackbarOpen(true);

      return;
    }

    const violationDate =
      getViolationDate();

    console.log(
      "POST VIOLATION:",
      {
        name,
        className,
        description:
          selectedRule.title,
        ruleCode:
          selectedRule.ruleCode,
        groupCode:
          selectedRule.groupCode,
        academicYear: year,
        weekNumber,
      }
    );

    await api.post(
      "/api/violations",
      {
        name,
        className,

        description:
          selectedRule.title,

        ruleCode:
          selectedRule.ruleCode,

        groupCode:
          selectedRule.groupCode,

        handlingMethod: "",

        academicYear: year,

        weekNumber,

        time:
          violationDate.toISOString(),

        handled: false,

        handledBy: "",
      }
    );

    setSelectedRuleId("");
    setDayInput("");
    setMonthInput("");

    setSnackbarMessage(
      `Đã ghi nhận lỗi: ${selectedRule.title}`
    );

    setSnackbarSeverity(
      "success"
    );

    setSnackbarOpen(true);

    await fetchViolations();

    await fetchConductScore(
      weekNumber,
      year
    );

  } catch (err) {
    console.error(
      "Lỗi khi ghi nhận vi phạm:",
      err
    );

    setSnackbarMessage(
      "Lỗi khi ghi nhận vi phạm."
    );

    setSnackbarSeverity(
      "error"
    );

    setSnackbarOpen(true);
  }
};

  // ==========================================================
  // ❌ XÓA VI PHẠM
  // ==========================================================

  const handleDeleteViolation =
    async (id: string) => {
      try {
        await api.delete(
          `/api/violations/${id}`
        );

        setSnackbarMessage(
          "Xoá vi phạm thành công!"
        );

        setSnackbarSeverity(
          "success"
        );

        setSnackbarOpen(true);

        await fetchViolations();

        await refreshConductScore();
      } catch (err) {
        console.error(
          "Lỗi xoá vi phạm:",
          err
        );

        setSnackbarMessage(
          "Lỗi xoá vi phạm."
        );

        setSnackbarSeverity(
          "error"
        );

        setSnackbarOpen(true);
      }
    };

  // ==========================================================
  // ✏️ MỞ DIALOG SỬA
  // ==========================================================

  const openEditDialog = (
    v: Violation
  ) => {
    setEditItem(v);

    setEditDescription(
      v.description
    );

    setEditDate(
      renderTime(v.time)
    );

    setEditDialogOpen(
      true
    );
  };

  // ==========================================================
  // 💾 LƯU SỬA
  // ==========================================================

  const handleSaveEdit =
    async () => {
      if (!editItem) return;

      try {
        const parsedDate =
          dayjs(
            editDate,
            "DD/MM/YYYY"
          );

        const formattedDate =
          parsedDate.isValid()
            ? parsedDate.toDate()
            : new Date();

        await api.put(
          `/api/violations/${editItem._id}`,
          {
            description:
              editDescription,

            time:
              formattedDate,
          }
        );

        setSnackbarMessage(
          "Đã cập nhật lỗi vi phạm!"
        );

        setSnackbarSeverity(
          "success"
        );

        setSnackbarOpen(true);

        setEditDialogOpen(
          false
        );

        await fetchViolations();

        await refreshConductScore();
      } catch (err) {
        console.error(
          "Lỗi khi cập nhật vi phạm:",
          err
        );

        setSnackbarMessage(
          "Không thể cập nhật vi phạm."
        );

        setSnackbarSeverity(
          "error"
        );

        setSnackbarOpen(true);
      }
    };

  // ==========================================================
  // ĐIỂM HIỆN TẠI
  // ==========================================================

const currentScore =
  conductScore?.finalScore ??
  maxConductScore;

 const seriousViolation =
  conductScore?.hasSeriousViolation ??
  false;

const totalConductViolations =
  conductScore?.totalConductViolations ??
  0;

  const isBelowThreshold =
    currentScore <
    maxConductScore * 0.5;

  // ==========================================================
  // RENDER
  // ==========================================================

  return (
    <Box
      sx={{
        width: "80vw",
        maxWidth: 1500,
        py: 5,
        mx: "auto",
      }}
    >
      {/* ======================================================
          TIÊU ĐỀ
      ====================================================== */}

      <Typography
        variant="h4"
        fontWeight="bold"
        align="center"
        mb={1}
      >
        Chi tiết vi phạm
      </Typography>

      <Typography
        variant="h6"
        align="center"
        mb={3}
      >
        Học sinh:{" "}
        <strong>{name}</strong>
        {" - "}
        Lớp:{" "}
        <strong>{className}</strong>
      </Typography>

      {/* ======================================================
          THÔNG TIN HẠNH KIỂM
      ====================================================== */}

      <Card
        sx={{
          mb: 3,
          borderRadius: 3,
          boxShadow: 3,
        }}
      >
        <CardContent>
          <Stack
            direction={{
              xs: "column",
              md: "row",
            }}
            spacing={3}
            alignItems={{
              xs: "stretch",
              md: "center",
            }}
            justifyContent="space-between"
          >
            <Box>
              <Typography
                variant="subtitle1"
                color="text.secondary"
              >
                Hạnh kiểm tuần{" "}
                {currentWeek ??
                  "—"}
              </Typography>

              <Typography
                variant="h3"
                fontWeight="bold"
                color={
                  isBelowThreshold
                    ? "error.main"
                    : "success.main"
                }
              >
                {currentScore}
                <Typography
                  component="span"
                  variant="h6"
                  color="text.secondary"
                >
                  {" "}
                  /{" "}
                  {maxConductScore}
                </Typography>
              </Typography>
            </Box>

            <Stack
              direction="row"
              spacing={1}
              flexWrap="wrap"
            >
              <Chip
                label={`Tổng lỗi HK: ${totalConductViolations}`}
                color={
                  totalConductViolations >
                  0
                    ? "warning"
                    : "success"
                }
              />

              {seriousViolation && (
                <Chip
                  label="⚠ Lỗi đặc biệt nghiêm trọng"
                  color="error"
                  sx={{
                    fontWeight:
                      "bold",
                  }}
                />
              )}
            </Stack>
          </Stack>

          <Divider sx={{ my: 2 }} />

          <Typography
            variant="body2"
            color="text.secondary"
            mb={1}
          >
            Chi tiết số lần bị trừ điểm
            hạnh kiểm trong tuần:
          </Typography>

          <Stack
            direction="row"
            spacing={1}
            flexWrap="wrap"
          >
            <Chip
              size="small"
              label={`N1: ${
                conductScore?.groupViolations?.N1 ?? 0
              } lần`}
            />

            <Chip
              size="small"
              label={`N2: ${
                conductScore?.groupViolations?.N2 ?? 0
              } lần`}
            />

            <Chip
              size="small"
              label={`N3: ${
                conductScore?.groupViolations?.N3 ?? 0
              } lần`}
            />

            <Chip
              size="small"
              label={`N4: ${
                conductScore?.groupViolations?.N4 ?? 0
              } lần`}
            />

            <Chip
              size="small"
              label={`N5: ${
                conductScore?.groupViolations?.N5 ?? 0
              } lần`}
            />
          </Stack>

          <Typography
            variant="caption"
            color="text.secondary"
            display="block"
            mt={2}
          >
            Mỗi lỗi thuộc nhóm N1–N5 bị
            trừ 1 điểm hạnh kiểm. Điểm
            `point` của nội quy không dùng
            để tính điểm hạnh kiểm.
          </Typography>
        </CardContent>
      </Card>

      {/* ======================================================
          GHI NHẬN LỖI
      ====================================================== */}

      <Card
        sx={{
          my: 3,
          borderRadius: 3,
          boxShadow: 2,
        }}
      >
        <CardContent>
          <Typography
            variant="h6"
            fontWeight="bold"
          >
            Ghi nhận lỗi mới
          </Typography>

          <Stack
            direction={{
              xs: "column",
              sm: "row",
            }}
            spacing={2}
            mt={2}
            alignItems="center"
          >
            <FormControl fullWidth>
              <InputLabel>
                Lỗi vi phạm
              </InputLabel>

              <Select
                value={
                  selectedRuleId
                }
                label="Lỗi vi phạm"
                onChange={(e) =>
                  setSelectedRuleId(
                    e.target.value
                  )
                }
              >
                {rules
                  .filter(
                    (rule) =>
                      rule.active !==
                      false
                  )
                  .map((rule) => (
                    <MenuItem
                      key={
                        rule._id
                      }
                      value={
                        rule._id
                      }
                    >
                      {rule.title}

                      {rule.groupCode && (
                        <>
                          {" "}
                          —{" "}
                          {rule.groupCode}
                        </>
                      )}

                      {" "}
                      (
                      {rule.point}
                      {" "}
                      điểm lớp)
                    </MenuItem>
                  ))}
              </Select>
            </FormControl>

            <TextField
              label="Ngày"
              value={dayInput}
              onChange={(e) =>
                setDayInput(
                  e.target.value.replace(
                    /\D/g,
                    ""
                  )
                )
              }
              inputProps={{
                maxLength: 2,
              }}
              sx={{
                width: {
                  xs: "100%",
                  sm: 100,
                },
              }}
            />

            <TextField
              label="Tháng"
              value={monthInput}
              onChange={(e) =>
                setMonthInput(
                  e.target.value.replace(
                    /\D/g,
                    ""
                  )
                )
              }
              inputProps={{
                maxLength: 2,
              }}
              sx={{
                width: {
                  xs: "100%",
                  sm: 110,
                },
              }}
            />

            <Button
              variant="contained"
              onClick={
                handleAddViolation
              }
              sx={{
                minWidth: 110,
              }}
            >
              Ghi nhận
            </Button>
          </Stack>

          <Button
            variant="outlined"
            sx={{ mt: 2 }}
            onClick={() =>
              navigate(
                "/violation/"
              )
            }
          >
            Nhập tên học sinh mới
          </Button>
        </CardContent>
      </Card>

      {/* ======================================================
          DANH SÁCH VI PHẠM
      ====================================================== */}

      <TableContainer
        component={Paper}
        sx={{
          borderRadius: 2,
          overflowX: "auto",
        }}
      >
        <Table>
          <TableHead>
            <TableRow
              sx={{
                backgroundColor:
                  "#87cafe",
              }}
            >
              <TableCell>
                <strong>
                  STT
                </strong>
              </TableCell>

              <TableCell>
                <strong>
                  Lỗi vi phạm
                </strong>
              </TableCell>

              <TableCell>
                <strong>
                  Nhóm
                </strong>
              </TableCell>

              <TableCell>
                <strong>
                  Thời gian
                </strong>
              </TableCell>

              <TableCell>
                <strong>
                  Hình thức xử lý
                </strong>
              </TableCell>

              <TableCell>
                <strong>
                  Trạng thái
                </strong>
              </TableCell>

              <TableCell>
                <strong>
                  Điểm lớp
                </strong>
              </TableCell>

              <TableCell>
                <strong>
                  HK
                </strong>
              </TableCell>

              <TableCell>
                <strong>
                  Tuần
                </strong>
              </TableCell>

              <TableCell>
                <strong>
                  Thao tác
                </strong>
              </TableCell>
            </TableRow>
          </TableHead>

          <TableBody>
            {violations.map(
              (v, idx) => {
                const matchedRule =
                  getRuleForViolation(
                    v
                  );

                const groupCode =
                  matchedRule?.groupCode?.toUpperCase();

                const affectsConduct =
                  [
                    "N1",
                    "N2",
                    "N3",
                    "N4",
                    "N5",
                  ].includes(
                    groupCode || ""
                  );

                const isSerious =
                  groupCode ===
                  "S1";

                return (
                  <TableRow
                    key={v._id}
                  >
                    <TableCell>
                      {idx + 1}
                    </TableCell>

                    <TableCell>
                      <Typography
                        fontWeight={
                          isSerious
                            ? "bold"
                            : "normal"
                        }
                        color={
                          isSerious
                            ? "error"
                            : "inherit"
                        }
                      >
                        {v.description}
                      </Typography>
                    </TableCell>

                    <TableCell>
                      {groupCode ? (
                        <Chip
                          size="small"
                          label={
                            groupCode
                          }
                          color={
                            isSerious
                              ? "error"
                              : affectsConduct
                              ? "warning"
                              : "default"
                          }
                        />
                      ) : (
                        "—"
                      )}
                    </TableCell>

                    <TableCell>
                      {renderTime(
                        v.time
                      )}
                    </TableCell>

                    <TableCell>
                      {v.handlingMethod ||
                        "—"}
                    </TableCell>

                    <TableCell>
                      {v.handled ? (
                        <Box
                          sx={{
                            backgroundColor:
                              "green",
                            color:
                              "white",
                            px: 1,
                            py: 0.5,
                            borderRadius: 1,
                            textAlign:
                              "center",
                          }}
                        >
                          Đã xử lý
                        </Box>
                      ) : (
                        <Box
                          sx={{
                            backgroundColor:
                              "#ffcccc",
                            color:
                              "red",
                            px: 1,
                            py: 0.5,
                            borderRadius: 1,
                            textAlign:
                              "center",
                          }}
                        >
                          Chưa xử lý
                        </Box>
                      )}
                    </TableCell>

                    <TableCell>
                      {matchedRule?.point ??
                        0}
                    </TableCell>

                    <TableCell>
                      {affectsConduct ? (
                        <Chip
                          size="small"
                          label="-1 HK"
                          color="warning"
                        />
                      ) : isSerious ? (
                        <Chip
                          size="small"
                          label="Không trừ"
                          color="error"
                        />
                      ) : (
                        <Chip
                          size="small"
                          label="Không trừ"
                          variant="outlined"
                        />
                      )}
                    </TableCell>

                    <TableCell>
                      {v.weekNumber ??
                        "N/A"}
                    </TableCell>

                    <TableCell>
                      <Stack
                        direction="row"
                        spacing={1}
                      >
                        <Button
                          size="small"
                          onClick={() =>
                            openEditDialog(
                              v
                            )
                          }
                        >
                          Sửa
                        </Button>

                        <Button
                          size="small"
                          color="error"
                          onClick={() =>
                            handleDeleteViolation(
                              v._id
                            )
                          }
                        >
                          Xoá
                        </Button>
                      </Stack>
                    </TableCell>
                  </TableRow>
                );
              }
            )}

            {violations.length ===
              0 && (
              <TableRow>
                <TableCell
                  colSpan={10}
                  align="center"
                >
                  Chưa có vi phạm
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* ======================================================
          DIALOG SỬA
      ====================================================== */}

      <Dialog
        open={editDialogOpen}
        onClose={() =>
          setEditDialogOpen(false)
        }
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>
          Sửa lỗi vi phạm
        </DialogTitle>

        <DialogContent>
          <FormControl
            fullWidth
            sx={{ mt: 2 }}
          >
            <InputLabel>
              Lỗi vi phạm
            </InputLabel>

            <Select
              value={
                editDescription
              }
              label="Lỗi vi phạm"
              onChange={(e) =>
                setEditDescription(
                  e.target.value
                )
              }
            >
              {rules
                .filter(
                  (rule) =>
                    rule.active !==
                    false
                )
                .map((rule) => (
                  <MenuItem
                    key={
                      rule._id
                    }
                    value={
                      rule.title
                    }
                  >
                    {rule.title}

                    {rule.groupCode &&
                      ` — ${rule.groupCode}`}

                    {" "}
                    (
                    {rule.point}
                    {" "}
                    điểm lớp)
                  </MenuItem>
                ))}
            </Select>
          </FormControl>

          <TextField
            fullWidth
            sx={{ mt: 2 }}
            label="Ngày vi phạm (dd/mm/yyyy)"
            value={editDate}
            onChange={(e) =>
              setEditDate(
                e.target.value
              )
            }
          />
        </DialogContent>

        <DialogActions>
          <Button
            onClick={() =>
              setEditDialogOpen(
                false
              )
            }
          >
            Hủy
          </Button>

          <Button
            variant="contained"
            onClick={
              handleSaveEdit
            }
          >
            Lưu
          </Button>
        </DialogActions>
      </Dialog>

      {/* ======================================================
          SNACKBAR
      ====================================================== */}

      <Snackbar
        open={snackbarOpen}
        autoHideDuration={3000}
        onClose={() =>
          setSnackbarOpen(false)
        }
        anchorOrigin={{
          vertical: "bottom",
          horizontal: "center",
        }}
      >
        <Alert
          onClose={() =>
            setSnackbarOpen(false)
          }
          severity={
            snackbarSeverity
          }
          sx={{
            width: "100%",
          }}
        >
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default ViolationDetailPage;
