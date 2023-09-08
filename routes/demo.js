const express = require("express");
const bcrypt = require("bcryptjs");

const db = require("../data/database");

const router = express.Router();

router.get("/", function (req, res) {
  res.render("welcome");
});

router.get("/signup", function (req, res) {
  res.render("signup");
});

router.get("/login", function (req, res) {
  res.render("login");
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
    console.log("Incorrect data");
    return res.redirect("/signup");
  }

  const existingUser = await db
    .getDb()
    .collection("users")
    .findOne({ email: enteredEmail });

    if(existingUser) {
      console.log('user exists');
      return res.redirect('/signup');
    }

  const hashedPassword = await bcrypt.hash(enteredPassword, 12); // (변환할 비밀번호, 해싱강도=높을수록 디코딩이 힘듦)

  const user = {
    email: enteredEmail,
    password: hashedPassword,
  };

  await db.getDb().collection("users").insertOne(user);

  res.redirect("/login");
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
    console.log("no email");
    return res.redirect("/login");
  }

  passwordsAreEqual = await bcrypt.compare(
    enteredPassword,
    existingUser.password
  ); // (입력된암호, 원래의 해시된 암호)

  if (!passwordsAreEqual) {
    //입력된암호가 원래의 암호와 다르다면
    console.log("password error");
    return res.redirect("/login");
  }

  console.log("login");
  res.redirect("/admin");
});

router.get("/admin", function (req, res) {
  res.render("admin");
});

router.post("/logout", function (req, res) {});

module.exports = router;
