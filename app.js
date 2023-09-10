const path = require('path');

const express = require('express');
const session = require('express-session');
const mongodbStore = require('connect-mongodb-session');

const db = require('./data/database');
const demoRoutes = require('./routes/demo');
const { Cookie } = require('express-session');

const MongoDBStore = mongodbStore(session); //세션패키지와 몽고db세션관리 패키지를 연결

const app = express();

const sessionStore = new MongoDBStore({
  uri: 'mongodb://localhost:27017', // 데이터베이스 경로
  databaseName: 'auth-demo',
  collection: 'sessions'
});

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.static('public'));
app.use(express.urlencoded({ extended: false }));

app.use(session({
  secret: 'super-secret',
  resave: false, //세션의 데이터가 실제로 변경된 경우에만 데이터베이스에서 업데이트되는데 영향을 미침
  saveUninitialized: false, // 세션이 실제로 데이터베이스에만 저장되도록 하거나 데이터가 있을 때 저장하려는 어디든지 저장되도록 함.
  store:  sessionStore, //세션데이터가 실제로 저장되어야 하는 위치 제어
  //cookie: { 
  //  maxAge: 30 * 24 * 60 * 60 * 1000,  // 쿠키 만료기간 설정 밀리초단위 60*1000 = 1분 
  //}
}));

app.use(async function(req, res, next) {
  const user = req.session.user;
  const isAuth = req.session.isAuthenticated;
  
  if(!user || !isAuth) {
    return next(); // 해당위치에 도달할경우 다음 미들웨어로 이동. ( 이 경우에는 app.use(demoRoutes) 이다. )
  }
  
  const userDoc = await db.getDb().collection('users').findOne({ _id: user.id });
  const isAdmin = userDoc.isAdmin;
  
  // 요청 응답 주기동안 사용할 수 있는 일부 전역 값 설정가능.
  // 또한 routes파일에서 별도의 데이터 전달없이 모든 템플릿에서 사용가능.
  res.locals.isAuth = isAuth;  
  res.locals.isAdmin = isAdmin;

  next();
})

app.use(demoRoutes);

app.use(function(error, req, res, next) {
  res.render('500');
})

db.connectToDatabase().then(function () {
  app.listen(3000);
});
