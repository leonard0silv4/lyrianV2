const express = require("express");
const { loginStaff, loginAtelier } = require("./auth.controller");

const router = express.Router();

router.post("/login", loginStaff);
router.post("/atelier/login", loginAtelier);

module.exports = router;
