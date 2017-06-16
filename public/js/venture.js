angular.module("app", ["ngResource", "ngRoute"]);


// do i want to do this?
/*
angular.module("app").service("auth_interceptor", ["$q", function($q) {
	this.request = function(config) {
		//console.log("interceptor request: ", config);
		return config;
	};
	
	this.response = function(config) {
		//console.log("interceptor response: ", config);
		if (config.resource && config.resource.user) {
			//console.log("still logged in");
		}
		return config;
	};
	
	this.responseError = function(res) {
		if (res.status === 401) {
			console.log("rejecting on 401");
			console.log(res);
			return $q.reject(res);
		}
		return res;
	};

}]);

angular.module("app").config(["$httpProvider", function($httpProvider) {
	$httpProvider.interceptors.push("auth_interceptor");
	//console.log($httpProvider.interceptors);
}]);
*/

angular.module("app").config(["$routeProvider", "$locationProvider", function($routeProvider, $locationProvider) {
	$locationProvider.hashPrefix("");
	
	$routeProvider
		.when("/main", {template: "<venture-main></venture-main>"})
		.when("/stories", {template: "<venture-story></venture-story>"})
		.when("/stories/user", {template: "<venture-story-user></venture-story-user>"})
		.when("/pages", {template: "<venture-pages></venture-pages>"})
		.when("/read", {template: "<venture-read></venture-read>", reloadOnSearch: true}) // temp till we fix read controller
		.when("/read/?:story?:page", {template: "<venture-read></venture-read>", reloadOnSearch: true})
		.when("/branch_edit/?:page", {template: "<venture-branch-edit></venture-branch-edit>"})
		
		.otherwise("/stories", {template: "<venture-story></venture-story>"});
}]);