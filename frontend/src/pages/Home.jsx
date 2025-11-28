import {
  Box,
  Button,
  TextField,
  Card,
  CardContent,
  Grid,
  Avatar,
  Typography,
  IconButton,
  Chip,
  Paper,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  InputAdornment,
} from "@mui/material";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import VideocamIcon from "@mui/icons-material/Videocam";
import AddIcon from "@mui/icons-material/Add";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import HistoryIcon from "@mui/icons-material/History";
import PersonIcon from "@mui/icons-material/Person";
import CalendarTodayIcon from "@mui/icons-material/CalendarToday";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import GroupIcon from "@mui/icons-material/Group";
import LogoutIcon from "@mui/icons-material/Logout";
import SettingsIcon from "@mui/icons-material/Settings";
import DarkModeIcon from "@mui/icons-material/DarkMode";
import LightModeIcon from "@mui/icons-material/LightMode";
import LinkIcon from "@mui/icons-material/Link";
import { styled } from "@mui/material/styles";
import withAuth from "../utils/WithAuth";
import { useContext } from "react";
import { AuthContext } from "../contexts/AuthContext";

const StyledCard = styled(Card)(({ theme }) => ({
  borderRadius: "16px",
  boxShadow: "0 4px 12px rgba(0, 0, 0, 0.08)",
  transition: "all 0.3s ease",
  "&:hover": {
    boxShadow: "0 8px 24px rgba(0, 0, 0, 0.12)",
    transform: "translateY(-4px)",
  },
}));

const GradientButton = styled(Button)(({ theme }) => ({
  background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
  color: "#fff",
  padding: "12px 32px",
  borderRadius: "12px",
  textTransform: "none",
  fontSize: "16px",
  fontWeight: "bold",
  "&:hover": {
    background: "linear-gradient(135deg, #5568d3 0%, #6941a5 100%)",
  },
}));

