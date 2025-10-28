import { Button, TextField } from "@mui/material";
import React, { useEffect, useRef, useState } from "react";
import io from "socket.io-client";

const server_url = "http://localhost:3000";
var connections = {};

const peerConfigConnections = {
  iceServers: [{ urls: "stun:stun.l.google.com:19302" }], // FIXED: iceServer → iceServers
};

export default function VideoMeet() {
  const socketRef = useRef();
  const socketIdRef = useRef();
  const localVideoRef = useRef();
  const videoRef = useRef([]);
  const iceCandidatesQueue = useRef({}); // NEW: For ICE candidate queuing

  const [videoAvailable, setVideoAvailable] = useState(false);
  const [audioAvailable, setAudioAvailable] = useState(false);
  const [screenAvailable, setScreenAvailable] = useState(false);

  const [video, setVideo] = useState(false);
  const [audio, setAudio] = useState(false);
  const [screen, setScreen] = useState(false);

  const [showModal, setShowModal] = useState(false);
  const [messages, setMessages] = useState([]);
  const [message, setMessage] = useState("");
  const [newMessages, setNewMessages] = useState(0);

  const [askForUsername, setAskForUsername] = useState(true);
  const [username, setUsername] = useState("");
  const [videos, setVideos] = useState([]);

  const [isConnecting, setIsConnecting] = useState(false); // NEW: Track connection state

  // Get permissions - run once on mount
  const getPermissions = async () => {
    try {
      // Test video permission
      const videoPermission = await navigator.mediaDevices.getUserMedia({
        video: true,
      });
      if (videoPermission) {
        setVideoAvailable(true);
        console.log("Video permission granted");
        videoPermission.getTracks().forEach((track) => track.stop()); // Stop test stream
      }
    } catch (error) {
      console.log("Video permission denied:", error);
      setVideoAvailable(false);
    }

    try {
      // Test audio permission
      const audioPermission = await navigator.mediaDevices.getUserMedia({
        audio: true,
      });
      if (audioPermission) {
        setAudioAvailable(true);
        console.log("Audio permission granted");
        audioPermission.getTracks().forEach((track) => track.stop()); // Stop test stream
      }
    } catch (error) {
      console.log("Audio permission denied:", error);
      setAudioAvailable(false);
    }

    // Check screen share availability
    if (navigator.mediaDevices.getDisplayMedia) {
      setScreenAvailable(true);
    } else {
      setScreenAvailable(false);
    }

    // Get preview stream for lobby
    try {
      const userMediaStream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
      if (userMediaStream) {
        console.log("Lobby preview stream obtained");
        window.localStream = userMediaStream;
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = userMediaStream;
        }
      }
    } catch (error) {
      console.log("Error getting lobby preview:", error);
    }
  };

  useEffect(() => {
    console.log("Initializing permissions");
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
    console.log("getMediaUserSuccess - received new stream");

    // Safely stop old tracks
    try {
      if (
        window.localStream &&
        typeof window.localStream.getTracks === "function"
      ) {
        console.log("Stopping old stream tracks");
        window.localStream.getTracks().forEach((track) => {
          console.log("Stopping track:", track.kind, track.id);
          track.stop();
        });
      }
    } catch (error) {
      console.error("Error stopping old tracks:", error);
    }

    // Set new stream
    window.localStream = stream;

    // Update local video element
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = stream;
      console.log("Local video ref updated with new stream");
    }

    // Update all peer connections with new stream
    for (let id in connections) {
      if (id === socketIdRef.current) continue;

      try {
        // Remove old tracks
        if (connections[id].getSenders) {
          connections[id].getSenders().forEach((sender) => {
            connections[id].removeTrack(sender);
          });
        }

        // Add new tracks
        stream.getTracks().forEach((track) => {
          connections[id].addTrack(track, stream);
        });

        // Create new offer
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
              console.error("Error setting local description:", error);
            });
        });
      } catch (error) {
        console.error("Error updating peer connection:", error);
      }
    }

    // Handle track end
    stream.getTracks().forEach((track) => {
      track.onended = () => {
        console.log("Track ended:", track.kind);
        setVideo(false);
        setAudio(false);

        try {
          if (localVideoRef.current && localVideoRef.current.srcObject) {
            let tracks = localVideoRef.current.srcObject.getTracks();
            tracks.forEach((track) => track.stop());
          }
        } catch (error) {
          console.error("Error stopping tracks on end:", error);
        }

        // Create black silence stream
        let blackSilence = (...args) =>
          new MediaStream([black(...args), silence()]);
        window.localStream = blackSilence();
        localVideoRef.current.srcObject = window.localStream;

        // Update peers with black silence
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
            console.error("Error updating peer with black silence:", error);
          }
        }
      };
    });
  };

  const getUserMedia = () => {
    console.log("getUserMedia called - video:", video, "audio:", audio);
    console.log("Available - video:", videoAvailable, "audio:", audioAvailable);

    if ((audio && audioAvailable) || (video && videoAvailable)) {
      navigator.mediaDevices
        .getUserMedia({
          video: video && videoAvailable,
          audio: audio && audioAvailable,
        })
        .then(getMediaUserSuccess)
        .catch((error) => {
          console.error("getUserMedia error:", error);
        });
    } else {
      console.log("Both audio and video are off, creating black silence");
      try {
        if (localVideoRef.current && localVideoRef.current.srcObject) {
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

  // FIXED: Only call getUserMedia when connected
  useEffect(() => {
    if (isConnecting && video !== undefined && audio !== undefined) {
      console.log("Effect: Calling getUserMedia");
      getUserMedia();
    }
  }, [audio, video, isConnecting]);

  // FIXED: ICE candidate queuing
  const gotMessageFromServer = (fromId, message) => {
    let signal = JSON.parse(message);

    if (fromId !== socketIdRef.current) {
      // Handle SDP
      if (signal.sdp) {
        connections[fromId]
          .setRemoteDescription(new RTCSessionDescription(signal.sdp))
          .then(() => {
            console.log("Remote description set for:", fromId);

            // Process queued ICE candidates
            if (iceCandidatesQueue.current[fromId]) {
              console.log(
                `Processing ${iceCandidatesQueue.current[fromId].length} queued ICE candidates for:`,
                fromId
              );
              iceCandidatesQueue.current[fromId].forEach((candidate) => {
                connections[fromId]
                  .addIceCandidate(new RTCIceCandidate(candidate))
                  .catch((e) => console.error("Error adding queued ICE:", e));
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
                      console.error("Error setting local description:", error);
                    });
                })
                .catch((error) => {
                  console.error("Error creating answer:", error);
                });
            }
          })
          .catch((error) => {
            console.error("Error setting remote description:", error);
          });
      }

      // Handle ICE candidates with queuing
      if (signal.ice) {
        if (connections[fromId] && connections[fromId].remoteDescription) {
          connections[fromId]
            .addIceCandidate(new RTCIceCandidate(signal.ice))
            .then(() => {
              console.log("ICE candidate added for:", fromId);
            })
            .catch((e) => console.error("Error adding ICE candidate:", e));
        } else {
          console.log("Queueing ICE candidate for:", fromId);
          if (!iceCandidatesQueue.current[fromId]) {
            iceCandidatesQueue.current[fromId] = [];
          }
          iceCandidatesQueue.current[fromId].push(signal.ice);
        }
      }
    }
  };

  const addMessage = (data, sender, socketIdSender) => {
    console.log("Message received:", data, "from:", sender);
  };

  const connectToSocketServer = () => {
    socketRef.current = io.connect(server_url, { secure: false });

    socketRef.current.on("signal", gotMessageFromServer);

    socketRef.current.on("connect", () => {
      console.log("Socket connected:", socketRef.current.id);
      socketRef.current.emit("join-call", window.location.href);
      socketIdRef.current = socketRef.current.id;

      socketRef.current.on("chat-message", addMessage);

      socketRef.current.on("user-left", (id) => {
        console.log("User left:", id);
        setVideos((vids) => vids.filter((v) => v.socketId !== id));
        if (connections[id]) {
          connections[id].close();
          delete connections[id];
        }
        delete iceCandidatesQueue.current[id];
      });

      socketRef.current.on("user-joined", (id, clients) => {
        console.log("User joined:", id, "Clients:", clients);

        clients.forEach((socketListId) => {
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

          // FIXED: Use ontrack instead of onaddstream
          connections[socketListId].ontrack = (event) => {
            console.log("ontrack event from:", socketListId);

            let videoExists = videoRef.current.find(
              (video) => video.socketId === socketListId
            );

            if (videoExists) {
              console.log("Updating existing video stream");
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
              console.log("Adding new video stream");
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

          // Add local stream to peer connection
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

        if (id === socketIdRef.current) {
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
                    console.error("Error setting local description:", error);
                  });
              });
            } catch (error) {
              console.error("Error creating offer:", error);
            }
          }
        }
      });
    });
  };

  const getMedia = () => {
    console.log("getMedia called");
    setVideo(videoAvailable);
    setAudio(audioAvailable);
    setIsConnecting(true); // FIXED: Set connecting flag
    connectToSocketServer();
  };

  const connect = () => {
    if (!username.trim()) {
      alert("Please enter a username");
      return;
    }
    console.log("Connecting as:", username);
    setAskForUsername(false);
    getMedia();
  };

  return (
    <div>
      {askForUsername === true ? (
        <div>
          <h2>Entered into Lobby</h2>
          <TextField
            variant="outlined"
            label="Username"
            value={username}
            onChange={(e) => {
              setUsername(e.target.value);
            }}
          />
          <Button variant="contained" onClick={connect}>
            Connect
          </Button>
          <div>
            <video
              ref={localVideoRef}
              autoPlay
              muted
              style={{
                width: "640px",
                height: "480px",
                backgroundColor: "#000",
              }}
            />
          </div>
        </div>
      ) : (
        <div>
          <h3>Meeting - {username}</h3>
          <div>
            <h4>Your Video:</h4>
            <video
              ref={localVideoRef}
              autoPlay
              muted
              style={{
                width: "640px",
                height: "480px",
                backgroundColor: "#000",
              }}
            />
          </div>
          <div>
            <h4>Remote Videos:</h4>
            {videos.map((video) => (
              <div key={video.socketId}>
                <p>Peer: {video.socketId}</p>
                <video
                  data-socket={video.socketId}
                  ref={(ref) => {
                    if (ref && video.stream) {
                      ref.srcObject = video.stream;
                    }
                  }}
                  autoPlay
                  style={{
                    width: "640px",
                    height: "480px",
                    backgroundColor: "#000",
                  }}
                />
              </div>
            ))}
          </div>
          <div style={{ marginTop: "20px" }}>
            <Button
              variant="contained"
              onClick={() => setVideo(!video)}
              color={video ? "primary" : "secondary"}
            >
              {video ? "Disable Video" : "Enable Video"}
            </Button>
            <Button
              variant="contained"
              onClick={() => setAudio(!audio)}
              color={audio ? "primary" : "secondary"}
              style={{ marginLeft: "10px" }}
            >
              {audio ? "Mute Audio" : "Unmute Audio"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
