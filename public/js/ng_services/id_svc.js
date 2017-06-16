angular.module("app").service("id", ["$q", "$http", function($q, $http) {
	// gets ids from server
	this.gen_id = function() {
		return $http.get("/gen_id").then(
			// success
			function(id) {
				console.log("gen_id success: ", id);
				return(id.data);
			},
			// fail
			function(err) {
				console.log("gen_id failed with: ", err);
				return $q.reject(err);
			}
		);
	};
	
	this.get_page_short_id = function(story_id) {
		return $http.get("/page_short_id/" + story_id).then(
			// success
			function(payload) {
				console.log("get_page_short_id success: ", payload);
				return payload.data.counter_str;
			},
			// fail
			function(payload) {
				console.log("get_page_short_id failed with: ", payload);
				return $q.reject(err);
			}
		);
	}
}]);