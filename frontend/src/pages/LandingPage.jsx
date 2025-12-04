import React from "react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Container,
  Typography,
  Button,
  Grid,
  Paper,
  AppBar,
  Toolbar,
  Stack,
  Card,
  CardContent,
  useTheme,
  useMediaQuery,
} from "@mui/material";
import { ThemeProvider, createTheme } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";

// Create custom theme
const theme = createTheme({
  palette: {
    primary: {
      main: "#FF9839",
      dark: "#E87F2A",
      light: "#FFB366",
    },
    secondary: {
      main: "#6366F1",
      dark: "#4F46E5",
    },
    background: {
      default: "#0F172A",
      paper: "#1E293B",
    },
    text: {
      primary: "#F1F5F9",
      secondary: "#CBD5E1",
    },
  },
  typography: {
    fontFamily:
      "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif",
    h1: {
      fontSize: "3.5rem",
      fontWeight: 800,
      lineHeight: 1.2,
      letterSpacing: "-1px",
      "@media (max-width:768px)": {
        fontSize: "2.2rem",
      },
      "@media (max-width:480px)": {
        fontSize: "1.75rem",
      },
    },
    h2: {
      fontSize: "2.5rem",
      fontWeight: 800,
      "@media (max-width:768px)": {
        fontSize: "1.8rem",
      },
    },
    body1: {
      fontSize: "1.2rem",
      color: "#CBD5E1",
      "@media (max-width:768px)": {
        fontSize: "1rem",
      },
    },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: "none",
          borderRadius: "10px",
          fontSize: "1.05rem",
          fontWeight: 600,
          padding: "1rem 2.5rem",
          transition: "all 0.3s ease",
          "@media (max-width:480px)": {
            padding: "0.85rem 1.8rem",
            fontSize: "0.95rem",
          },
        },
        containedPrimary: {
          background: "linear-gradient(135deg, #FF9839 0%, #E87F2A 100%)",
          boxShadow: "0 4px 15px rgba(255, 152, 57, 0.3)",
          "&:hover": {
            transform: "translateY(-3px)",
            boxShadow: "0 8px 25px rgba(255, 152, 57, 0.4)",
          },
        },
        outlinedSecondary: {
          borderColor: "#6366F1",
          color: "#6366F1",
          backgroundColor: "rgba(99, 102, 241, 0.15)",
          border: "2px solid #6366F1",
          "&:hover": {
            backgroundColor: "rgba(99, 102, 241, 0.25)",
            transform: "translateY(-3px)",
          },
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          background: "rgba(15, 23, 42, 0.8)",
          backdropFilter: "blur(10px)",
          boxShadow: "0 4px 6px rgba(0, 0, 0, 0.3)",
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          background: "rgba(30, 41, 59, 0.8)",
          border: "1px solid #334155",
          transition: "all 0.3s ease",
          "&:hover": {
            borderColor: "#FF9839",
            transform: "translateY(-8px)",
            boxShadow: "0 12px 30px rgba(255, 152, 57, 0.15)",
          },
        },
      },
    },
  },
});

