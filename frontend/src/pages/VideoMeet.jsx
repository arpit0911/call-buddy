import {
  Button,
  TextField,
  Box,
  Container,
  Grid,
  Paper,
  IconButton,
  Badge,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
} from "@mui/material";
import { useState, useEffect, useRef, memo } from "react";
import io from "socket.io-client";
import VideocamIcon from "@mui/icons-material/Videocam";
import VideocamOffIcon from "@mui/icons-material/VideocamOff";
import MicIcon from "@mui/icons-material/Mic";
import MicOffIcon from "@mui/icons-material/MicOff";
import CallEndIcon from "@mui/icons-material/CallEnd";
import PhoneIcon from "@mui/icons-material/Phone";
import SendIcon from "@mui/icons-material/Send";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import { styled } from "@mui/material/styles";
import { useMediaQuery, useTheme } from "@mui/material";

const server_url = "http://localhost:3000";
var connections = {};

const peerConfigConnections = {
  iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
};

// Styled Components
const VideoContainer = styled(Paper)(({ theme }) => ({
  backgroundColor: "#000",
  borderRadius: "12px",
  overflow: "hidden",
  position: "relative",
  aspectRatio: "16/9",
  [theme.breakpoints.down("sm")]: {
    aspectRatio: "4/3",
  },
  "& video": {
    width: "100%",
    height: "100%",
    objectFit: "cover",
    display: "block",
  },
}));

const PeerVideoContainer = styled(Box)(({ theme }) => ({
  position: "relative",
  backgroundColor: "#1a1a1a",
  borderRadius: "8px",
  overflow: "hidden",
  aspectRatio: "16/9",
  [theme.breakpoints.down("sm")]: {
    aspectRatio: "4/3",
  },
  "& video": {
    width: "100%",
    height: "100%",
    objectFit: "cover",
    display: "block",
  },
}));

const ControlsBar = styled(Box)(({ theme }) => ({
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  gap: theme.spacing(1),
  padding: theme.spacing(2),
  backgroundColor: "rgba(0, 0, 0, 0.8)",
  backdropFilter: "blur(10px)",
  borderRadius: "12px",
  flexWrap: "wrap",
  [theme.breakpoints.down("sm")]: {
    gap: theme.spacing(0.5),
    padding: theme.spacing(1),
  },
}));

const LobbyContainer = styled(Container)(({ theme }) => ({
  display: "flex",
  flexDirection: "column",
  justifyContent: "center",
  alignItems: "center",
  minHeight: "100vh",
  paddingTop: theme.spacing(4),
  paddingBottom: theme.spacing(4),
  background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
}));

const LobbyCard = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(4),
  borderRadius: "16px",
  boxShadow: "0 8px 32px rgba(0, 0, 0, 0.1)",
  maxWidth: "500px",
  width: "100%",
  [theme.breakpoints.down("sm")]: {
    padding: theme.spacing(2),
  },
}));

const PeerName = styled(Chip)(({ theme }) => ({
  position: "absolute",
  bottom: theme.spacing(1),
  left: theme.spacing(1),
  backgroundColor: "rgba(0, 0, 0, 0.6)",
  color: "#fff",
  "& .MuiChip-label": {
    paddingLeft: theme.spacing(1),
    paddingRight: theme.spacing(1),
  },
}));

const MessageBubble = styled(Box)(({ theme, isOwn }) => ({
  display: "flex",
  justifyContent: isOwn ? "flex-end" : "flex-start",
  marginBottom: theme.spacing(0.5),
  animation: "fadeIn 0.3s ease-in",
  "@keyframes fadeIn": {
    from: { opacity: 0, transform: "translateY(10px)" },
    to: { opacity: 1, transform: "translateY(0)" },
  },
}));

const MessageContent = styled(Box)(({ theme, isOwn }) => ({
  maxWidth: "85%",
  backgroundColor: isOwn
    ? "linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
    : "rgba(118, 75, 162, 0.3)",
  color: "#fff",
  padding: theme.spacing(1.2, 1.5),
  borderRadius: "12px",
  fontSize: "13px",
  wordBreak: "break-word",
  boxShadow: isOwn ? "0 4px 12px rgba(102, 126, 234, 0.3)" : "none",
}));

const TypingIndicator = styled(Box)(({ theme }) => ({
  display: "flex",
  gap: "4px",
  padding: theme.spacing(0.5, 1),
  "& span": {
    width: "8px",
    height: "8px",
    borderRadius: "50%",
    backgroundColor: "rgba(102, 126, 234, 0.7)",
    animation: "bounce 1.4s infinite",
    "&:nth-of-type(2)": {
      animationDelay: "0.2s",
    },
    "&:nth-of-type(3)": {
      animationDelay: "0.4s",
    },
  },
  "@keyframes bounce": {
    "0%, 80%, 100%": { transform: "translateY(0)" },
    "40%": { transform: "translateY(-10px)" },
  },
}));

