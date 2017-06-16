angular.module("app").service("current", ["$interval", function($interval) {
	this.story = null;
	this.page = null;
	this.branch_edit_option_lock = null; // promise returned from $interval service
	
	// self explanatory -- stops the $interval that renews a backend branch edit lock
	this.stop_renewing_locks = function() {
		if (this.branch_edit_option_lock) {
			$interval.cancel(this.branch_edit_option_lock);
		}
	};
	
	// not sure I'm using this
	this.set_page = function(val) {
		console.log("set_page()");
		this.page = val;
	};
	
	// global popup/overlay stuff
	this.popup_init = function() {
		this.popup_visible = false;
		this.popup_data = {popup_type: null}; // filled in by whatever controller is using the popup
	};
	this.popup_init();
	//this.popup_visible = false;
	//this.popup_data = {popup_type: null}; // filled in by whatever controller is using the popup
	
}]);