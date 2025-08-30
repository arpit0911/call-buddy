import express from "express";

import { createServer } from "node:http";
import { Server } from "socket.io";
import mongoose from "mongoose";
import cors from "cors";
import { connectToSocket } from "./controllers/socketManager.js";

const app = express();
const server = createServer(app);
const io = connectToSocket(server);

app.set("port", process.env.PORT || 3000);
app.use(cors());
app.use(express.json({ limit: "40kb" }));
app.use(express.urlencoded({ limit: "40kb", extended: true }));
// app.get("/home", (req, res) => {
//   res.send("Hollo World");
// });

const start = async () => {
  const connectionDB = await mongoose.connect(
    "mongodb+srv://admin:admin@cluster0.bfezvxb.mongodb.net/"
  );
  console.log(`MONGO Connected Host: ${connectionDB.connection.host}`);
  server.listen(app.get("port"), () => {
    console.log("servicer is running on port 3000");
  });
};

start();
