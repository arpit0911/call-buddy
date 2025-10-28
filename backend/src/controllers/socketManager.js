import { Server } from "socket.io";

let connections = {};
let messages = {};
let timeOnline = {};
let usernames = {};

export const connectToSocket = (server) => {
  const io = new Server(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
      allowedHeaders: ["*"],
      credentials: true,
    },
  });

  io.on("connection", (socket) => {
    console.log("🟢 User connected:", socket.id);

    socket.on("join-call", (path, username = "Anonymous") => {
      console.log(
        `📍 User ${socket.id} joining call on path: ${path}, username: ${username}`
      );

      usernames[socket.id] = username;

      if (connections[path] === undefined) {
        connections[path] = [];
      }
      connections[path].push(socket.id);
      timeOnline[socket.id] = new Date();

      // FIX: Only emit to other users, not the joining user
      console.log(`👥 Total users in room ${path}:`, connections[path].length);

      for (let i = 0; i < connections[path].length; i++) {
        // Emit "user-joined" to notify about the new user
        // Pass the full client list to everyone
        io.to(connections[path][i]).emit(
          "user-joined",
          socket.id,
          connections[path]
        );
      }

      // Send previous messages to the newly joined user
      if (messages[path] !== undefined) {
        console.log(
          `💬 Sending ${messages[path].length} previous messages to ${socket.id}`
        );
        for (let i = 0; i < messages[path].length; i++) {
          io.to(socket.id).emit(
            "chat-message",
            messages[path][i]["data"],
            messages[path][i]["sender"],
            messages[path][i]["socket-id-sender"],
            messages[path][i]["timestamp"]
          );
        }
      }
    });

    socket.on("signal", (toId, message) => {
      console.log(`🔄 Signal from ${socket.id} to ${toId}`);
      io.to(toId).emit("signal", socket.id, message);
    });

    socket.on("chat-message", (data, sender) => {
      console.log(
        `💬 Chat message from ${socket.id}: "${data}" (sender: ${sender})`
      );

      const [matchingRoom, found] = Object.entries(connections).reduce(
        ([room, isFound], [roomKey, roomValue]) => {
          if (!isFound && roomValue.includes(socket.id)) {
            return [roomKey, true];
          }
          return [room, isFound];
        },
        ["", false]
      );

      if (found === true) {
        console.log(`✅ Found matching room: ${matchingRoom}`);

        if (messages[matchingRoom] === undefined) {
          messages[matchingRoom] = [];
        }

        const messageObj = {
          sender: sender,
          data: data,
          "socket-id-sender": socket.id,
          timestamp: new Date().toISOString(),
        };

        messages[matchingRoom].push(messageObj);
        console.log(
          `📝 Message stored. Total messages in room: ${messages[matchingRoom].length}`
        );

        // FIX: Emit ONLY to other users, not back to sender
        connections[matchingRoom].forEach((element) => {
          if (element !== socket.id) {
            console.log(`📤 Emitting message to ${element}`);
            io.to(element).emit(
              "chat-message",
              data,
              sender,
              socket.id,
              messageObj.timestamp
            );
          }
        });
      } else {
        console.warn(`⚠️ No matching room found for socket ${socket.id}`);
      }
    });

    socket.on("disconnect", () => {
      console.log(`🔴 User disconnected: ${socket.id}`);

      var diffTime = Math.abs(new Date() - timeOnline[socket.id]);
      console.log(`⏱️ User was online for: ${diffTime}ms`);

      var key;

      for (const [k, v] of JSON.parse(
        JSON.stringify(Object.entries(connections))
      )) {
        for (let i = 0; i < v.length; ++i) {
          if (v[i] === socket.id) {
            key = k;
            console.log(`🗑️ Cleaning up room: ${key}`);

            for (let j = 0; j < connections[key].length; ++j) {
              io.to(connections[key][j]).emit("user-left", socket.id);
            }

            var index = connections[key].indexOf(socket.id);
            connections[key].splice(index, 1);

            if (connections[key].length === 0) {
              delete connections[key];
              delete messages[key];
              console.log(`🧹 Deleted empty room: ${key}`);
            }

            break;
          }
        }
      }

      delete timeOnline[socket.id];
      delete usernames[socket.id];
    });

    socket.on("typing", (path, isTyping, username) => {
      if (connections[path]) {
        connections[path].forEach((socketId) => {
          if (socketId !== socket.id) {
            io.to(socketId).emit("user-typing", socket.id, isTyping, username);
          }
        });
      }
    });
  });

  return io;
};

export default connectToSocket;