const Homepage = () => {
  const navigate = useNavigate();

  // States
  const [user, setUser] = useState(null);
  const [meetingCode, setMeetingCode] = useState("");
  const [meetingHistory, setMeetingHistory] = useState([]);
  const [openCreateDialog, setOpenCreateDialog] = useState(false);
  const [newMeetingCode, setNewMeetingCode] = useState("");
  const [loading, setLoading] = useState(true);

  const { addToUserHistory, getHistoryOfUser } = useContext(AuthContext);

  // Fetch user data and meeting history on mount
  useEffect(() => {
    fetchUserData();
    fetchMeetingHistory();
  }, []);

  const fetchUserData = async () => {
    try {
      // Replace with your actual API endpoint
      // const response = await fetch("http://localhost:3000/api/user", {
      //   headers: {
      //     Authorization: `Bearer ${localStorage.getItem("token")}`,
      //   },
      // });

      const data = JSON.parse(localStorage.getItem("user"));
      setUser(data);
      setLoading(false);
    } catch (error) {
      console.error("Error fetching user data:", error);
      setLoading(false);
    }
  };

  const fetchMeetingHistory = async () => {
    try {
      // Replace with your actual API endpoint
      // const response = await fetch(
      //   "http://localhost:3000/api/meetings/history",
      //   {
      //     headers: {
      //       Authorization: `Bearer ${localStorage.getItem("token")}`,
      //     },
      //   }
      // );
      const data = await getHistoryOfUser();
      console.log("Meeting history response:", data);
      setMeetingHistory(data);
    } catch (error) {
      console.error("Error fetching meeting history:", error);
    }
  };

  const generateMeetingCode = () => {
    const code = Math.random().toString(36).substring(2, 10).toUpperCase();
    setNewMeetingCode(code);
    return code;
  };

  const handleCreateMeeting = async () => {
    const code = generateMeetingCode();

    try {
      // Save meeting to database
      // await fetch("http://localhost:3000/api/meetings/create", {
      //   method: "POST",
      //   headers: {
      //     "Content-Type": "application/json",
      //     Authorization: `Bearer ${localStorage.getItem("token")}`,
      //   },
      //   body: JSON.stringify({
      //     meetingCode: code,
      //     userId: user?.id,
      //   }),
      // });
      await addToUserHistory(code);

      setOpenCreateDialog(true);
    } catch (error) {
      console.error("Error creating meeting:", error);
    }
  };

  const handleJoinMeeting = async () => {
    if (meetingCode.trim()) {
      await addToUserHistory(meetingCode.trim());
      navigate(`/${meetingCode}`);
    }
  };

  const handleStartNewMeeting = () => {
    navigate(`/${newMeetingCode}`);
  };

  const copyMeetingLink = () => {
    const link = `${window.location.origin}/${newMeetingCode}`;
    navigator.clipboard.writeText(link);
    // You can add a toast notification here
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/");
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (loading) {
    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          minHeight: "100vh",
        }}
      >
        <Typography>Loading...</Typography>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        minHeight: "100vh",
        backgroundColor: "#f5f7fa",
        color: "#333",
      }}
    >
      {/* Header */}
      <Box
        sx={{
          background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
          padding: "24px",
          color: "#fff",
        }}
      >
        <Box
          sx={{
            maxWidth: "1200px",
            margin: "0 auto",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
            <VideocamIcon sx={{ fontSize: 40 }} />
            <Typography variant="h4" fontWeight="bold">
              CallBuddy
            </Typography>
          </Box>

          <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
            <Tooltip title="Logout">
              <IconButton onClick={handleLogout} sx={{ color: "#fff" }}>
                <LogoutIcon />
              </IconButton>
            </Tooltip>
            <Avatar
              sx={{
                bgcolor: "#fff",
                color: "#667eea",
                fontWeight: "bold",
              }}
            >
              {user?.name?.charAt(0).toUpperCase() || "U"}
            </Avatar>
          </Box>
        </Box>
      </Box>

      {/* Main Content */}
      <Box sx={{ maxWidth: "1200px", margin: "0 auto", padding: 4 }}>
        <Grid container spacing={3}>
          {/* Left Column - User Info & Actions */}
          <Grid item xs={12} md={4}>
            {/* User Profile Card */}
            <StyledCard sx={{ mb: 3 }}>
              <CardContent>
                <Box sx={{ textAlign: "center", mb: 2 }}>
                  <Avatar
                    sx={{
                      width: 80,
                      height: 80,
                      margin: "0 auto 16px",
                      bgcolor: "#667eea",
                      fontSize: "32px",
                    }}
                  >
                    {user?.name?.charAt(0).toUpperCase() || "U"}
                  </Avatar>
                  <Typography variant="h5" fontWeight="bold" gutterBottom>
                    {user?.name || "Guest User"}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {user?.username || "guest@example.com"}
                  </Typography>
                </Box>

                <Divider sx={{ my: 2 }} />

                <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <CalendarTodayIcon fontSize="small" color="action" />
                    <Typography variant="body2" color="text.secondary">
                      Member since{" "}
                      {/* TODO add proper joining date into the Database */}
                      {user?.joinedDate ? formatDate(user.joinedDate) : "2025"}
                    </Typography>
                  </Box>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <VideocamIcon fontSize="small" color="action" />
                    <Typography variant="body2" color="text.secondary">
                      {meetingHistory.length} meetings hosted
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </StyledCard>

            {/* Quick Stats */}
            <StyledCard>
              <CardContent>
                <Typography variant="h6" fontWeight="bold" gutterBottom>
                  Quick Stats
                </Typography>
                <Grid container spacing={2} sx={{ mt: 1 }}>
                  <Grid item xs={6}>
                    <Paper
                      elevation={0}
                      sx={{
                        p: 2,
                        textAlign: "center",
                        bgcolor: "#f0f4ff",
                        borderRadius: "12px",
                      }}
                    >
                      <Typography
                        variant="h4"
                        color="primary"
                        fontWeight="bold"
                      >
                        {meetingHistory.length}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Total Meetings
                      </Typography>
                    </Paper>
                  </Grid>
                  <Grid item xs={6}>
                    <Paper
                      elevation={0}
                      sx={{
                        p: 2,
                        textAlign: "center",
                        bgcolor: "#f0fff4",
                        borderRadius: "12px",
                      }}
                    >
                      <Typography
                        variant="h4"
                        color="success.main"
                        fontWeight="bold"
                      >
                        {
                          // TODO:  add status property to meeting data
                          meetingHistory.filter((m) => m.status === "completed")
                            .length
                        }
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Completed
                      </Typography>
                    </Paper>
                  </Grid>
                </Grid>
              </CardContent>
            </StyledCard>
          </Grid>

          {/* Right Column - Main Actions & History */}
          <Grid item xs={12} md={8}>
            {/* Create/Join Meeting Card */}
            <StyledCard sx={{ mb: 3 }}>
              <CardContent>
                <Typography variant="h5" fontWeight="bold" gutterBottom>
                  Start or Join a Meeting
                </Typography>
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ mb: 3 }}
                >
                  Connect with anyone, anywhere, anytime
                </Typography>

                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <Paper
                      elevation={0}
                      sx={{
                        p: 3,
                        textAlign: "center",
                        border: "2px dashed #667eea",
                        borderRadius: "16px",
                        cursor: "pointer",
                        transition: "all 0.3s",
                        "&:hover": {
                          backgroundColor: "#f0f4ff",
                          borderColor: "#5568d3",
                        },
                      }}
                      onClick={handleCreateMeeting}
                    >
                      <Box
                        sx={{
                          width: 60,
                          height: 60,
                          borderRadius: "50%",
                          background:
                            "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          margin: "0 auto 16px",
                        }}
                      >
                        <AddIcon sx={{ fontSize: 32, color: "#fff" }} />
                      </Box>
                      <Typography variant="h6" fontWeight="bold" gutterBottom>
                        New Meeting
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Start an instant meeting
                      </Typography>
                    </Paper>
                  </Grid>

                  <Grid item xs={12} sm={6}>
                    <Paper
                      elevation={0}
                      sx={{
                        p: 3,
                        border: "2px solid #e0e0e0",
                        borderRadius: "16px",
                      }}
                    >
                      <Typography variant="h6" fontWeight="bold" gutterBottom>
                        Join Meeting
                      </Typography>
                      <TextField
                        fullWidth
                        placeholder="Enter meeting code"
                        value={meetingCode}
                        onChange={(e) =>
                          setMeetingCode(e.target.value.toUpperCase())
                        }
                        variant="outlined"
                        size="small"
                        sx={{ mb: 2 }}
                        InputProps={{
                          startAdornment: (
                            <InputAdornment position="start">
                              <LinkIcon />
                            </InputAdornment>
                          ),
                        }}
                      />
                      <Button
                        fullWidth
                        variant="contained"
                        onClick={handleJoinMeeting}
                        disabled={!meetingCode.trim()}
                        sx={{
                          background: meetingCode.trim()
                            ? "linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
                            : "#e0e0e0",
                          textTransform: "none",
                          fontWeight: "bold",
                        }}
                      >
                        Join
                      </Button>
                    </Paper>
                  </Grid>
                </Grid>
              </CardContent>
            </StyledCard>

            {/* Meeting History */}
            <StyledCard>
              <CardContent>
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    mb: 2,
                  }}
                >
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <HistoryIcon color="action" />
                    <Typography variant="h6" fontWeight="bold">
                      Recent Meetings
                    </Typography>
                  </Box>
                  <Chip
                    label={`${meetingHistory.length} Total`}
                    size="small"
                    color="primary"
                    variant="outlined"
                  />
                </Box>

                {meetingHistory.length === 0 ? (
                  <Box sx={{ textAlign: "center", py: 4 }}>
                    <HistoryIcon sx={{ fontSize: 60, color: "#ccc", mb: 2 }} />
                    <Typography color="text.secondary">
                      No meeting history yet
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Start your first meeting to see it here
                    </Typography>
                  </Box>
                ) : (
                  <List>
                    {meetingHistory.slice(0, 5).map((meeting, index) => (
                      <ListItem
                        key={meeting._id || index}
                        sx={{
                          borderRadius: "12px",
                          mb: 1,
                          "&:hover": {
                            backgroundColor: "#f5f5f5",
                          },
                        }}
                        secondaryAction={
                          <Tooltip title="Join Again">
                            <IconButton
                              edge="end"
                              onClick={() =>
                                navigate(`/${meeting.meetingCode}`)
                              }
                            >
                              <VideocamIcon />
                            </IconButton>
                          </Tooltip>
                        }
                      >
                        <ListItemAvatar>
                          <Avatar sx={{ bgcolor: "#667eea" }}>
                            <VideocamIcon />
                          </Avatar>
                        </ListItemAvatar>
                        <ListItemText
                          primary={
                            <Typography fontWeight="bold" component="div">
                              Meeting #{meeting.meetingCode}
                            </Typography>
                          }
                          secondaryTypographyProps={{ component: "div" }}
                          secondary={
                            <Box sx={{ display: "flex", gap: 2, mt: 0.5 }}>
                              <Box
                                sx={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 0.5,
                                }}
                              >
                                <CalendarTodayIcon fontSize="small" />
                                <Typography variant="caption">
                                  {formatDate(meeting.date)}
                                </Typography>
                              </Box>
                              <Box
                                sx={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 0.5,
                                }}
                              >
                                <AccessTimeIcon fontSize="small" />
                                <Typography variant="caption">
                                  {formatTime(meeting.date)}
                                </Typography>
                              </Box>
                              {meeting.participants && (
                                <Box
                                  sx={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 0.5,
                                  }}
                                >
                                  <GroupIcon fontSize="small" />
                                  <Typography variant="caption">
                                    {meeting.participants} participants
                                  </Typography>
                                </Box>
                              )}
                            </Box>
                          }
                        />
                      </ListItem>
                    ))}
                  </List>
                )}
              </CardContent>
            </StyledCard>
          </Grid>
        </Grid>
      </Box>

      {/* Create Meeting Dialog */}
      <Dialog
        open={openCreateDialog}
        onClose={() => setOpenCreateDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <VideocamIcon color="primary" />
            <Typography variant="h6" fontWeight="bold">
              Meeting Created Successfully!
            </Typography>
          </Box>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ textAlign: "center", py: 2 }}>
            <Typography variant="body1" gutterBottom>
              Your meeting code is:
            </Typography>
            <Paper
              elevation={0}
              sx={{
                p: 2,
                bgcolor: "#f5f5f5",
                borderRadius: "12px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                my: 2,
              }}
            >
              <Typography variant="h4" fontWeight="bold" color="primary">
                {newMeetingCode}
              </Typography>
              <Tooltip title="Copy Code">
                <IconButton onClick={copyMeetingLink}>
                  <ContentCopyIcon />
                </IconButton>
              </Tooltip>
            </Paper>
            <Typography variant="body2" color="text.secondary">
              Share this code with participants to join the meeting
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 3, pt: 0 }}>
          <Button onClick={() => setOpenCreateDialog(false)}>Close</Button>
          <GradientButton
            onClick={handleStartNewMeeting}
            startIcon={<VideocamIcon />}
          >
            Start Meeting
          </GradientButton>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default withAuth(Homepage);
