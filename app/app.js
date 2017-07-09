"use strict"

const express = require("express");
const mongoose = require("mongoose");
const passport = require("passport");
const flash = require("connect-flash");
const morgan = require("morgan");
const cookieParser = require("cookie-parser");
const bodyParser = require("body-parser");
const session = require("express-session");
const bcrypt = require("bcrypt-nodejs");
const uuid = require("node-uuid");

// set up app
const app = express();
const config = require("./config");


// serve static html
app.use(express.static("public"));
// db
//mongoose.Promise = Q;
mongoose.connect(config.db_url);

// misc setup
app.use(morgan("dev")); // logs every request to console
app.use(cookieParser());
app.use(bodyParser.urlencoded({extended: false}));
app.use(bodyParser.json());





// passport setup
app.use(session({	secret: "youllneverguessthesecret"
				 	, maxAge: 900000 // 15 minutes
					, resave: false 
					, rolling: true // stay logged in with activity
					, saveUninitialized: false // probably want this too
				}));
app.use(passport.initialize());
app.use(passport.session()); // persist login sessions
app.use(flash()); // session messages

const routes = require("./routes")(app);
// passport setup
require("./passport_config")(passport)

// serve
var server = app.listen(8081, function() {
	var host = server.address().address;
	var port = server.address().port;
	
	console.log("app listening at http://%s:%s", host, port);
})