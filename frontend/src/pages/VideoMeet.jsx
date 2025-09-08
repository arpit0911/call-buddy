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
  const [screenAvailable, setScreenAvailable] = useState(); //to check if permission for screen sharing

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
      // get permission for video
      const videoPermission = await navigator.mediaDevices.getUserMedia({
        video: true,
      });
      videoPermission ? setVideoAvailable(true) : setVideoAvailable(false);

      // get permission for audio
      const audioPermission = await navigator.mediaDevices.getUserMedia({
        audio: true,
      });
      audioPermission ? setAudioAvailable(true) : setAudioAvailable(false);

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
    getPermissions();
  }, []);

  const getMediaUserSuccess = (stream) => {};

  const getUserMedia = () => {
    if ((audio && audioAvailable) || (video && videoAvailable)) {
      navigator.mediaDevices
        .getUserMedia({ video: video, audio: audio })
        .then(getMediaUserSuccess) //TODO getUserMediaSuccess
        .then((stream) => {})
        .catch((error) => {
          console.log(error);
        });
    } else {
      try {
        let tracks = localVideoRef.current.srcObject.getTracks();
        tracks.forEach((track) => track.stop());
      } catch (error) {
        console.log(error);
      }
    }
  };

  useEffect(() => {
    if (audio !== undefined && video !== undefined) {
      getUserMedia();
    }
  }, [audio, video]);

  const connectToSocketServer = () => {
    socketRef.current = io.connect(server_url, { secure: false });
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
          {username}
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
        <div>other component</div>
      )}
    </div>
  );
}
