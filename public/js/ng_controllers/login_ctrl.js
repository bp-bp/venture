// login panel
function venture_login_ctrl(id, users, current, $window) {
	var self = this;
	self.id = id;
	self.users = users;
	self.current = current;
	
	self.username = "";
	self.password = "";
	
	self.apply_to_svc = function() {
		if (! self.users.user) {
			return;
		}
		self.users.user.username = self.username;
		self.users.user.password = self.password;
	};
	
	self.login = function() {
		self.apply_to_svc();
		self.users.login_user(self.users.user).then(
			// success
			function() {
				self.login_expanded = false;
				$window.location.reload();
			},
			// fail
			function(message) {
				// fill in some kind of message here
				console.log("failed login: ", message);
				self.login_message = message;
			}
		);
	};
	
	self.signup = function() {
		self.apply_to_svc();
		self.users.signup_user(self.users.user).then(
			// success
			function() {
				// put something here maybe
			},
			// fail
			function() {
				// also maybe a message here
			}
		);
	};
	
	self.logout = function() {
		// kick off logout
		self.users.logout_user();
		// some cleanup
		self.current.stop_renewing_locks();
		$window.location.reload();
	};
	
	// some ui
	self.login_message = null;
	
};
angular.module("app").controller("venture_login_ctrl", ["id", "users", "current", "$window", venture_login_ctrl]);
angular.module("app").component("ventureLogin", {
	bindings: {}
	, controller: ["id", "users", "current", "$window", venture_login_ctrl]
	, controllerAs: "v_login"
	, templateUrl: "html/templates/venture_login.html"
});