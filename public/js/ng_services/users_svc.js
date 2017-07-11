angular.module("app").service("users", ["$resource", "id", "$q", function($resource, id, $q) {
	
	this.id = id;
	this.$q = $q;
	var srv = this;
	
	this.rsc = $resource( 	"/users/username/:username/password/:password"
									, {username: "@username", password: "@password"}
									, { login: {url: "/login", method: "POST"}
										, logout: {url: "/logout", method: "GET"}
										, signup: {url: "/signup", method: "POST"}
										, check_auth: {url: "/check_auth", method: "GET"}
									}
								);
								
	this.check_auth = function() {
		return this.rsc.check_auth().$promise.then(
			// success
			function(payload) {
				//console.log("check_auth success payload: ", payload);
				var auth_user = {};
				if (payload.auth_user) {
					auth_user.username = payload.auth_user.local.username;
					auth_user._id = payload.auth_user._id;
					auth_user.logged_in = true;
					var user = new srv.User(auth_user);
					srv.user = user;
					return payload;
				}
				return $q.reject(payload);
			},
			// fail
			function(payload) {
				//console.log("check_auth fail -- not logged in");
				return $q.reject(payload);
			}
		);
	};
	
	this.signup_user = function(user) {
		console.log("signup_user called");
		console.log("user: ", user);
		//var param_obj = {username: user.username, password: user.password};
		return this.rsc.signup({user: user}).$promise.then(
			// success
			function(payload) {
				console.log("signup_user success");
				console.log(payload);
				return payload;
			},
			// fail
			function(payload) {
				console.log("signup_user fail");
				console.log(payload);
				return $q.reject(payload);
			}
		);
	};
	
	this.find_user = function(user) {
		console.log("find_user called");
		var param_obj = {username: user.username, password: user.password};
		return this.rsc.get(param_obj).$promise.then(
			// success
			function(payload) {
				console.log("find_user success");
				console.log(payload);
				return payload;
			},
			// fail
			function(payload) {
				console.log("find_user failed");
				console.log(payload);
				return payload;
			}
		);
	};
	
	this.login_user = function(user) {
		var param_obj = {username: user.username, password: user.password};
		return this.rsc.login(param_obj).$promise.then(
			// success
			function(payload) {
				console.log("login success!");
				console.log(payload);
				srv.user = new srv.User({username: payload.username
									, _id: payload._id
									, admin: payload.admin
									, logged_in: true});
				return payload;
			},
			// fail
			function(payload) {
				console.log("login fail");
				console.log(payload);
				return srv.$q.reject(payload.data.message);
			}
		);
	};
	
	this.logout_user = function() {
		console.log("logging out");
		return this.rsc.logout().$promise.then( 
			// success
			function(payload) {
				srv.user = new srv.User({});
				return payload;
			},
			// fail
			function(payload) {
				console.log("logout failed: ", payload);
				return payload;
			}
		);
	};
	
	this.create_new_user = function() {
		var init = {is_new: true};
		var user = new this.User(init);
		this.user = user;
		return user;
	};
	
	this.User = function(init) {
		var that = this;
		this.type = "user";
		this.is_new = init.hasOwnProperty("is_new") ? init.is_new : true;
		this.username = init.hasOwnProperty("username") ? init.username : null;
		this.password = init.hasOwnProperty("password") ? init.password : null;
		
		//this._id = init.hasOwnProperty("_id") ? init._id : srv.id.new_id();
		this._id = null;
		if (init.hasOwnProperty("_id")) {
			this._id = init._id;
		}
		else {
			srv.id.gen_id().then(
				// success
				function(id) {
					that._id = id;
				},
				// fail
				function(err) {
					console.log("could not gen id for new User: ", err);
				}
			);
		}
		
		
		
		this.logged_in = init.hasOwnProperty("logged_in") ? init.logged_in : false;
	};
	
	this.logged_in = function() {
		if (this.user && this.user.logged_in) {
			return true;
		}
		return false;
	};
	
	this.user = new this.User({});//null;
	//console.log("this.user: ", this.user);
	//this.check_auth();
	
}]);