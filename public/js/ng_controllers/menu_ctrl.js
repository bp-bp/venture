// top bar menu
function venture_menu_ctrl(id, users, pages, current, $location, $window) {
	var self = this;
	self.id = id;
	self.users = users;
	self.pages = pages;
	self.current = current;
	
	// test stuff
	self.echo_data = function() {
		console.log("users: ", self.users);
		console.log("pages: ", self.pages);
		console.log("current: ", self.current);
		console.log("sorted page list: ", self.pages.sorted_page_list);
	};
	
	// login panel stuff
	/*self.login = function() {
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
		// bunch of cleanup
		self.toggle_login_expand();
		self.current.stop_renewing_locks();
		$location.path("/stories"); 
	};
	
	// some ui
	self.login_message = null;*/
	self.login_expanded = false;
	self.toggle_login_expand = function() {
		self.login_expanded = !self.login_expanded;
	};
	
	// init
	if (!self.users.logged_in()) {
		self.users.check_auth().then(
			// success -- we are logged in
			function() {
				console.log("logged in, loading stories");
				//self.pages.get_all_stories();
				$location.path("/stories/user");
			},
			// fail -- not logged in
			function() {
				console.log("not logged in, not loading data");
			}
		);
	};
}
angular.module("app").controller("venture_menu_ctrl", ["id", "users", "pages", "current", "$location", "$window", venture_menu_ctrl]);
angular.module("app").component("ventureMenu", {
	bindings: {}
	, controller: ["id", "users", "pages", "current", "$location", "$window", venture_menu_ctrl]
	, controllerAs: "v_menu"
	, templateUrl: "html/templates/venture_menu.html"
});