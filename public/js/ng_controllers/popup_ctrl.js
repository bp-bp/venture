function venture_popup_ctrl(users, pages, current) {
	var self = this;
	self.users = users;
	self.pages = pages;
	self.current = current;
	
	// located here in the controller for convenience and readability 
	// just a getter/setter for the value in the current service
	// not sure I need a getter/setter here, more like in the service...
	self.popped = function(val) {
		if (angular.isDefined(val)) {
			self.current.popup_visible = val;
		}
		return self.current.popup_visible;
	};
	
	self.cancel = function() {
		self.current.popup_init();
	};
	
	self.confirm = function() {
		if (self.current.popup_data.confirm_callback && typeof self.current.popup_data.confirm_callback === "function") {
			self.current.popup_data.confirm_callback();
		}
	};
}

angular.module("app").controller("venture_popup_ctrl", ["users", "pages", "current", venture_popup_ctrl]);
angular.module("app").component("venturePopup", {
	bindings: {}
	, controller: ["users", "pages", "current", venture_popup_ctrl]
	, controllerAs: "v_pop"
	, templateUrl: "html/templates/venture_popup.html"
});