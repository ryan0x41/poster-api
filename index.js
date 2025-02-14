const dotenv = require('dotenv');
dotenv.config({ path: '.config' });
const engine = require('ejs-mate');
const path = require('path');
const cookieParser = require('cookie-parser');
const cors = require('cors');

const express = require('express')
const app = express()
const port = 3000

const userRouter = require('./routes/user')
const postRouter = require('./routes/post')
const commentRouter = require('./routes/comment')
const uploadRouter = require('./routes/upload')
const conversationRouter = require('./routes/conversation')
const messageRouter = require('./routes/message')
const reportRouter = require('./routes/report')

app.use(cookieParser());
// middleware to parse json
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());

app.use('/user', userRouter);
app.use('/post', postRouter);
app.use('/comment', commentRouter);
app.use('/upload', uploadRouter);
app.use('/conversation', conversationRouter);
app.use('/message', messageRouter);
app.use('/report', reportRouter);

// ejs
app.engine('ejs', engine);
app.set('view engine', 'ejs');

// for client side styles and js
app.use('/public', express.static(path.join(__dirname, 'public')));

// set the views directory
app.set('views', path.join(__dirname, 'views'));

app.get('/', (req, res) => {
  res.send('Hello World!')
})

app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(err.status || 500).json({ error: err.message || 'Internal Server Error' });
});

app.listen(port, () => {
  console.log(`forked listening on port ${port}`)
})