export default function LandingPage() {
  const navigate = useNavigate();
  const muiTheme = useTheme();
  const isMobile = useMediaQuery(muiTheme.breakpoints.down("md"));

  const handleCreateMeet = () => {
    const code = Math.random().toString(36).substring(2, 10).toUpperCase();
    navigate(`/${code}`);
  };

  const handleRegister = () => {
    navigate("/auth");
  };

  const handleLogin = () => {
    navigate("/auth");
  };

  const scrollToFeatures = () => {
    const featuresSection = document.getElementById("features");
    featuresSection?.scrollIntoView({ behavior: "smooth" });
  };

  const features = [
    {
      icon: "📱",
      title: "Instant Meetings",
      description:
        "Create a meeting in seconds. No sign-up required. Just click and connect.",
    },
    {
      icon: "💬",
      title: "Integrated Chat",
      description: "Integrated chat feature to converse during the call.",
    },
    {
      icon: "🌍",
      title: "Global Reach",
      description:
        "Connect with anyone, anywhere in the world with high quality.",
    },
    {
      icon: "⚡",
      title: "Lightning Fast",
      description:
        "Optimized for speed. Ultra-low latency connections guaranteed.",
    },
    {
      icon: "🎨",
      title: "Beautiful UI",
      description: "Sleek and intuitive interface designed for everyone.",
    },
    {
      icon: "📊",
      title: "Call History",
      description:
        "Track all your meetings and manage your call history easily.",
    },
  ];

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box
        sx={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}
      >
        {/* Navigation Bar */}
        <AppBar position="sticky">
          <Toolbar
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              px: { xs: 1, md: 2 },
            }}
          >
            <Typography
              variant="h6"
              sx={{
                background: "linear-gradient(135deg, #FF9839 0%, #8B5CF6 100%)",
                backgroundClip: "text",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                fontWeight: 700,
                fontSize: { xs: "1.3rem", md: "1.75rem" },
                letterSpacing: "-0.5px",
              }}
            >
              📞 CallBuddy
            </Typography>

            <Stack
              direction="row"
              spacing={1}
              sx={{
                display: "flex",
                alignItems: "center",
                gap: { xs: 0.5, md: 1.5 },
              }}
            >
              <Button
                onClick={scrollToFeatures}
                sx={{
                  color: "#F1F5F9",
                  fontSize: { xs: "0.85rem", md: "0.95rem" },
                  p: { xs: "0.4rem 0.8rem", md: "0.5rem 1rem" },
                  "&:hover": {
                    color: "#FF9839",
                    backgroundColor: "rgba(255, 152, 57, 0.1)",
                  },
                }}
              >
                Features
              </Button>
              <Button
                onClick={() => alert("Contact: support@callbuddy.com")}
                sx={{
                  color: "#F1F5F9",
                  fontSize: { xs: "0.85rem", md: "0.95rem" },
                  p: { xs: "0.4rem 0.8rem", md: "0.5rem 1rem" },
                  "&:hover": {
                    color: "#FF9839",
                    backgroundColor: "rgba(255, 152, 57, 0.1)",
                  },
                }}
              >
                Support
              </Button>
              <Button
                variant="contained"
                color="primary"
                onClick={handleLogin}
                sx={{
                  fontSize: { xs: "0.85rem", md: "0.95rem" },
                  p: { xs: "0.6rem 1.2rem", md: "0.7rem 1.5rem" },
                }}
              >
                Login
              </Button>
            </Stack>
          </Toolbar>
        </AppBar>

        {/* Hero Section */}
        <Box
          sx={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            py: { xs: 2.5, md: 4 },
            px: 2,
          }}
        >
          <Container maxWidth="lg">
            <Grid container spacing={3} alignItems="center">
              {/* Left Content */}
              <Grid item xs={12} md={6}>
                <Typography
                  variant="h1"
                  sx={{
                    mb: 2,
                  }}
                >
                  <span style={{ color: "#FF9839" }}>Connect</span> with your
                  Loved Ones
                </Typography>

                <Typography
                  variant="body1"
                  sx={{
                    mb: 3,
                    maxWidth: "500px",
                  }}
                >
                  Experience crystal-clear video and audio calls. No downloads
                  needed. Just create an instant meeting and start connecting.
                </Typography>

                <Stack
                  direction={{ xs: "column", sm: "row" }}
                  spacing={2}
                  sx={{
                    flexWrap: "wrap",
                  }}
                >
                  <Button
                    variant="contained"
                    color="primary"
                    onClick={handleCreateMeet}
                    sx={{
                      width: { xs: "100%", sm: "auto" },
                    }}
                  >
                    ⚡ Create Instant Meet
                  </Button>
                  <Button
                    variant="outlined"
                    color="secondary"
                    onClick={handleRegister}
                    sx={{
                      width: { xs: "100%", sm: "auto" },
                    }}
                  >
                    ✨ Get Started
                  </Button>
                </Stack>
              </Grid>

              {/* Right Hero Image */}
              <Grid item xs={12} md={6}>
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                  }}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 400 500"
                    alt="CallBuddy Video Call Interface"
                    style={{
                      maxWidth: "100%",
                      height: "auto",
                      filter:
                        "drop-shadow(0 20px 60px rgba(255, 152, 57, 0.2))",
                      animation: "float 3s ease-in-out infinite",
                    }}
                  >
                    {/* Phone background */}
                    <rect fill="#1E293B" width="400" height="500" rx="40" />
                    {/* Screen area */}
                    <rect
                      fill="#2D3E50"
                      x="20"
                      y="50"
                      width="360"
                      height="280"
                      rx="20"
                    />
                    {/* User avatar - orange circle (representing user's face) */}
                    <circle cx="200" cy="140" r="40" fill="#FF9839" />
                    {/* Control buttons area */}
                    <rect
                      fill="#334155"
                      x="60"
                      y="350"
                      width="280"
                      height="80"
                      rx="10"
                    />
                    {/* Control button 1 - Mute/Audio (purple) */}
                    <circle cx="120" cy="390" r="15" fill="#6366F1" />
                    {/* Control button 2 - Camera (orange) */}
                    <circle cx="200" cy="390" r="15" fill="#FF9839" />
                    {/* Control button 3 - End call (purple) */}
                    <circle cx="280" cy="390" r="15" fill="#8B5CF6" />
                  </svg>
                </Box>
              </Grid>
            </Grid>
          </Container>
        </Box>

        {/* Features Section */}
        <Box
          id="features"
          sx={{
            py: 6,
            px: 2,
            background: "rgba(30, 41, 59, 0.5)",
            borderTop: "1px solid #334155",
            borderBottom: "1px solid #334155",
          }}
        >
          <Container maxWidth="lg">
            <Typography
              variant="h2"
              sx={{
                textAlign: "center",
                mb: { xs: 3, md: 5 },
                fontSize: { xs: "2rem", sm: "2.5rem", md: "3rem" },
              }}
            >
              Why Choose CallBuddy?
            </Typography>

            <Grid
              container
              spacing={{ xs: 2, sm: 3, md: 4 }}
              sx={{
                display: "grid",
                gridTemplateColumns: {
                  xs: "1fr",
                  sm: "repeat(2, 1fr)",
                  md: "repeat(3, 1fr)",
                },
              }}
            >
              {features.map((feature, index) => (
                <Grid
                  item
                  xs={12}
                  sm={6}
                  md={4}
                  key={index}
                  sx={{ display: "flex" }}
                >
                  <Card
                    sx={{
                      width: "100%",
                      display: "flex",
                      flexDirection: "column",
                      height: "100%",
                      transition: "all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)",
                      "&:hover": {
                        transform: "translateY(-12px)",
                        borderColor: "#FF9839",
                        boxShadow: "0 16px 40px rgba(255, 152, 57, 0.2)",
                      },
                    }}
                  >
                    <CardContent
                      sx={{
                        textAlign: "center",
                        py: 4,
                        px: 3,
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                        flex: 1,
                      }}
                    >
                      <Box
                        sx={{
                          width: 70,
                          height: 70,
                          background:
                            "linear-gradient(135deg, #FF9839 0%, #8B5CF6 100%)",
                          borderRadius: "16px",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          mx: "auto",
                          mb: 2,
                          fontSize: "2.5rem",
                          boxShadow: "0 8px 20px rgba(255, 152, 57, 0.2)",
                        }}
                      >
                        {feature.icon}
                      </Box>
                      <Typography
                        variant="h6"
                        sx={{
                          mb: 1.5,
                          fontWeight: 700,
                          fontSize: { xs: "1.1rem", md: "1.25rem" },
                        }}
                      >
                        {feature.title}
                      </Typography>
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{
                          fontSize: { xs: "0.85rem", md: "0.95rem" },
                          lineHeight: 1.6,
                        }}
                      >
                        {feature.description}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </Container>
        </Box>

        {/* CTA Section */}
        <Box
          sx={{
            py: 4,
            px: 2,
            textAlign: "center",
            background:
              "linear-gradient(135deg, rgba(255, 152, 57, 0.1) 0%, rgba(139, 92, 246, 0.1) 100%)",
          }}
        >
          <Container maxWidth="sm">
            <Typography variant="h2" sx={{ mb: 2 }}>
              Ready to Connect?
            </Typography>
            <Typography variant="body1" sx={{ mb: 3 }}>
              Start making crystal-clear calls in seconds. No credit card
              required.
            </Typography>
            <Button
              variant="contained"
              color="primary"
              onClick={handleCreateMeet}
              size="large"
              fullWidth
            >
              ⚡ Create Your First Meet Now
            </Button>
          </Container>
        </Box>

        {/* Footer */}
        <Box
          component="footer"
          sx={{
            background: "rgba(15, 23, 42, 0.9)",
            borderTop: "1px solid #334155",
            py: 2.5,
            textAlign: "center",
            color: "#CBD5E1",
            fontSize: "0.9rem",
            mt: "auto",
          }}
        >
          <Typography variant="caption">
            &copy; 2025 CallBuddy. All rights reserved. | Cover a distance by
            Call-Buddy
          </Typography>
        </Box>

        {/* CSS Animation */}
        <style>{`
          @keyframes float {
            0%, 100% {
              transform: translateY(0px);
            }
            50% {
              transform: translateY(-20px);
            }
          }
        `}</style>
      </Box>
    </ThemeProvider>
  );
}
