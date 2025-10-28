import { Button, TextField } from "@mui/material";
import React, { useEffect, useRef, useState } from "react";
import io from "socket.io-client";

const server_url = "http://localhost:3000";
var connections = {};

const peerConfigConnections = {
  iceServer: [{ urls: "stun:stun.l.google.com:19302" }],
};
export default function VideoMeet() {
  let socketRef = useRef(); // socket connection
  let socketId = useRef(); // my socket id

  let localVideoRef = useRef(); // my video
  const [videoAvailable, setVideoAvailable] = useState(true); // to check if permission for video access
  const [audioAvailable, setAudioAvailable] = useState(true); // to check if permission for audio access
  const [screenAvailable, setScreenAvailable] = useState(false); //to check if permission for screen sharing

  const [video, setVideo] = useState(true); // to toggle the video on off
  const [audio, setAudio] = useState(true); // to toggle the audio on off
  const [screen, setScreen] = useState(false); // to toggle the screen sharing on off

  const [showModal, setShowModal] = useState(false); // for the popups

  const [messages, setMessages] = useState([]); // for all the messages conversation
  const [message, setMessage] = useState(); // my message sent
  const [newMessages, setNewMessages] = useState(0); // new message notifications

  const [askForUsername, setAskForUsername] = useState(true); // when connect as Guest
  const [username, setUsername] = useState("");

  const videoRef = useRef();
  const [videos, setVideos] = useState([]); // multiple videos

  //TODO check if isChrome

  const getPermissions = async () => {
    try {
      const videoPermission = await navigator.mediaDevices.getUserMedia({
        video: true,
      });
      if (videoPermission) {
        setVideoAvailable(true);
        console.log("Video permission granted");
      } else {
        setVideoAvailable(false);
        console.log("Video permission denied");
      }

      const audioPermission = await navigator.mediaDevices.getUserMedia({
        audio: true,
      });
      if (audioPermission) {
        setAudioAvailable(true);
        console.log("Audio permission granted");
      } else {
        setAudioAvailable(false);
        console.log("Audio permission denied");
      }

      // get permission for screen sharing
      if (navigator.mediaDevices.getDisplayMedia) {
        setScreenAvailable(true);
      } else {
        setScreenAvailable(false);
      }

      if (videoAvailable || audioAvailable) {
        //    stream video and audio if permitted
        const userMediaStream = await navigator.mediaDevices.getUserMedia({
          video: videoAvailable,
          audio: audioAvailable,
        });
        if (userMediaStream) {
          console.log("userMediaStream", userMediaStream);
          window.localStream = userMediaStream;
          // check if UI rendered
          if (localVideoRef.current) {
            localVideoRef.current.srcObject = userMediaStream; //set local video
          }
        }
      }
    } catch (error) {
      console.log(error);
      throw error;
    }
  };

  useEffect(() => {
    console.log("Initializing permissions");
    getPermissions();

    return () => {
      // Cleanup
      if (window.localStream) {
        window.localStream.getTracks().forEach((track) => track.stop());
      }
    };
  }, []); // Empty dependency array - run once on mount

  const getMediaUserSuccess = (stream) => {
    console.log("stream", stream);

    try {
      // Check if window.localStream exists and has getTracks method
      if (window.localStream && window.localStream.getTracks) {
        window.localStream.getTracks().forEach((track) => track.stop());
      }
    } catch (error) {
      console.error(error);
    }

    window.localStream = stream;
    localVideoRef.current.srcObject = stream;

    for (let id in connections) {
      if (id === socketId.current) continue;

      connections[id].addStream(window.localStream);
      connections[id].createOffer().then((description) => {
        connections[id]
          .setLocalDescription(description)
          .then(() => {
            socketId.current.emit(
              "signal",
              id,
              JSON.stringify({ sdp: connections[id].localDescription })
            );
          })
          .catch((error) => {
            console.error(error);
          });
      });
    }

    stream.getTracks().forEach(
      (track) =>
        (track.onended = () => {
          setVideo(false);
          setAudio(false);
          try {
            let tracks = localVideoRef.current.srcObject.getTracks();
            tracks.forEach((track) => track.stop());
          } catch (error) {
            console.error(error);
          }
          //  blackSilence
          let blackSilence = (...args) =>
            new MediaStream([black(...args), silence()]);
          window.localStream = blackSilence();
          localVideoRef.current.srcObject = window.localStream;

          for (let id in connections) {
            connections[id].addStream(window.localStream);
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
          }
        })
    );
  };

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

  const getUserMedia = () => {
    if ((audio && audioAvailable) || (video && videoAvailable)) {
      navigator.mediaDevices
        .getUserMedia({ video: video, audio: audio })
        .then(getMediaUserSuccess) // getUserMediaSuccess
        .then((stream) => {})
        .catch((error) => {
          console.error(error);
        });
    } else {
      try {
        let tracks = localVideoRef.current.srcObject.getTracks();
        tracks.forEach((track) => track.stop());
      } catch (error) {
        console.error(error);
      }
    }
  };

  useEffect(() => {
    if (audio !== undefined && video !== undefined) {
      getUserMedia();
    }
  }, [audio, video]);

  //  get message from server
  const gotMessageFromServer = (fromId, message) => {
    let signal = JSON.parse(message);
    if (fromId !== socketId.current) {
      if (signal.sdp) {
        connections[fromId]
          .setRemoteDescription(new RTCSessionDescription(signal.sdp))
          .then(() => {
            if (signal.sdp.type === "offer") {
              connections[fromId]
                .createAnswer()
                .then((description) => {
                  connections[fromId]
                    .setLocalDescription(description)
                    .then(() => {
                      socketId.current.emit(
                        "signal",
                        fromId,
                        JSON.stringify({
                          sdp: connections[fromId].localDescription,
                        })
                      );
                    })
                    .catch((error) => {
                      console.log(error);
                    });
                })
                .catch((error) => {
                  console.log(error);
                });
            }
          })
          .catch((error) => {
            console.log(error);
          });
      }

      if (signal.ice) {
        connections[fromId]
          .addIceCandidate(new RTCIceCandidate(signal.ice))
          .catch((e) => console.error(e));
      }
    }
  };
  // TODO add new message
  const addMessage = () => {};

  const connectToSocketServer = () => {
    socketRef.current = io.connect(server_url, { secure: false });
    socketRef.current.on("signal", gotMessageFromServer);
    socketRef.current.on("connect", () => {
      socketRef.current.emit("join-call", window.location.href);
      socketId.current = socketRef.current.id;
      socketRef.current.on("chat-message", addMessage);
      socketRef.current.on("user-left", (id) => {
        // TODO
        setVideos((vids) => vids.filter((v) => v.id !== id));
      });
      socketRef.current.on("user-joined", (id, clients) => {
        clients.forEach((socketListId) => {
          connections[socketListId] = new RTCPeerConnection(
            peerConfigConnections
          );
          // * ice = Interactive Connectivity Establishment
          connections[socketListId].onicecandidate = (event) => {
            if (event.candidate != null) {
              socketRef.current.emit(
                "signal",
                socketListId,
                JSON.stringify({ ice: event.candidate })
              );
            }
          };
          connections[socketListId].onaddstream = (event_) => {
            let videoExists = videoRef.current.find(
              (video) => video.id === socketListId
            );
            if (videoExists) {
              setVideos((videos) => {
                const updatedVideos = videos.map((video) =>
                  video.socketId === socketListId
                    ? { ...video, stream: event_.stream }
                    : video
                );
                videoRef.current = updatedVideos;
                return updatedVideos;
              });
            } else {
              let newVideo = {
                socketId: socketListId,
                stream: event.stream,
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

          if (window.localStream !== undefined && window.localStream !== null) {
            connections[socketListId].addStream(window.localStream);
          } else {
            //    blackSilence
            let blackSilence = (...args) =>
              new MediaStream([black(...args), silence()]);
            window.localStream = blackSilence();
            connections[socketListId].addStream(window.localStream);
          }
        });
        if (id === socketId.current) {
          for (let id2 in connections) {
            if (id2 === socketId.current) continue;
            try {
              connections[id2].addStream(window.localStream);
            } catch (error) {
              console.log(error);
            }
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
                  console.log(error);
                });
            });
          }
        }
      });
    });
  };

  const getMedia = () => {
    setVideo(videoAvailable);
    setAudio(audioAvailable);
    connectToSocketServer();
  };

  const connect = () => {
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
          ></TextField>
          <Button variant="contained" onClick={connect}>
            Connect
          </Button>
          <div>
            <video ref={localVideoRef} autoPlay muted></video>
          </div>
        </div>
      ) : (
        <div>
          <video ref={localVideoRef} autoPlay muted></video>
          <div>
            {videos.map((video) => (
              <div key={video.socketId}>
                <video
                  data-socket={video.socketId}
                  ref={(ref) => {
                    if (ref && video.stream) {
                      ref.srcObject = video.stream;
                    }
                  }}
                  autoPlay
                ></video>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
