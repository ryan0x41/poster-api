const dotenv = require('dotenv');
dotenv.config({ path: '.config' });
const engine = require('ejs-mate');
const path = require('path');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const socketIo = require('socket.io');
const express = require('express');
const session = require('express-session');
const http = require('http');
const processInfo = require('process');
const os = require('os');

const { verifyToken } = require('./middleware/authenticateAuthHeader');
const { initSocket } = require('./socket');

const app = express();
const server = http.createServer(app);

// init socket.io module
initSocket(server);

server.listen(3000, () => {
  console.log('server listening on port 3000');
});

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:4000',
  credentials: true, 
  methods: 'GET,POST,PUT,DELETE,OPTIONS,PATCH',
  allowedHeaders: 'Content-Type,Authorization'
}));

app.use(session({
  secret: process.env.SESSION_SECRET || 'nci',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false }
}));

const userRouter = require('./routes/user')
const postRouter = require('./routes/post')
const commentRouter = require('./routes/comment')
const uploadRouter = require('./routes/upload')
const conversationRouter = require('./routes/conversation')
const messageRouter = require('./routes/message')
const reportRouter = require('./routes/report')
const notificationRouter = require('./routes/notification')
const spotifyRouter = require('./routes/spotify')
const analyticsRouter = require('./routes/analytics');

const startTime = Date.now();

app.use(cookieParser());

// middleware to parse json
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/user', userRouter);
app.use('/post', postRouter);
app.use('/comment', commentRouter);
app.use('/upload', uploadRouter);
app.use('/conversation', conversationRouter);
app.use('/message', messageRouter);
app.use('/report', reportRouter);
app.use('/notification', notificationRouter);
app.use('/spotify', spotifyRouter);
app.use('/analytics', analyticsRouter);

const routes = [
  { path: "/user", description: "user related operations" },
  { path: "/post", description: "manage posts" },
  { path: "/comment", description: "manage comments" },
  { path: "/upload", description: "handle file uploads" },
  { path: "/conversation", description: "conversations between users" },
  { path: "/message", description: "user messages" },
  { path: "/report", description: "admin report handling" },
  { path: "/notification", description: "user notifications" },
  { path: "/spotify", description: "spotify api integration" }
];

// ejs
app.engine('ejs', engine);
app.set('view engine', 'ejs');

// for client side styles and js
app.use('/public', express.static(path.join(__dirname, 'public')));

// set the views directory
app.set('views', path.join(__dirname, 'views'));

app.get('/', (req, res) => {
  const uptime = processInfo.uptime();
  const systemInfo = {
    server: {
      hostname: os.hostname(),
      platform: os.platform(),
      arch: os.arch(),
      node_version: processInfo.version,
      memory_usage: `${(processInfo.memoryUsage().rss / 1024 / 1024).toFixed(2)} MB`,
      uptime: `${Math.floor(uptime / 3600)}h ${Math.floor((uptime % 3600) / 60)}m ${Math.floor(uptime % 60)}s`,
      start_time: new Date(startTime).toLocaleString(),
    },
    available_routes: routes
  };

  res.json(systemInfo);
});

app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(err.status || 500).json({ error: err.message || 'Internal Server Error' });
});