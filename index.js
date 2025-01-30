const dotenv = require('dotenv');
dotenv.config({ path: '.config' });
const engine = require('ejs-mate');
const path = require('path');
const cookieParser = require('cookie-parser');

const express = require('express')
const app = express()
const port = 3000

const userRouter = require('./routes/user')
const postRouter = require('./routes/post')

app.use(cookieParser());
// middleware to parse json
app.use(express.json());

app.use('/user', userRouter);
app.use('/post', postRouter);

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