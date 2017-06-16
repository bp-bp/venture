// app/routes.js
"use strict"

const path = require("path");
const passport = require("passport");
const uuid = require("node-uuid");
const Hashids = require("hashids");
const hashids = new Hashids();
const User = require("./models/user.js");
const Story = require("./models/story.js");
const data_calls = require("./data_calls.js");

const ObjectId = require("mongoose").Types.ObjectId;

function requires_login(req, res, next) {
	if (!req.user) {
		console.log("user not present, not logged in");
		res.status(401);
		return res.send({message: "requires login"});
	}
	next();
}

// currently does nothing, handling this in data_calls
function check_auth_for_rsc(call_type) {
	console.log("here is check_auth_for_rsc called with: ", call_type);
	return function(req, res, next) {
		console.log("call_type: ", call_type);
		next();
	};
}

function test_thing(prm) {
	console.log("here we are and the param is: ", prm);
	return check_auth_for_rsc;
}

function check_login(req, res) {
	var auth_user = req.user ? req.user : false;
	if (!auth_user) {
		res.status(401);
	}
	res.send({auth_user: auth_user});
}

// the routes
module.exports = function(app) {
	var root_path = path.dirname(require.main.filename);
	
	// test nonsense
	app.get("/", function(req, res) {
		res.send("Hello World");
	});
	
	// html routes
	app.get("/venture", function(req, res) {
		res.sendFile(path.join(root_path, "/public/html/home.html"));
	});
	
	// unique ids for the front-end
	app.get("/gen_id", function(req, res) {
		var id = new ObjectId().toHexString();
		console.log("id: ", id);
		res.send(id);
		//res.send(new ObjectID);
		//res.send(uuid.v1());
		//console.log("microtime: ", process.hrtime());
		//res.send(hashids.encode(new Date().getTime()));
	});
	
	// short id for page objects ancestor path
	app.get("/page_short_id/:story", requires_login, data_calls.get_page_short_id);
	
	// login/signup stuff
	app.post("/signup", function(req, res) {
		console.log("signup route");
		console.log("req.body: ", req.body.user);
		var passed_user = req.body.user;
		
		// check if user with this username already exists
		User.findOne({"local.username": passed_user.username}, function(err, user) {
			if (err) {
				return res.send("error");
			}
			
			if (user) {
				return res.send("username already exists");
			}
			
			var new_user = new User();
			new_user._id = passed_user._id;
			new_user.local.username = passed_user.username;
			new_user.local.password = new_user.hash_password(passed_user.password);
			
			new_user.save(function(err) {
				if (err) {
					throw err;
				}
				return res.send({message: "user created successfully"});
			});
		});
	});
	
	app.post("/login", function(req, res, next) {
		console.log("login req.body: ", req.body);
		passport.authenticate("local-login", function(err, user, info) {
			console.log("authenticate callback");
			console.log("info: ", info);
			if (err) {
				console.log("login error: ", err);
				return next(err);
			}
			
			// failed login
			if (!user) {
				console.log("failed login");
				res.status(401);
				return res.send({message: info.message});
			}
			
			// success 
			console.log("about to log in...");
			req.logIn(user, function(err) {
				if (err) {
					console.log("error calling req.logIn: ", err);
					return res.send({message: "login error in req.logIn"});
				}
				return res.send({username: user.local.username, _id: user._id, admin: user.admin});
			});
		}, {session: true})(req, res, next);
	});
	
	// stories api
	app.get("/stories/:story", data_calls.get_stories);
	app.get("/stories", check_auth_for_rsc("stories"), data_calls.get_stories);
	app.post("/stories", requires_login, data_calls.save_stories);
	
	app.get("/check_auth", check_login);
	
	app.get("/logout", function(req, res, next) {
		req.logout();
		res.send({message: "logged out"});
	});
	
	// pages api
	app.post("/pages", requires_login, data_calls.save_pages);
	app.get("/pages", data_calls.load_pages_for_story);
	app.delete("/pages/:page/options/:option", requires_login, data_calls.delete);
	
	app.get("/get_descendants/:type/:id", requires_login, data_calls.get_descendants);
	
	// read api
	app.get("/read/:story/:page", data_calls.read_page);
	app.get("/read/:story", data_calls.read_page);
	
	// branch edit -- pages -- not using
	//app.get("/branch_edit/:story/:page", requires_login, data_calls.branch_edit_page);
	// branch edit -- options 
	app.get("/branch_edit/:story/:option", requires_login, data_calls.branch_edit_option);
	// for now, this one will do the same thing as /branch_edit, just want to be able to keep track
	// of different types of calls
	app.get("/renew_option_lock/:story/:option", requires_login, data_calls.branch_edit_option);
	// TEST
	//app.get("/renew_option_lock/:story/:option", requires_login, data_calls.test);
	app.get("/unlock_option/:story/:option", requires_login, data_calls.unlock_option);
	
	// lock for branch edit
	//app.get("/page_lock/:page", requires_login, data_calls.get_page_lock);
	
	// test
	function test_good(req, res) {
		res.status(200);
		res.send({message: "we're good here"});
	}
	
};