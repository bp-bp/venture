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
	
	// some ui
	self.login_message = null;
	self.login_expanded = false;
	self.toggle_login_expand = function() {
		self.login_expanded = !self.login_expanded;
	};
	
	// init
	if (!self.users.logged_in()) {
		self.users.check_auth().then(
			// success -- we are logged in
			function() {
				console.log("logged in");
				//self.pages.get_all_stories();
				//$location.path("/stories/user");
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