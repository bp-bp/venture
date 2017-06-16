function drop_down_ctrl() {
	var self = this;
	console.log("drop_down_ctrl called");
	
	self.expanded = false;
	
	self.toggle = function() {
		self.expanded = !self.expanded;
	};
	
	self.$onInit = function() {
		// rejigger if conditions if present
		self.items.forEach(function(itm) {
			if (itm.if_condition != undefined) {
				itm._passed_condition = itm.if_condition;
				
				// check if the if_condition is a function, if so itm.if_condition will just be the function
				if (typeof itm._passed_condition === "function") {
					console.log("right here");
					//itm.if_condition = itm._passed_condition; // don't need to do this but it makes what we're doing more explicit
					var func = itm._passed_condition;
					itm.if_condition = itm._passed_condition;
				}
				// otherwise, itm.if_condition will be a function that returns the value of itm._passed_condition
				else {
					function condition_function() {
						return itm._passed_condition;
					}
					itm.if_condition = condition_function;
				}
			}
			else {
				itm.if_condition = function() {return true;};
			}
		});
	};
}

angular.module("app").controller("drop_down_ctrl", [drop_down_ctrl]);
angular.module("app").component("dropDown", {
	bindings: {items: "="}
	, controller: [drop_down_ctrl]
	, controllerAs: "dd"
	, templateUrl: "html/templates/drop_down.html"
});