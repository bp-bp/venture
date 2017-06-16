// app/passport_config.js
"use strict"

const LocalStrategy = require("passport-local").Strategy;
const User = require("./models/user.js");

module.exports = function(passport) {
	// to store in session
	passport.serializeUser(function(user, done) {
		done(null, user._id)
	});
	
	// after retrieving from session
	passport.deserializeUser(function(id, done) {
		User.findById(id, function(err, user) {
			done(err, user);
		});
	});
	
	passport.use("local-login", new LocalStrategy({
		usernameField: "username"
		, passwordField: "password"
		, passReqToCallback: true},
		
		function(req, username, password, done) {
			User.findOne({"local.username": username}, function(err, user) {
				console.log("here");
				console.log("username: ", username);
				console.log("password: ", password);
				console.log("user: ", user);
				console.log("err: ", err);
				if (err) {
					return done(err);
				}
				
				if (!user) {
					console.log("user not found");
					return done(null, false, {message: "user not found"}); // flash here?
				}
				
				if (!user.check_password(password)) {
					console.log("bad password");
					return done(null, false, {message: "invalid password"}); // flash here
				}
				
				console.log("user checks out");
				return done(null, user, {message: "authenticated"});
			});
		}
	));
	
};
