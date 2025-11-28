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
import ChatIcon from "@mui/icons-material/Chat";
import VideocamOffIcon from "@mui/icons-material/VideocamOff";
import MicIcon from "@mui/icons-material/Mic";
import MicOffIcon from "@mui/icons-material/MicOff";
import CallEndIcon from "@mui/icons-material/CallEnd";
import PhoneIcon from "@mui/icons-material/Phone";
import SendIcon from "@mui/icons-material/Send";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import { styled } from "@mui/material/styles";
import { useMediaQuery, useTheme } from "@mui/material";
import ScreenShareIcon from "@mui/icons-material/ScreenShare";
import StopScreenShareIcon from "@mui/icons-material/StopScreenShare";
import { server } from "../environment";

const server_url = server;
var connections = {};

const peerConfigConnections = {
  iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
};

// Styled Components
const VideoContainer = styled(Paper)(({ theme, fullscreen }) => ({
  backgroundColor: "#000",
  borderRadius: fullscreen ? "0px" : "12px",
  overflow: "hidden",
  position: "relative",
  aspectRatio: fullscreen ? "unset" : "16/9",
  height: fullscreen ? "100%" : "auto",
  width: fullscreen ? "100%" : "auto",
  [theme.breakpoints.down("sm")]: {
    aspectRatio: fullscreen ? "unset" : "4/3",
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

  // Lobby control states
  const [lobbyVideo, setLobbyVideo] = useState(true);
  const [lobbyAudio, setLobbyAudio] = useState(true);
  const [videoDevices, setVideoDevices] = useState([]);
  const [audioDevices, setAudioDevices] = useState([]);
  const [selectedVideoDevice, setSelectedVideoDevice] = useState("");
  const [selectedAudioDevice, setSelectedAudioDevice] = useState("");
  const [showDeviceSettings, setShowDeviceSettings] = useState(false);

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
        setLobbyVideo(true);
        console.log("  Video permission granted");
        videoPermission.getTracks().forEach((track) => track.stop());
      }
    } catch (error) {
      console.log(" Video permission denied:", error);
      setVideoAvailable(false);
      setLobbyVideo(false);
    }

    try {
      const audioPermission = await navigator.mediaDevices.getUserMedia({
        audio: true,
      });
      if (audioPermission) {
        setAudioAvailable(true);
        setLobbyAudio(true);
        console.log("  Audio permission granted");
        audioPermission.getTracks().forEach((track) => track.stop());
      }
    } catch (error) {
      console.log(" Audio permission denied:", error);
      setAudioAvailable(false);
      setLobbyAudio(false);
    }

    if (navigator.mediaDevices.getDisplayMedia) {
      setScreenAvailable(true);
    } else {
      setScreenAvailable(false);
    }

    // Get available devices
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoInputs = devices.filter(
        (device) => device.kind === "videoinput"
      );
      const audioInputs = devices.filter(
        (device) => device.kind === "audioinput"
      );

      setVideoDevices(videoInputs);
      setAudioDevices(audioInputs);

      if (videoInputs.length > 0) {
        setSelectedVideoDevice(videoInputs[0].deviceId);
      }
      if (audioInputs.length > 0) {
        setSelectedAudioDevice(audioInputs[0].deviceId);
      }

      console.log("  Video devices:", videoInputs.length);
      console.log("  Audio devices:", audioInputs.length);
    } catch (error) {
      console.error(" Error enumerating devices:", error);
    }

    // Get lobby preview stream
    try {
      const userMediaStream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
      if (userMediaStream) {
        console.log("  Lobby preview stream obtained");
        window.localStream = userMediaStream;
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = userMediaStream;
        }
      }
    } catch (error) {
      console.log(" Error getting lobby preview:", error);
    }
  };

  // Toggle video in lobby
  const toggleLobbyVideo = () => {
    if (window.localStream) {
      const videoTrack = window.localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !lobbyVideo;
        setLobbyVideo(!lobbyVideo);
        console.log(`  Lobby video ${!lobbyVideo ? "ON" : "OFF"}`);
      }
    }
  };

  // Toggle audio in lobby
  const toggleLobbyAudio = () => {
    if (window.localStream) {
      const audioTrack = window.localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !lobbyAudio;
        setLobbyAudio(!lobbyAudio);
        console.log(`  Lobby audio ${!lobbyAudio ? "ON" : "OFF"}`);
      }
    }
  };

  // Change video device
  const changeVideoDevice = async (deviceId) => {
    setSelectedVideoDevice(deviceId);
    try {
      const newStream = await navigator.mediaDevices.getUserMedia({
        video: { deviceId: { exact: deviceId } },
        audio: selectedAudioDevice
          ? { deviceId: { exact: selectedAudioDevice } }
          : true,
      });

      if (window.localStream) {
        window.localStream.getTracks().forEach((track) => track.stop());
      }

      window.localStream = newStream;
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = newStream;
      }

      // Apply current video state
      const videoTrack = newStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = lobbyVideo;
      }
      const audioTrack = newStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = lobbyAudio;
      }

      console.log("  Video device changed");
    } catch (error) {
      console.error(" Error changing video device:", error);
    }
  };

  // Change audio device
  const changeAudioDevice = async (deviceId) => {
    setSelectedAudioDevice(deviceId);
    try {
      const newStream = await navigator.mediaDevices.getUserMedia({
        video: selectedVideoDevice
          ? { deviceId: { exact: selectedVideoDevice } }
          : true,
        audio: { deviceId: { exact: deviceId } },
      });

      if (window.localStream) {
        window.localStream.getTracks().forEach((track) => track.stop());
      }

      window.localStream = newStream;
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = newStream;
      }

      // Apply current states
      const videoTrack = newStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = lobbyVideo;
      }
      const audioTrack = newStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = lobbyAudio;
      }

      console.log("  Audio device changed");
    } catch (error) {
      console.error(" Error changing audio device:", error);
    }
  };

  useEffect(() => {
    console.log("  Initializing permissions");
    if (localStorage.getItem("token")) {
      const currentUser = JSON.parse(localStorage.getItem("user"));
      setUsername(currentUser?.name || "Guest User");
    }
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
    console.log("  getMediaUserSuccess - received new stream");

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
      console.error(" Error stopping old tracks:", error);
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
              console.error(" Error setting local description:", error);
            });
        });
      } catch (error) {
        console.error(" Error updating peer connection:", error);
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
          console.error(" Error stopping tracks on end:", error);
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
            console.error(" Error updating peer with black silence:", error);
          }
        }
      };
    });
  };

  const getUserMedia = () => {
    console.log("getUserMedia called - video:", video, "audio:", audio);

    // Use the actual video/audio state (which now respects lobby settings)
    if ((audio && audioAvailable) || (video && videoAvailable)) {
      navigator.mediaDevices
        .getUserMedia({
          video: video && videoAvailable,
          audio: audio && audioAvailable,
        })
        .then(getMediaUserSuccess)
        .catch((error) => {
          console.error("getUserMedia error:", error);
          // Fallback to black silence
          let blackSilence = (...args) =>
            new MediaStream([black(...args), silence()]);
          window.localStream = blackSilence();
          if (localVideoRef.current) {
            localVideoRef.current.srcObject = window.localStream;
          }
        });
    } else {
      console.log("Using black silence - no audio/video");
      try {
        if (localVideoRef.current?.srcObject) {
          let tracks = localVideoRef.current.srcObject.getTracks();
          tracks.forEach((track) => track.stop());
        }
      } catch (error) {
        console.error("Error stopping tracks:", error);
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
      console.log("  Effect: Calling getUserMedia");
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
            console.log("  Remote description set for:", fromId);

            if (iceCandidatesQueue.current[fromId]) {
              iceCandidatesQueue.current[fromId].forEach((candidate) => {
                connections[fromId]
                  .addIceCandidate(new RTCIceCandidate(candidate))
                  .catch((e) => console.error(" Error adding queued ICE:", e));
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
                      console.error(" Error setting local description:", error);
                    });
                })
                .catch((error) => {
                  console.error(" Error creating answer:", error);
                });
            }
          })
          .catch((error) => {
            console.error(" Error setting remote description:", error);
          });
      }

      if (signal.ice) {
        if (connections[fromId] && connections[fromId].remoteDescription) {
          connections[fromId]
            .addIceCandidate(new RTCIceCandidate(signal.ice))
            .catch((e) => {
              if (e.code !== "InvalidStateError") {
                console.error(" Error adding ICE candidate:", e);
              }
            });
        } else {
          console.log("  Queueing ICE candidate for:", fromId);
          if (!iceCandidatesQueue.current[fromId]) {
            iceCandidatesQueue.current[fromId] = [];
          }
          iceCandidatesQueue.current[fromId].push(signal.ice);
        }
      }
    }
  };

  const addMessage = (data, sender, socketIdSender, timestamp) => {
    console.log(`  Message received from ${sender}: "${data}"`);

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
      console.log("  Socket connected:", socketRef.current.id);
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
        console.log("  User left:", id);
        setVideos((vids) => vids.filter((v) => v.socketId !== id));
        setParticipantCount((prev) => Math.max(1, prev - 1));
        if (connections[id]) {
          connections[id].close();
          delete connections[id];
        }
        delete iceCandidatesQueue.current[id];
      });

      socketRef.current.on("user-joined", (id, clients) => {
        console.log("  User joined:", id, "Total clients:", clients.length);
        setParticipantCount(clients.length);

        // FIX: Set up all connections, but skip self
        clients.forEach((socketListId) => {
          console.log(
            `Processing client: ${socketListId}, Current user: ${socketIdRef.current}`
          );

          // SKIP SELF - don't connect to yourself
          if (socketListId === socketIdRef.current) {
            console.log("  Skipping self connection");
            return;
          }

          // If connection already exists, update it but don't recreate
          if (connections[socketListId]) {
            console.log("  Connection already exists for:", socketListId);

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
                  console.log("  Track already added:", e.message);
                }
              });
            }
            return;
          }

          // CREATE NEW CONNECTION
          console.log("  Creating new connection for:", socketListId);
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

          connections[socketListId].ontrack = (event) => {
            console.log("  ontrack event from:", socketListId);

            setVideos((prevVideos) => {
              // Check CURRENT state, not ref
              const existingVideoIndex = prevVideos.findIndex(
                (v) => v.socketId === socketListId
              );

              if (existingVideoIndex !== -1) {
                // Update existing
                console.log("  Updating video for:", socketListId);
                const updatedVideos = [...prevVideos];
                updatedVideos[existingVideoIndex] = {
                  ...updatedVideos[existingVideoIndex],
                  stream: event.streams[0],
                };
                videoRef.current = updatedVideos;
                return updatedVideos;
              } else {
                // Add new (only if doesn't exist)
                console.log("  Adding video for:", socketListId);
                const newVideo = {
                  socketId: socketListId,
                  stream: event.streams[0],
                  autoPlay: true,
                  playsinline: true,
                };
                const updatedVideos = [...prevVideos, newVideo];
                videoRef.current = updatedVideos;
                return updatedVideos;
              }
            });
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
          console.log("  I am the joining user, creating offers");
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
                    console.error(" Error setting local description:", error);
                  });
              });
            } catch (error) {
              console.error(" Error creating offer:", error);
            }
          }
        }
      });
    });

    socketRef.current.on("disconnect", () => {
      console.log("  Socket disconnected");
    });
  };
  // Start screen sharing
  const getDislayMedia = () => {
    if (screen) {
      console.log(" Starting screen share");

      if (navigator.mediaDevices.getDisplayMedia) {
        navigator.mediaDevices
          .getDisplayMedia({ video: true, audio: true })
          .then(getDislayMediaSuccess)
          .then((stream) => {})
          .catch((error) => {
            console.error(" Screen share error:", error);
            setScreen(false);
          });
      } else {
        console.error(" getDisplayMedia not supported");
        setScreen(false);
      }
    }
  };

  // Handle successful screen capture
  const getDislayMediaSuccess = (stream) => {
    console.log(" Screen share stream obtained");

    try {
      // Replace the video track with screen share track
      if (window.localStream) {
        window.localStream.getVideoTracks().forEach((track) => {
          window.localStream.removeTrack(track);
          track.stop();
        });
      }
    } catch (error) {
      console.error(" Error stopping video tracks:", error);
    }

    // Add screen share tracks to local stream
    stream.getTracks().forEach((track) => {
      window.localStream.addTrack(track);
    });

    // Update local video element
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = window.localStream;
    }

    // Send screen share to all peers
    for (let id in connections) {
      if (id === socketIdRef.current) continue;

      try {
        // Remove old video track sender
        connections[id].getSenders().forEach((sender) => {
          if (sender.track && sender.track.kind === "video") {
            connections[id].removeTrack(sender);
          }
        });

        // Add screen share track
        stream.getTracks().forEach((track) => {
          connections[id].addTrack(track, window.localStream);
        });

        // Create new offer with screen share
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
            .catch((e) =>
              console.error(" Error setting local description:", e)
            );
        });
      } catch (error) {
        console.error(" Error updating peer with screen share:", error);
      }
    }

    // Listen for when user stops sharing from browser UI
    stream.getVideoTracks()[0].addEventListener("ended", () => {
      console.log(" User stopped screen sharing via browser UI");
      stopScreenShare();
    });
  };

  // Stop screen sharing and return to camera
  const stopScreenShare = async () => {
    console.log(" Stopping screen share");

    try {
      // Stop all screen share tracks
      if (window.localStream) {
        window.localStream.getTracks().forEach((track) => {
          if (track.kind === "video") {
            track.stop();
            window.localStream.removeTrack(track);
          }
        });
      }

      // Get camera back
      const cameraStream = await navigator.mediaDevices.getUserMedia({
        video: videoAvailable,
        audio: false, // Don't restart audio, it's still running
      });

      // Add camera track back
      cameraStream.getVideoTracks().forEach((track) => {
        window.localStream.addTrack(track);
      });

      // Update local video
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = window.localStream;
      }

      // Update all peer connections
      for (let id in connections) {
        if (id === socketIdRef.current) continue;

        try {
          // Remove old video sender
          connections[id].getSenders().forEach((sender) => {
            if (sender.track && sender.track.kind === "video") {
              connections[id].removeTrack(sender);
            }
          });

          // Add camera track
          cameraStream.getVideoTracks().forEach((track) => {
            connections[id].addTrack(track, window.localStream);
          });

          // Create offer
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
              .catch((e) => console.error(" Error setting description:", e));
          });
        } catch (error) {
          console.error(" Error switching back to camera:", error);
        }
      }

      setScreen(false);
    } catch (error) {
      console.error(" Error getting camera back:", error);
      setScreen(false);
    }
  };

  // Handle screen sharing toggle
  useEffect(() => {
    if (screen) {
      getDislayMedia();
    }
  }, [screen]);

  const getMedia = () => {
    console.log("getMedia called - using lobby settings:", {
      lobbyVideo,
      lobbyAudio,
    });

    // Use lobby settings instead of availability
    setVideo(lobbyVideo && videoAvailable);
    setAudio(lobbyAudio && audioAvailable);
    setIsConnecting(true);
    connectToSocketServer();
  };

  const connect = () => {
    if (!username.trim()) {
      alert("Please enter a username");
      return;
    }

    console.log("Connecting as:", username);
    console.log("Lobby settings - Video:", lobbyVideo, "Audio:", lobbyAudio);

    setAskForUsername(false);

    // Set initial video/audio state based on lobby choices
    setVideo(lobbyVideo && videoAvailable);
    setAudio(lobbyAudio && audioAvailable);

    getMedia();
  };

  const handleSendMessage = () => {
    if (message.trim()) {
      console.log(`  Sending message: "${message}"`);

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
    console.log("  Ending call");
    try {
      if (localVideoRef.current && localVideoRef.current.srcObject) {
        let tracks = localVideoRef.current.srcObject.getTracks();
        tracks.forEach((track) => track.stop());
      }
    } catch (e) {
      console.error(" Error ending call:", e);
    }
    socketRef.current?.disconnect();
    window.location.href = "/";
  };

  // LOBBY SCREEN
  if (askForUsername) {
    return (
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          minHeight: "100vh",
          background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
          padding: { xs: 2, sm: 3, md: 4 },
        }}
      >
        <Paper
          elevation={3}
          sx={{
            padding: { xs: 2, sm: 3, md: 4 },
            borderRadius: { xs: "12px", sm: "16px" },
            boxShadow: "0 8px 32px rgba(0, 0, 0, 0.1)",
            maxWidth: { xs: "100%", sm: "500px", md: "560px" },
            width: "100%",
          }}
        >
          {/* Header */}
          <Box sx={{ textAlign: "center", mb: { xs: 2, sm: 3 } }}>
            <VideocamIcon
              sx={{
                fontSize: { xs: 48, sm: 60 },
                color: "#667eea",
                mb: { xs: 1, sm: 2 },
              }}
            />
            <h1
              style={{
                margin: "0 0 8px 0",
                color: "#333",
                fontSize: isMobile ? "24px" : "28px",
              }}
            >
              CallBuddy
            </h1>
            <p
              style={{
                margin: 0,
                color: "#666",
                fontSize: isMobile ? "13px" : "14px",
              }}
            >
              Connect with anyone, anytime
            </p>
          </Box>

          {/* Video Preview with Controls */}
          <Box
            sx={{
              mb: { xs: 2, sm: 3 },
              borderRadius: { xs: "8px", sm: "12px" },
              overflow: "hidden",
              position: "relative",
              backgroundColor: "#000",
              boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
            }}
          >
            {/* Video Element */}
            <video
              ref={localVideoRef}
              autoPlay
              muted
              playsInline
              style={{
                width: "100%",
                height: "auto",
                display: lobbyVideo ? "block" : "none",
                backgroundColor: "#000",
                minHeight: isMobile ? "200px" : "280px",
                maxHeight: isMobile ? "300px" : "400px",
                objectFit: "cover",
              }}
            />

            {/* Video Off Overlay */}
            {!lobbyVideo && (
              <Box
                sx={{
                  width: "100%",
                  height: isMobile ? "200px" : "280px",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: "#1a1a1a",
                  gap: { xs: 1, sm: 2 },
                }}
              >
                <VideocamOffIcon
                  sx={{ fontSize: { xs: 48, sm: 64 }, color: "#666" }}
                />
                <p
                  style={{
                    margin: 0,
                    color: "#888",
                    fontSize: isMobile ? "13px" : "14px",
                  }}
                >
                  Camera is off
                </p>
              </Box>
            )}

            {/* Preview Controls Overlay */}
            <Box
              sx={{
                position: "absolute",
                bottom: { xs: 12, sm: 16 },
                left: "50%",
                transform: "translateX(-50%)",
                display: "flex",
                gap: { xs: 1, sm: 1.5 },
                backgroundColor: "rgba(0, 0, 0, 0.75)",
                backdropFilter: "blur(10px)",
                borderRadius: { xs: "20px", sm: "28px" },
                padding: { xs: "8px 12px", sm: "10px 16px" },
                boxShadow: "0 4px 12px rgba(0, 0, 0, 0.3)",
              }}
            >
              {/* Video Toggle */}
              <Tooltip
                title={lobbyVideo ? "Turn off camera" : "Turn on camera"}
              >
                <IconButton
                  onClick={toggleLobbyVideo}
                  disabled={!videoAvailable}
                  size={isMobile ? "small" : "medium"}
                  sx={{
                    color: lobbyVideo ? "#fff" : "#ff3b30",
                    backgroundColor: lobbyVideo
                      ? "rgba(255, 255, 255, 0.15)"
                      : "rgba(255, 59, 48, 0.25)",
                    "&:hover": {
                      backgroundColor: lobbyVideo
                        ? "rgba(255, 255, 255, 0.25)"
                        : "rgba(255, 59, 48, 0.35)",
                    },
                    "&:disabled": {
                      color: "#555",
                      backgroundColor: "rgba(85, 85, 85, 0.2)",
                    },
                  }}
                >
                  {lobbyVideo ? (
                    <VideocamIcon fontSize={isMobile ? "small" : "medium"} />
                  ) : (
                    <VideocamOffIcon fontSize={isMobile ? "small" : "medium"} />
                  )}
                </IconButton>
              </Tooltip>

              {/* Audio Toggle */}
              <Tooltip
                title={lobbyAudio ? "Mute microphone" : "Unmute microphone"}
              >
                <IconButton
                  onClick={toggleLobbyAudio}
                  disabled={!audioAvailable}
                  size={isMobile ? "small" : "medium"}
                  sx={{
                    color: lobbyAudio ? "#fff" : "#ff3b30",
                    backgroundColor: lobbyAudio
                      ? "rgba(255, 255, 255, 0.15)"
                      : "rgba(255, 59, 48, 0.25)",
                    "&:hover": {
                      backgroundColor: lobbyAudio
                        ? "rgba(255, 255, 255, 0.25)"
                        : "rgba(255, 59, 48, 0.35)",
                    },
                    "&:disabled": {
                      color: "#555",
                      backgroundColor: "rgba(85, 85, 85, 0.2)",
                    },
                  }}
                >
                  {lobbyAudio ? (
                    <MicIcon fontSize={isMobile ? "small" : "medium"} />
                  ) : (
                    <MicOffIcon fontSize={isMobile ? "small" : "medium"} />
                  )}
                </IconButton>
              </Tooltip>

              {/* Settings Toggle */}
              {(videoDevices.length > 1 || audioDevices.length > 1) && (
                <Tooltip title="Device settings">
                  <IconButton
                    onClick={() => setShowDeviceSettings(!showDeviceSettings)}
                    size={isMobile ? "small" : "medium"}
                    sx={{
                      color: "#fff",
                      backgroundColor: showDeviceSettings
                        ? "rgba(102, 126, 234, 0.3)"
                        : "rgba(255, 255, 255, 0.15)",
                      "&:hover": {
                        backgroundColor: "rgba(102, 126, 234, 0.4)",
                      },
                    }}
                  >
                    <MoreVertIcon fontSize={isMobile ? "small" : "medium"} />
                  </IconButton>
                </Tooltip>
              )}
            </Box>

            {/* Audio Status Indicator */}
            {!lobbyAudio && (
              <Chip
                icon={<MicOffIcon sx={{ fontSize: isMobile ? 14 : 16 }} />}
                label="Mic off"
                size="small"
                sx={{
                  position: "absolute",
                  top: { xs: 8, sm: 12 },
                  left: { xs: 8, sm: 12 },
                  backgroundColor: "rgba(255, 59, 48, 0.9)",
                  color: "#fff",
                  fontSize: isMobile ? "11px" : "12px",
                  height: isMobile ? "24px" : "28px",
                }}
              />
            )}
          </Box>

          {/* Device Settings (Collapsible) */}
          {showDeviceSettings && (
            <Box
              sx={{ mb: { xs: 2, sm: 3 }, animation: "fadeIn 0.3s ease-in" }}
            >
              {videoDevices.length > 1 && (
                <Box sx={{ mb: 2 }}>
                  <TextField
                    select
                    fullWidth
                    label="Camera"
                    value={selectedVideoDevice}
                    onChange={(e) => changeVideoDevice(e.target.value)}
                    variant="outlined"
                    size="small"
                    SelectProps={{ native: true }}
                    sx={{
                      "& .MuiOutlinedInput-root": {
                        fontSize: isMobile ? "13px" : "14px",
                      },
                    }}
                  >
                    {videoDevices.map((device, idx) => (
                      <option key={device.deviceId} value={device.deviceId}>
                        {device.label || `Camera ${idx + 1}`}
                      </option>
                    ))}
                  </TextField>
                </Box>
              )}

              {audioDevices.length > 1 && (
                <Box>
                  <TextField
                    select
                    fullWidth
                    label="Microphone"
                    value={selectedAudioDevice}
                    onChange={(e) => changeAudioDevice(e.target.value)}
                    variant="outlined"
                    size="small"
                    SelectProps={{ native: true }}
                    sx={{
                      "& .MuiOutlinedInput-root": {
                        fontSize: isMobile ? "13px" : "14px",
                      },
                    }}
                  >
                    {audioDevices.map((device, idx) => (
                      <option key={device.deviceId} value={device.deviceId}>
                        {device.label || `Microphone ${idx + 1}`}
                      </option>
                    ))}
                  </TextField>
                </Box>
              )}
            </Box>
          )}

          {/* Permission Warnings */}
          {(!videoAvailable || !audioAvailable) && (
            <Box
              sx={{
                mb: 2,
                p: { xs: 1, sm: 1.5 },
                backgroundColor: "rgba(255, 152, 0, 0.1)",
                borderRadius: "8px",
                border: "1px solid rgba(255, 152, 0, 0.3)",
              }}
            >
              <p
                style={{
                  margin: 0,
                  fontSize: isMobile ? "12px" : "13px",
                  color: "#ff9800",
                }}
              >
                ⚠️{" "}
                {!videoAvailable && !audioAvailable
                  ? "Camera and microphone access denied"
                  : !videoAvailable
                  ? "Camera access denied"
                  : "Microphone access denied"}
              </p>
            </Box>
          )}

          {/* Name Input */}
          <TextField
            fullWidth
            label="Enter your name"
            placeholder="Your name"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            variant="outlined"
            size={isMobile ? "small" : "medium"}
            sx={{ mb: 2 }}
            autoFocus
            onKeyPress={(e) => e.key === "Enter" && connect()}
          />

          {/* Join Button */}
          <Button
            fullWidth
            variant="contained"
            size={isMobile ? "medium" : "large"}
            onClick={connect}
            startIcon={<PhoneIcon />}
            disabled={!username.trim()}
            sx={{
              background: username.trim()
                ? "linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
                : "#ccc",
              py: { xs: 1.2, sm: 1.5 },
              fontSize: { xs: "14px", sm: "16px" },
              fontWeight: "bold",
              textTransform: "none",
              borderRadius: "8px",
              "&:hover": {
                background: username.trim()
                  ? "linear-gradient(135deg, #5568d3 0%, #6941a5 100%)"
                  : "#ccc",
              },
              "&:disabled": {
                background: "#ccc",
                color: "#666",
              },
            }}
          >
            Join Call
          </Button>

          {/* Device Status Info */}
          <Box
            sx={{
              mt: 2,
              pt: 2,
              borderTop: "1px solid #eee",
              display: "flex",
              justifyContent: "center",
              gap: { xs: 1, sm: 2 },
              flexWrap: "wrap",
            }}
          >
            <Chip
              icon={lobbyVideo ? <VideocamIcon /> : <VideocamOffIcon />}
              label={lobbyVideo ? "Camera On" : "Camera Off"}
              size="small"
              color={lobbyVideo ? "success" : "default"}
              variant="outlined"
              sx={{ fontSize: { xs: "11px", sm: "12px" } }}
            />
            <Chip
              icon={lobbyAudio ? <MicIcon /> : <MicOffIcon />}
              label={lobbyAudio ? "Mic On" : "Mic Off"}
              size="small"
              color={lobbyAudio ? "success" : "default"}
              variant="outlined"
              sx={{ fontSize: { xs: "11px", sm: "12px" } }}
            />
          </Box>
        </Paper>
      </Box>
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
                sx={{
                  color: "#fff",
                  "&:hover": { backgroundColor: "rgba(69, 69, 69, 0.9)" },
                }}
              >
                <Badge badgeContent={newMessages} color="error">
                  <ChatIcon />
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
          position: "relative", // Add this
        }}
      >
        {/* Videos Section */}
        <Box
          sx={{
            flex: showChat && !isMobile ? "1 1 0" : "1 1 auto", // Changed
            display: "flex",
            flexDirection: "column",
            gap: 2,
            minWidth: 0,
            minHeight: 0,
            position: "relative",
            maxWidth: showChat && !isMobile ? "calc(100% - 370px)" : "100%", // Add this
            overflow: "hidden", // Add this
          }}
        >
          {videos.length === 0 ? (
            // No peers: Show only your video centered
            <Box
              sx={{
                flex: 1,
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                width: "100%",
                height: "100%",
                overflow: "hidden", // Add this
              }}
            >
              <VideoContainer
                elevation={2}
                fullscreen={true}
                sx={{
                  width: "100%",
                  height: "100%",
                  maxWidth: "none",
                  maxHeight: "none",
                }}
              >
                {/* Screen Share Indicator */}
                {screen && (
                  <Chip
                    icon={<ScreenShareIcon sx={{ fontSize: 14 }} />}
                    label="Screen Sharing"
                    size="small"
                    sx={{
                      position: "absolute",
                      top: 8,
                      right: 8,
                      backgroundColor: "rgba(76, 175, 80, 0.9)",
                      color: "#fff",
                      fontSize: "11px",
                    }}
                  />
                )}

                <video ref={localVideoRef} autoPlay muted playsInline />
                <PeerName label={`${username} (You)`} variant="outlined" />
              </VideoContainer>
            </Box>
          ) : videos.length === 1 ? (
            // 1 peer: Picture-in-Picture layout
            <>
              {/* Main Video - Peer */}
              <Box
                sx={{
                  flex: 1,
                  position: "relative",
                  minHeight: 0, // Add this
                  overflow: "hidden", // Add this
                }}
              >
                <PeerVideo video={videos[0]} />
              </Box>

              {/* Your Video - Floating overlay in corner */}
              <Box
                sx={{
                  position: "absolute",
                  bottom: { xs: 12, sm: 16 },
                  right: { xs: 12, sm: 16 },
                  width: { xs: "100px", sm: "140px", md: "180px", lg: "240px" },
                  height: { xs: "75px", sm: "105px", md: "135px", lg: "180px" },
                  zIndex: 10,
                  boxShadow: "0 4px 12px rgba(0, 0, 0, 0.4)",
                  borderRadius: { xs: "8px", sm: "10px", md: "12px" },
                  overflow: "hidden",
                  transition: "all 0.3s ease",
                  cursor: "move",
                  "&:hover": {
                    transform: "scale(1.05)",
                    boxShadow: "0 6px 16px rgba(0, 0, 0, 0.6)",
                  },
                }}
              >
                <VideoContainer
                  elevation={3}
                  sx={{ height: "100%", width: "100%" }}
                >
                  {/* Screen Share Indicator */}
                  {screen && (
                    <Chip
                      icon={<ScreenShareIcon sx={{ fontSize: 14 }} />}
                      label="Screen Sharing"
                      size="small"
                      sx={{
                        position: "absolute",
                        top: 8,
                        right: 8,
                        backgroundColor: "rgba(76, 175, 80, 0.9)",
                        color: "#fff",
                        fontSize: "11px",
                      }}
                    />
                  )}

                  <video
                    ref={localVideoRef}
                    autoPlay
                    muted
                    playsInline
                    style={{ height: "100%", width: "100%" }}
                  />
                  <PeerName label="You" variant="outlined" size="small" />
                </VideoContainer>
              </Box>
            </>
          ) : (
            // Multiple peers: Grid layout
            <Grid
              container
              spacing={1}
              sx={{
                flex: 1,
                overflow: "auto",
                alignContent: "flex-start",
                minHeight: 0, // Add this
              }}
            >
              {/* Your video in grid */}
              <Grid
                item
                xs={12}
                sm={videos.length === 2 ? 6 : 6}
                md={videos.length === 2 ? 6 : videos.length === 3 ? 6 : 4}
                lg={videos.length <= 4 ? 6 : 4}
              >
                <VideoContainer elevation={2}>
                  {/* Screen Share Indicator */}
                  {screen && (
                    <Chip
                      icon={<ScreenShareIcon sx={{ fontSize: 14 }} />}
                      label="Screen Sharing"
                      size="small"
                      sx={{
                        position: "absolute",
                        top: 8,
                        right: 8,
                        backgroundColor: "rgba(76, 175, 80, 0.9)",
                        color: "#fff",
                        fontSize: "11px",
                      }}
                    />
                  )}

                  <video ref={localVideoRef} autoPlay muted playsInline />
                  <PeerName label={`${username} (You)`} variant="outlined" />
                </VideoContainer>
              </Grid>

              {/* Peer videos in grid */}
              {videos.map((video) => (
                <Grid
                  item
                  xs={12}
                  sm={videos.length === 1 ? 6 : 6}
                  md={videos.length === 1 ? 6 : videos.length === 2 ? 6 : 4}
                  lg={videos.length <= 3 ? 6 : 4}
                  key={video.socketId}
                >
                  <PeerVideo video={video} />
                </Grid>
              ))}
            </Grid>
          )}
        </Box>

        {/* Chat Section - Desktop */}
        {showChat && !isMobile && (
          <Paper
            sx={{
              width: "350px", // Fixed width
              minWidth: "350px", // Prevent shrinking
              maxWidth: "350px", // Prevent growing
              display: "flex",
              flexDirection: "column",
              backgroundColor: "rgba(0, 0, 0, 0.4)",
              backdropFilter: "blur(10px)",
              borderRadius: "12px",
              overflow: "hidden",
              border: "1px solid rgba(255, 255, 255, 0.1)",
              flexShrink: 0, // Keep this
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
                <h3 style={{ margin: 0, fontSize: "14px", fontWeight: 600 }}>
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
                "&::-webkit-scrollbar": {
                  width: "6px",
                },
                "&::-webkit-scrollbar-track": {
                  background: "transparent",
                },
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
                messages.map((msg, idx) => (
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
                ))
              )}
              <div ref={messagesEndRef} />

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
                    "& fieldset": {
                      borderColor: "rgba(255, 255, 255, 0.2)",
                    },
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
        {/* Screen Share Button */}
        {screenAvailable && !isMobile && (
          <Tooltip title={screen ? "Stop Sharing" : "Share Screen"}>
            <IconButton
              onClick={() => {
                if (screen) {
                  stopScreenShare();
                } else {
                  setScreen(true);
                }
              }}
              sx={{
                backgroundColor: screen
                  ? "rgba(76, 175, 80, 0.2)"
                  : "rgba(102, 126, 234, 0.2)",
                color: screen ? "#4caf50" : "#667eea",
                "&:hover": {
                  backgroundColor: screen
                    ? "rgba(76, 175, 80, 0.3)"
                    : "rgba(102, 126, 234, 0.3)",
                },
              }}
            >
              {screen ? <StopScreenShareIcon /> : <ScreenShareIcon />}
            </IconButton>
          </Tooltip>
        )}

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