// FIXED: Separate component for peer videos to prevent re-renders
const PeerVideo = memo(({ video }) => {
  const videoRef = useRef(null);

  // FIX: Only update stream once when it changes
  useEffect(() => {
    if (videoRef.current && video.stream) {
      videoRef.current.srcObject = video.stream;
    }
  }, [video.stream]);

  return (
    <PeerVideoContainer>
      <video ref={videoRef} autoPlay playsInline data-socket={video.socketId} />
      <PeerName
        label={`Peer: ${video.socketId.substring(0, 8)}`}
        variant="outlined"
        size="small"
      />
    </PeerVideoContainer>
  );
});

PeerVideo.displayName = "PeerVideo";

export default function VideoMeet() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const isSmallMobile = useMediaQuery(theme.breakpoints.down("sm"));

  const socketRef = useRef();
  const socketIdRef = useRef();
  const localVideoRef = useRef();
  const videoRef = useRef([]);
  const iceCandidatesQueue = useRef({});
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  const [videoAvailable, setVideoAvailable] = useState(false);
  const [audioAvailable, setAudioAvailable] = useState(false);
  const [screenAvailable, setScreenAvailable] = useState(false);

  const [video, setVideo] = useState(false);
  const [audio, setAudio] = useState(false);
  const [screen, setScreen] = useState(false);

  const [showChat, setShowChat] = useState(!isMobile);
  const [messages, setMessages] = useState([]);
  const [message, setMessage] = useState("");
  const [newMessages, setNewMessages] = useState(0);

  const [askForUsername, setAskForUsername] = useState(true);
  const [username, setUsername] = useState("");
  const [videos, setVideos] = useState([]);
  const [isConnecting, setIsConnecting] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [participantCount, setParticipantCount] = useState(1);
  const [usersTyping, setUsersTyping] = useState({});

  const sentMessagesRef = useRef(new Set());

  // Auto-scroll to latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Timer for call duration
  useEffect(() => {
    if (!askForUsername) {
      const interval = setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [askForUsername]);

  // Format call duration
  const formatDuration = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours}:${minutes.toString().padStart(2, "0")}:${secs
      .toString()
      .padStart(2, "0")}`;
  };

  const getPermissions = async () => {
    try {
      const videoPermission = await navigator.mediaDevices.getUserMedia({
        video: true,
      });
      if (videoPermission) {
        setVideoAvailable(true);
        console.log("✅ Video permission granted");
        videoPermission.getTracks().forEach((track) => track.stop());
      }
    } catch (error) {
      console.log("❌ Video permission denied:", error);
      setVideoAvailable(false);
    }

    try {
      const audioPermission = await navigator.mediaDevices.getUserMedia({
        audio: true,
      });
      if (audioPermission) {
        setAudioAvailable(true);
        console.log("✅ Audio permission granted");
        audioPermission.getTracks().forEach((track) => track.stop());
      }
    } catch (error) {
      console.log("❌ Audio permission denied:", error);
      setAudioAvailable(false);
    }

    if (navigator.mediaDevices.getDisplayMedia) {
      setScreenAvailable(true);
    } else {
      setScreenAvailable(false);
    }

    try {
      const userMediaStream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
      if (userMediaStream) {
        console.log("✅ Lobby preview stream obtained");
        window.localStream = userMediaStream;
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = userMediaStream;
        }
      }
    } catch (error) {
      console.log("❌ Error getting lobby preview:", error);
    }
  };

  useEffect(() => {
    console.log("🚀 Initializing permissions");
    getPermissions();

    return () => {
      if (
        window.localStream &&
        typeof window.localStream.getTracks === "function"
      ) {
        window.localStream.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  const silence = () => {
    let ctx = new AudioContext();
    let oscillator = ctx.createOscillator();
    let dst = oscillator.connect(ctx.createMediaStreamDestination());
    oscillator.start();
    ctx.resume();
    return Object.assign(dst.stream.getAudioTracks()[0], { enabled: false });
  };

  const black = ({ width = 640, height = 480 } = {}) => {
    let canvas = Object.assign(document.createElement("canvas"), {
      width,
      height,
    });
    canvas.getContext("2d").fillRect(0, 0, width, height);
    let stream = canvas.captureStream();
    return Object.assign(stream.getVideoTracks()[0], { enabled: false });
  };

  const getMediaUserSuccess = (stream) => {
    console.log("✅ getMediaUserSuccess - received new stream");

    try {
      if (
        window.localStream &&
        typeof window.localStream.getTracks === "function"
      ) {
        window.localStream.getTracks().forEach((track) => {
          track.stop();
        });
      }
    } catch (error) {
      console.error("❌ Error stopping old tracks:", error);
    }

    window.localStream = stream;

    if (localVideoRef.current) {
      localVideoRef.current.srcObject = stream;
    }

    for (let id in connections) {
      if (id === socketIdRef.current) continue;

      try {
        if (connections[id].getSenders) {
          connections[id].getSenders().forEach((sender) => {
            connections[id].removeTrack(sender);
          });
        }

        stream.getTracks().forEach((track) => {
          connections[id].addTrack(track, stream);
        });

        connections[id].createOffer().then((description) => {
          connections[id]
            .setLocalDescription(description)
            .then(() => {
              socketRef.current.emit(
                "signal",
                id,
                JSON.stringify({ sdp: connections[id].localDescription })
              );
            })
            .catch((error) => {
              console.error("❌ Error setting local description:", error);
            });
        });
      } catch (error) {
        console.error("❌ Error updating peer connection:", error);
      }
    }

    stream.getTracks().forEach((track) => {
      track.onended = () => {
        setVideo(false);
        setAudio(false);

        try {
          if (localVideoRef.current && localVideoRef.current.srcObject) {
            let tracks = localVideoRef.current.srcObject.getTracks();
            tracks.forEach((track) => track.stop());
          }
        } catch (error) {
          console.error("❌ Error stopping tracks on end:", error);
        }

        let blackSilence = (...args) =>
          new MediaStream([black(...args), silence()]);
        window.localStream = blackSilence();
        localVideoRef.current.srcObject = window.localStream;

        for (let id in connections) {
          try {
            if (connections[id].getSenders) {
              connections[id].getSenders().forEach((sender) => {
                connections[id].removeTrack(sender);
              });
            }

            window.localStream.getTracks().forEach((track) => {
              connections[id].addTrack(track, window.localStream);
            });

            connections[id].createOffer().then((description) => {
              connections[id]
                .setLocalDescription(description)
                .then(() => {
                  socketRef.current.emit(
                    "signal",
                    id,
                    JSON.stringify({ sdp: connections[id].localDescription })
                  );
                })
                .catch((e) => console.log(e));
            });
          } catch (error) {
            console.error("❌ Error updating peer with black silence:", error);
          }
        }
      };
    });
  };

  const getUserMedia = () => {
    console.log("📹 getUserMedia called - video:", video, "audio:", audio);

    if ((audio && audioAvailable) || (video && videoAvailable)) {
      navigator.mediaDevices
        .getUserMedia({
          video: video && videoAvailable,
          audio: audio && audioAvailable,
        })
        .then(getMediaUserSuccess)
        .catch((error) => {
          console.error("❌ getUserMedia error:", error);
        });
    } else {
      try {
        if (localVideoRef.current && localVideoRef.current.srcObject) {
          let tracks = localVideoRef.current.srcObject.getTracks();
          tracks.forEach((track) => track.stop());
        }
      } catch (error) {
        console.error("❌ Error stopping tracks:", error);
      }

      let blackSilence = (...args) =>
        new MediaStream([black(...args), silence()]);
      window.localStream = blackSilence();
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = window.localStream;
      }
    }
  };

  useEffect(() => {
    if (isConnecting && video !== undefined && audio !== undefined) {
      console.log("⏳ Effect: Calling getUserMedia");
      getUserMedia();
    }
  }, [audio, video, isConnecting]);

  const gotMessageFromServer = (fromId, message) => {
    let signal = JSON.parse(message);

    if (fromId !== socketIdRef.current) {
      if (signal.sdp) {
        connections[fromId]
          .setRemoteDescription(new RTCSessionDescription(signal.sdp))
          .then(() => {
            console.log("✅ Remote description set for:", fromId);

            if (iceCandidatesQueue.current[fromId]) {
              iceCandidatesQueue.current[fromId].forEach((candidate) => {
                connections[fromId]
                  .addIceCandidate(new RTCIceCandidate(candidate))
                  .catch((e) =>
                    console.error("❌ Error adding queued ICE:", e)
                  );
              });
              delete iceCandidatesQueue.current[fromId];
            }

            if (signal.sdp.type === "offer") {
              connections[fromId]
                .createAnswer()
                .then((description) => {
                  connections[fromId]
                    .setLocalDescription(description)
                    .then(() => {
                      socketRef.current.emit(
                        "signal",
                        fromId,
                        JSON.stringify({
                          sdp: connections[fromId].localDescription,
                        })
                      );
                    })
                    .catch((error) => {
                      console.error(
                        "❌ Error setting local description:",
                        error
                      );
                    });
                })
                .catch((error) => {
                  console.error("❌ Error creating answer:", error);
                });
            }
          })
          .catch((error) => {
            console.error("❌ Error setting remote description:", error);
          });
      }

      if (signal.ice) {
        if (connections[fromId] && connections[fromId].remoteDescription) {
          connections[fromId]
            .addIceCandidate(new RTCIceCandidate(signal.ice))
            .catch((e) => {
              if (e.code !== "InvalidStateError") {
                console.error("❌ Error adding ICE candidate:", e);
              }
            });
        } else {
          console.log("⏳ Queueing ICE candidate for:", fromId);
          if (!iceCandidatesQueue.current[fromId]) {
            iceCandidatesQueue.current[fromId] = [];
          }
          iceCandidatesQueue.current[fromId].push(signal.ice);
        }
      }
    }
  };

  const addMessage = (data, sender, socketIdSender, timestamp) => {
    console.log(`💬 Message received from ${sender}: "${data}"`);

    const messageKey = `${socketIdSender}-${data}-${timestamp}`;

    if (
      socketIdSender !== socketIdRef.current ||
      !sentMessagesRef.current.has(messageKey)
    ) {
      const newMsg = {
        text: data,
        sender: sender || "Unknown",
        isOwn: socketIdSender === socketIdRef.current,
        timestamp: timestamp
          ? new Date(timestamp).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })
          : new Date().toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            }),
        socketId: socketIdSender,
        key: messageKey,
      };

      setMessages((prev) => {
        const exists = prev.some((msg) => msg.key === messageKey);
        if (!exists) {
          return [...prev, newMsg];
        }
        return prev;
      });

      if (socketIdSender !== socketIdRef.current && !showChat) {
        setNewMessages((prev) => prev + 1);
      }

      setUsersTyping((prev) => {
        const updated = { ...prev };
        delete updated[socketIdSender];
        return updated;
      });
    }
  };

  const connectToSocketServer = () => {
    socketRef.current = io.connect(server_url, { secure: false });

    socketRef.current.on("signal", gotMessageFromServer);

    socketRef.current.on("connect", () => {
      console.log("🟢 Socket connected:", socketRef.current.id);
      socketRef.current.emit("join-call", window.location.href, username);
      socketIdRef.current = socketRef.current.id;

      socketRef.current.on("chat-message", addMessage);

      socketRef.current.on(
        "user-typing",
        (socketId, isTyping, typingUsername) => {
          console.log(
            `⌨️ ${typingUsername} is ${isTyping ? "typing" : "stopped typing"}`
          );
          setUsersTyping((prev) => {
            if (isTyping) {
              return { ...prev, [socketId]: typingUsername };
            } else {
              const updated = { ...prev };
              delete updated[socketId];
              return updated;
            }
          });
        }
      );

      socketRef.current.on("user-left", (id) => {
        console.log("🔴 User left:", id);
        setVideos((vids) => vids.filter((v) => v.socketId !== id));
        setParticipantCount((prev) => Math.max(1, prev - 1));
        if (connections[id]) {
          connections[id].close();
          delete connections[id];
        }
        delete iceCandidatesQueue.current[id];
      });

      socketRef.current.on("user-joined", (id, clients) => {
        console.log("🟢 User joined:", id, "Total clients:", clients.length);
        setParticipantCount(clients.length);

        // FIX: Set up all connections, but skip self
        clients.forEach((socketListId) => {
          console.log(
            `Processing client: ${socketListId}, Current user: ${socketIdRef.current}`
          );

          // SKIP SELF - don't connect to yourself
          if (socketListId === socketIdRef.current) {
            console.log("⏭️ Skipping self connection");
            return;
          }

          // If connection already exists, update it but don't recreate
          if (connections[socketListId]) {
            console.log("✅ Connection already exists for:", socketListId);

            // Still add local stream if not already added
            if (
              window.localStream !== undefined &&
              window.localStream !== null
            ) {
              window.localStream.getTracks().forEach((track) => {
                try {
                  connections[socketListId].addTrack(track, window.localStream);
                } catch (e) {
                  // Track might already be added
                  console.log("ℹ️ Track already added:", e.message);
                }
              });
            }
            return;
          }

          // CREATE NEW CONNECTION
          console.log("🆕 Creating new connection for:", socketListId);
          connections[socketListId] = new RTCPeerConnection(
            peerConfigConnections
          );

          connections[socketListId].onicecandidate = (event) => {
            if (event.candidate != null) {
              socketRef.current.emit(
                "signal",
                socketListId,
                JSON.stringify({ ice: event.candidate })
              );
            }
          };

          // CRITICAL: Set up ontrack handler
          connections[socketListId].ontrack = (event) => {
            console.log("🎥 ontrack event from:", socketListId);

            let videoExists = videoRef.current.find(
              (video) => video.socketId === socketListId
            );

            if (videoExists) {
              console.log("📝 Updating existing video stream");
              setVideos((videos) => {
                const updatedVideos = videos.map((video) =>
                  video.socketId === socketListId
                    ? { ...video, stream: event.streams[0] }
                    : video
                );
                videoRef.current = updatedVideos;
                return updatedVideos;
              });
            } else {
              console.log("➕ Adding new video stream");
              let newVideo = {
                socketId: socketListId,
                stream: event.streams[0],
                autoPlay: true,
                playsinline: true,
              };
              setVideos((videos) => {
                const updatedVideos = [...videos, newVideo];
                videoRef.current = updatedVideos;
                return updatedVideos;
              });
            }
          };

          // Add local stream
          if (window.localStream !== undefined && window.localStream !== null) {
            window.localStream.getTracks().forEach((track) => {
              connections[socketListId].addTrack(track, window.localStream);
            });
          } else {
            let blackSilence = (...args) =>
              new MediaStream([black(...args), silence()]);
            window.localStream = blackSilence();
            window.localStream.getTracks().forEach((track) => {
              connections[socketListId].addTrack(track, window.localStream);
            });
          }
        });

        // If I'm the joining user, create offers
        if (id === socketIdRef.current) {
          console.log("📤 I am the joining user, creating offers");
          for (let id2 in connections) {
            if (id2 === socketIdRef.current) continue;

            try {
              connections[id2].createOffer().then((description) => {
                connections[id2]
                  .setLocalDescription(description)
                  .then(() => {
                    socketRef.current.emit(
                      "signal",
                      id2,
                      JSON.stringify({ sdp: connections[id2].localDescription })
                    );
                  })
                  .catch((error) => {
                    console.error("❌ Error setting local description:", error);
                  });
              });
            } catch (error) {
              console.error("❌ Error creating offer:", error);
            }
          }
        }
      });
    });

    socketRef.current.on("disconnect", () => {
      console.log("🔴 Socket disconnected");
    });
  };

  const getMedia = () => {
    console.log("📞 getMedia called with username:", username);
    setVideo(videoAvailable);
    setAudio(audioAvailable);
    setIsConnecting(true);
    connectToSocketServer();
  };

  const connect = () => {
    if (!username.trim()) {
      alert("Please enter a username");
      return;
    }
    console.log("🚀 Connecting as:", username);
    setAskForUsername(false);
    getMedia();
  };

  const handleSendMessage = () => {
    if (message.trim()) {
      console.log(`📤 Sending message: "${message}"`);

      const timestamp = new Date().toISOString();
      const messageKey = `${socketIdRef.current}-${message}-${timestamp}`;

      sentMessagesRef.current.add(messageKey);

      socketRef.current.emit("chat-message", message, username);

      const newMsg = {
        text: message,
        sender: username,
        isOwn: true,
        timestamp: new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
        socketId: socketIdRef.current,
        key: messageKey,
      };
      setMessages((prev) => [...prev, newMsg]);
      setMessage("");

      socketRef.current.emit("typing", window.location.href, false, username);
      setUsersTyping((prev) => {
        const updated = { ...prev };
        delete updated[socketIdRef.current];
        return updated;
      });
    }
  };

  const handleMessageChange = (e) => {
    setMessage(e.target.value);

    if (socketRef.current) {
      socketRef.current.emit("typing", window.location.href, true, username);

      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      typingTimeoutRef.current = setTimeout(() => {
        socketRef.current.emit("typing", window.location.href, false, username);
      }, 2000);
    }
  };

  const handleEndCall = () => {
    console.log("☎️ Ending call");
    try {
      if (localVideoRef.current && localVideoRef.current.srcObject) {
        let tracks = localVideoRef.current.srcObject.getTracks();
        tracks.forEach((track) => track.stop());
      }
    } catch (e) {
      console.error("❌ Error ending call:", e);
    }
    socketRef.current?.disconnect();
    window.location.href = "/";
  };

  // LOBBY SCREEN
  if (askForUsername) {
    return (
      <LobbyContainer maxWidth="sm">
        <LobbyCard elevation={3}>
          <Box sx={{ textAlign: "center", mb: 3 }}>
            <PhoneIcon sx={{ fontSize: 60, color: "#667eea", mb: 2 }} />
            <h1 style={{ margin: "0 0 8px 0", color: "#333" }}>Video Meet</h1>
            <p style={{ margin: 0, color: "#666", fontSize: "14px" }}>
              Connect with anyone, anytime
            </p>
          </Box>

          <Box sx={{ mb: 3, borderRadius: "12px", overflow: "hidden" }}>
            <video
              ref={localVideoRef}
              autoPlay
              muted
              style={{
                width: "100%",
                height: "auto",
                display: "block",
                backgroundColor: "#000",
                minHeight: "250px",
              }}
            />
          </Box>

          <TextField
            fullWidth
            label="Enter your name"
            placeholder="Your name"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            variant="outlined"
            sx={{ mb: 2 }}
            autoFocus
            onKeyPress={(e) => e.key === "Enter" && connect()}
          />

          <Button
            fullWidth
            variant="contained"
            size="large"
            onClick={connect}
            startIcon={<PhoneIcon />}
            sx={{
              background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
              py: 1.5,
              fontSize: "16px",
              fontWeight: "bold",
              textTransform: "none",
              borderRadius: "8px",
            }}
          >
            Join Call
          </Button>
        </LobbyCard>
      </LobbyContainer>
    );
  }

  // MEETING SCREEN
  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        height: "100vh",
        backgroundColor: "#0a0e27",
        color: "#fff",
      }}
    >
      {/* Header */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: theme.spacing(2),
          backgroundColor: "rgba(0, 0, 0, 0.4)",
          backdropFilter: "blur(10px)",
          borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
          flexShrink: 0,
        }}
      >
        <Box>
          <h2
            style={{ margin: "0 0 4px 0", fontSize: "20px", fontWeight: "600" }}
          >
            Video Meeting
          </h2>
          <Box
            sx={{
              display: "flex",
              gap: 2,
              alignItems: "center",
              flexWrap: "wrap",
            }}
          >
            <Chip
              icon={<PhoneIcon />}
              label={`${participantCount} participant${
                participantCount !== 1 ? "s" : ""
              }`}
              size="small"
              sx={{
                backgroundColor: "rgba(102, 126, 234, 0.2)",
                color: "#fff",
              }}
            />
            <Chip
              label={formatDuration(callDuration)}
              size="small"
              sx={{ backgroundColor: "rgba(118, 75, 162, 0.2)", color: "#fff" }}
            />
          </Box>
        </Box>

        <Box sx={{ display: "flex", gap: 1 }}>
          {!isMobile && (
            <Tooltip title="Toggle Chat">
              <IconButton
                onClick={() => {
                  setShowChat(!showChat);
                  setNewMessages(0);
                }}
                sx={{ color: "#fff" }}
              >
                <Badge badgeContent={newMessages} color="error">
                  <SendIcon />
                </Badge>
              </IconButton>
            </Tooltip>
          )}
        </Box>
      </Box>

      {/* Main Content */}
      <Box
        sx={{
          display: "flex",
          flex: 1,
          gap: 2,
          padding: 2,
          overflow: "hidden",
          minHeight: 0,
        }}
      >
        {/* Videos Section */}
        <Box
          sx={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            gap: 2,
            minWidth: 0,
            minHeight: 0,
          }}
        >
          {/* Local Video */}
          <VideoContainer elevation={2}>
            <video ref={localVideoRef} autoPlay muted />
            <PeerName label={`${username} (You)`} variant="outlined" />
          </VideoContainer>

          {/* Remote Videos Grid */}
          {videos.length > 0 && (
            <Grid container spacing={1} sx={{ flex: 1 }}>
              {videos.map((video) => (
                <Grid
                  item
                  xs={12}
                  sm={videos.length === 1 ? 12 : 6}
                  md={videos.length === 1 ? 12 : 6}
                  key={video.socketId}
                  sx={{ minHeight: 0 }}
                >
                  <PeerVideo video={video} />
                </Grid>
              ))}
            </Grid>
          )}
        </Box>

        {/* Chat Section (Desktop) */}
        {showChat && !isMobile && (
          <Paper
            sx={{
              width: isSmallMobile ? "100%" : "320px",
              display: "flex",
              flexDirection: "column",
              backgroundColor: "rgba(0, 0, 0, 0.4)",
              backdropFilter: "blur(10px)",
              borderRadius: "12px",
              overflow: "hidden",
              border: "1px solid rgba(255, 255, 255, 0.1)",
              flexShrink: 0,
              minHeight: 0,
            }}
          >
            {/* Chat Header */}
            <Box
              sx={{
                padding: 1.5,
                borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
                flexShrink: 0,
              }}
            >
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <h3 style={{ margin: 0, fontSize: "14px", fontWeight: "600" }}>
                  Messages ({messages.length})
                </h3>
                <IconButton
                  size="small"
                  onClick={() => setShowChat(false)}
                  sx={{ color: "#fff" }}
                >
                  <MoreVertIcon fontSize="small" />
                </IconButton>
              </Box>
            </Box>

            {/* Messages */}
            <Box
              sx={{
                flex: 1,
                overflowY: "auto",
                padding: 1.5,
                display: "flex",
                flexDirection: "column",
                gap: 1,
                minHeight: 0,
                "&::-webkit-scrollbar": { width: "6px" },
                "&::-webkit-scrollbar-track": { background: "transparent" },
                "&::-webkit-scrollbar-thumb": {
                  background: "rgba(255, 255, 255, 0.2)",
                  borderRadius: "3px",
                },
              }}
            >
              {messages.length === 0 ? (
                <Box
                  sx={{
                    textAlign: "center",
                    color: "#888",
                    fontSize: "12px",
                    pt: 2,
                  }}
                >
                  No messages yet
                </Box>
              ) : (
                <>
                  {messages.map((msg, idx) => (
                    <MessageBubble key={idx} isOwn={msg.isOwn}>
                      <MessageContent isOwn={msg.isOwn}>
                        {!msg.isOwn && (
                          <p
                            style={{
                              margin: "0 0 4px 0",
                              fontSize: "11px",
                              opacity: 0.7,
                            }}
                          >
                            {msg.sender}
                          </p>
                        )}
                        <p style={{ margin: 0 }}>{msg.text}</p>
                        <p
                          style={{
                            margin: "4px 0 0 0",
                            fontSize: "10px",
                            opacity: 0.6,
                          }}
                        >
                          {msg.timestamp}
                        </p>
                      </MessageContent>
                    </MessageBubble>
                  ))}
                  <div ref={messagesEndRef} />
                </>
              )}

              {/* Typing Indicator */}
              {Object.keys(usersTyping).length > 0 && (
                <Box
                  sx={{ display: "flex", gap: 1, alignItems: "center", mt: 1 }}
                >
                  <TypingIndicator>
                    <span></span>
                    <span></span>
                    <span></span>
                  </TypingIndicator>
                  <span style={{ fontSize: "12px", opacity: 0.7 }}>
                    {Object.values(usersTyping).join(", ")} typing...
                  </span>
                </Box>
              )}
            </Box>

            {/* Message Input */}
            <Box
              sx={{
                padding: 1,
                borderTop: "1px solid rgba(255, 255, 255, 0.1)",
                display: "flex",
                gap: 1,
                flexShrink: 0,
              }}
            >
              <TextField
                fullWidth
                size="small"
                placeholder="Type message..."
                value={message}
                onChange={handleMessageChange}
                onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
                variant="outlined"
                sx={{
                  "& .MuiOutlinedInput-root": {
                    color: "#fff",
                    backgroundColor: "rgba(255, 255, 255, 0.05)",
                    "& fieldset": { borderColor: "rgba(255, 255, 255, 0.2)" },
                    "&:hover fieldset": {
                      borderColor: "rgba(255, 255, 255, 0.3)",
                    },
                  },
                  "& .MuiOutlinedInput-input::placeholder": {
                    opacity: 0.5,
                    color: "#fff",
                  },
                }}
              />
              <Tooltip title="Send">
                <IconButton
                  onClick={handleSendMessage}
                  sx={{ color: "#667eea" }}
                >
                  <SendIcon />
                </IconButton>
              </Tooltip>
            </Box>
          </Paper>
        )}
      </Box>

      {/* Controls Bar */}
      <ControlsBar>
        <Tooltip title={video ? "Stop Video" : "Start Video"}>
          <IconButton
            onClick={() => setVideo(!video)}
            sx={{
              backgroundColor: video
                ? "rgba(102, 126, 234, 0.2)"
                : "rgba(255, 59, 48, 0.2)",
              color: video ? "#667eea" : "#ff3b30",
              "&:hover": {
                backgroundColor: video
                  ? "rgba(102, 126, 234, 0.3)"
                  : "rgba(255, 59, 48, 0.3)",
              },
            }}
          >
            {video ? <VideocamIcon /> : <VideocamOffIcon />}
          </IconButton>
        </Tooltip>

        <Tooltip title={audio ? "Mute Audio" : "Unmute Audio"}>
          <IconButton
            onClick={() => setAudio(!audio)}
            sx={{
              backgroundColor: audio
                ? "rgba(102, 126, 234, 0.2)"
                : "rgba(255, 59, 48, 0.2)",
              color: audio ? "#667eea" : "#ff3b30",
              "&:hover": {
                backgroundColor: audio
                  ? "rgba(102, 126, 234, 0.3)"
                  : "rgba(255, 59, 48, 0.3)",
              },
            }}
          >
            {audio ? <MicIcon /> : <MicOffIcon />}
          </IconButton>
        </Tooltip>

        {isMobile && (
          <Tooltip title="Toggle Chat">
            <IconButton
              onClick={() => {
                setShowChat(!showChat);
                setNewMessages(0);
              }}
              sx={{
                backgroundColor: "rgba(118, 75, 162, 0.2)",
                color: "#764ba2",
                "&:hover": {
                  backgroundColor: "rgba(118, 75, 162, 0.3)",
                },
              }}
            >
              <Badge badgeContent={newMessages} color="error">
                <SendIcon />
              </Badge>
            </IconButton>
          </Tooltip>
        )}

        <Tooltip title="End Call">
          <IconButton
            onClick={handleEndCall}
            sx={{
              backgroundColor: "rgba(255, 59, 48, 0.2)",
              color: "#ff3b30",
              "&:hover": {
                backgroundColor: "rgba(255, 59, 48, 0.3)",
              },
            }}
          >
            <CallEndIcon />
          </IconButton>
        </Tooltip>
      </ControlsBar>

      {/* Chat Dialog (Mobile) */}
      <Dialog
        open={showChat && isMobile}
        onClose={() => setShowChat(false)}
        fullWidth
        maxWidth="sm"
        PaperProps={{
          sx: {
            backgroundColor: "rgba(10, 14, 39, 0.95)",
            backdropFilter: "blur(10px)",
            color: "#fff",
            height: "90vh",
            display: "flex",
            flexDirection: "column",
          },
        }}
      >
        <DialogTitle
          sx={{
            borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
            flexShrink: 0,
          }}
        >
          Messages ({messages.length})
        </DialogTitle>
        <DialogContent
          sx={{
            display: "flex",
            flexDirection: "column",
            gap: 1,
            flex: 1,
            overflowY: "auto",
            minHeight: 0,
            padding: 2,
          }}
        >
          {messages.length === 0 ? (
            <Box sx={{ textAlign: "center", color: "#888", py: 2 }}>
              No messages yet
            </Box>
          ) : (
            <>
              {messages.map((msg, idx) => (
                <MessageBubble key={idx} isOwn={msg.isOwn}>
                  <MessageContent isOwn={msg.isOwn}>
                    {!msg.isOwn && (
                      <p
                        style={{
                          margin: "0 0 4px 0",
                          fontSize: "12px",
                          opacity: 0.7,
                        }}
                      >
                        {msg.sender}
                      </p>
                    )}
                    <p style={{ margin: 0 }}>{msg.text}</p>
                    <p
                      style={{
                        margin: "4px 0 0 0",
                        fontSize: "10px",
                        opacity: 0.6,
                      }}
                    >
                      {msg.timestamp}
                    </p>
                  </MessageContent>
                </MessageBubble>
              ))}
              <div ref={messagesEndRef} />
            </>
          )}

          {/* Typing Indicator */}
          {Object.keys(usersTyping).length > 0 && (
            <Box sx={{ display: "flex", gap: 1, alignItems: "center", mt: 2 }}>
              <TypingIndicator>
                <span></span>
                <span></span>
                <span></span>
              </TypingIndicator>
              <span style={{ fontSize: "12px", opacity: 0.7 }}>
                {Object.values(usersTyping).join(", ")} typing...
              </span>
            </Box>
          )}
        </DialogContent>
        <DialogActions
          sx={{
            borderTop: "1px solid rgba(255, 255, 255, 0.1)",
            gap: 1,
            p: 1,
            flexShrink: 0,
          }}
        >
          <TextField
            fullWidth
            size="small"
            placeholder="Type message..."
            value={message}
            onChange={handleMessageChange}
            onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
            variant="outlined"
            sx={{
              "& .MuiOutlinedInput-root": {
                color: "#fff",
                backgroundColor: "rgba(255, 255, 255, 0.05)",
                "& fieldset": { borderColor: "rgba(255, 255, 255, 0.2)" },
              },
              "& .MuiOutlinedInput-input::placeholder": {
                opacity: 0.5,
                color: "#fff",
              },
            }}
          />
          <Button
            onClick={handleSendMessage}
            variant="contained"
            color="primary"
            sx={{
              background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
            }}
          >
            Send
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
