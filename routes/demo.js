const express = require("express");
const bcrypt = require("bcryptjs");

const db = require("../data/database");
const session = require("express-session");

const router = express.Router();






router.get("/", function (req, res) {
  res.render("welcome");
});





router.get("/signup", function (req, res) {
  let sessionInputData = req.session.inputData;

  if(!sessionInputData) {
    sessionInputData = {  
      hasError: false,
      email: '',
      confirmEmail: '',
      password: ''
    };
  }

  req.session.inputData = null;

  res.render("signup", { inputData: sessionInputData } );
});






router.get("/login", function (req, res) {
  let sessionInputData = req.session.inputData;

  if(!sessionInputData) {
    sessionInputData = {  
      hasError: false,
      email: '',
      password: ''
    };
  }

  req.session.inputData = null;
  res.render("login", {inputData: sessionInputData});
});






router.post("/signup", async function (req, res) {
  const userData = req.body;
  const enteredEmail = userData.email;
  const enteredConfirmEmail = userData["confirm-email"]; // name에 -가 포함되어 있으므로 userData.이 아닌 userData[]를 사용.
  const enteredPassword = userData.password;

  if (
    !enteredEmail ||
    !enteredConfirmEmail ||
    !enteredPassword ||
    enteredPassword.trim() < 6 ||
    enteredEmail !== enteredConfirmEmail ||
    !enteredEmail.includes("@")
  ) {

    req.session.inputData = { // mongodb에 연결된 세션관리 패키지를 이용하기때문에 session이라는 db에 inputData라는 collection을 생성한것.
      hasError: true,
      message: "Invalid input",
      email: enteredEmail,
      confirmEmail: enteredConfirmEmail,
      password: enteredPassword,

    }; // 사용자가 회원가입시 입력한 데이터를 임시로 저장

    req.session.save(function () {
      return res.redirect("/signup"); // 익명함수 (현재 return이 존재하는 {} 내에서만 return을 하기때문에 이후의 코드를 막지않음.)
    });
    //console.log("Incorrect data");
    return;                           // 이후의 코드를 막기위해 return추가. 이게 없으면 하나의 요청에 2개의 응답으로 서버가 충돌
  }

  const existingUser = await db
    .getDb()
    .collection("users")
    .findOne({ email: enteredEmail });

  if (existingUser) {
    req.session.inputData = {
      hasError: true,
      message: "User exists already!",
      email: enteredEmail,
      confirmEmail: enteredConfirmEmail,
      password: enteredPassword,
    };
    req.session.save(function() {
      res.redirect("/signup");
    });
    return;
  }

  const hashedPassword = await bcrypt.hash(enteredPassword, 12); // (변환할 비밀번호, 해싱강도=높을수록 디코딩이 힘듦)

  const user = {
    email: enteredEmail,
    password: hashedPassword,
  };

  await db.getDb().collection("users").insertOne(user);

  return res.redirect("/login");
});







router.post("/login", async function (req, res) {
  const userData = req.body;
  const enteredEmail = userData.email;
  const enteredPassword = userData.password;

  const existingUser = await db
    .getDb()
    .collection("users")
    .findOne({ email: enteredEmail });

  if (!existingUser) {
    req.session.inputData = {
      hasError: true,
      message: "Plz check ur credentials",
      email: enteredEmail,
      password: enteredPassword,
    };
    req.session.save(function() {
      res.redirect("/login");
    });
    return;
  }

  passwordsAreEqual = await bcrypt.compare(
    enteredPassword,
    existingUser.password
  ); // (입력된암호, 원래의 해시된 암호)

  if (!passwordsAreEqual) {
    //입력된암호가 원래의 암호와 다르다면
    req.session.inputData = {
      hasError: true,
      message: "Plz check ur credentials",
      email: enteredEmail,
      password: enteredPassword,
    };
    req.session.save(function() {
      res.redirect("/login");
    });
    return;
  }

  req.session.user = { id: existingUser._id, email: existingUser.email };
  req.session.isAuthenticated = true; // 로그인 여부
  req.session.save(function () {
    // 세션데이터가 db에 저장된 이후에만 redirect가 실행됨.
    console.log("login");
    res.redirect("/admin");
  });
});







router.get("/admin", async function (req, res) {
  //if (!req.session.isAuthenticated) {
  if (!res.locals.isAuth) {
    // 사용자가 인증되었다면. = 사용자가 로그인을 통해서 접속했다면.  // isAuthenticated를 안했다면 if(!req.session.user)
    return res.status(401).render("401");
  }

  const user = await db.getDb().collection('users').findOne({_id: req.session.user.id}) //138줄

  //if (!user || !user.isAdmin) {
    if (!res.locals.isAdmin) {
    return res.status(403).render('403');
  }
  res.render("admin");
});



router.get("/profile", function (req, res) {
  //if (!req.session.isAuthenticated) {
    if (!res.locals.isAuth) {
    // 사용자가 인증되었다면. = 사용자가 로그인을 통해서 접속했다면.  // isAuthenticated를 안했다면 if(!req.session.user)
    return res.status(401).render("401");
  }
  res.render("profile");
});






router.post("/logout", function (req, res) {
  req.session.user = null;
  req.session.isAuthenticated = false;
  res.redirect("/");
});

module.exports = router;
