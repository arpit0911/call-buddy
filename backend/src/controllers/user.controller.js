import bcrypt, { hash } from "bcrypt";
import { User } from "../models/user.model.js";
import httpStatus from "http-status";
import crypto from "crypto";
import { Meeting } from "../models/meeting.model.js";

const login = async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res
      .status(httpStatus.BAD_REQUEST)
      .json({ message: "All fields are required" });
  }
  try {
    const user = await User.findOne({ username });
    if (!user) {
      return res
        .status(httpStatus.NOT_FOUND)
        .json({ message: "User not found" });
    }
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (isPasswordValid) {
      let token = crypto.randomBytes(20).toString("hex");
      user.token = token;
      await user.save();
      console.log("User logged in:", user);
      return res
        .status(httpStatus.OK)
        .json({ token: token, name: user.name, username: user.username });
    } else {
      return res
        .status(httpStatus.UNAUTHORIZED)
        .json({ message: "Invalid Username or Password" });
    }
  } catch (error) {
    res
      .status(httpStatus.INTERNAL_SERVER_ERROR)
      .json({ message: `Something went wrong ${error}` });
  }
};

const register = async (req, res) => {
  const { name, username, password } = req.body;

  try {
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res
        .status(httpStatus.FOUND)
        .json({ message: "User already registered" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = new User({
      name: name,
      username: username,
      password: hashedPassword,
    });

    await newUser.save();
    res
      .status(httpStatus.CREATED)
      .json({ message: "User registered successfully" });
  } catch (error) {
    res
      .status(httpStatus.INTERNAL_SERVER_ERROR)
      .json({ message: `Something went wrong ${error}` });
  }
};

const getUserHistory = async (req, res) => {
  const { token } = req.query;

  try {
    const user = await User.findOne({ token });
    const meetings = await Meeting.find({ user_id: user.username });

    res.json(meetings);
  } catch (error) {
    res.json({ message: `Something went wrong ${error}` });
  }
};

const addToHistory = async (req, res) => {
  const { token, meetingCode } = req.body;

  try {
    const user = await User.findOne({ token: token });

    const newMeeting = new Meeting({
      user_id: user.username,
      meetingCode: meetingCode,
    });

    await newMeeting.save();
    res.json({ message: "Meeting added to history" });
  } catch (error) {
    res.json({ message: `Something went wrong ${error}` });
  }
};

export { register, login, getUserHistory, addToHistory };
