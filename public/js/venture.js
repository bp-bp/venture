angular.module("app", ["ngResource", "ngRoute"]);


angular.module("app").config(["$routeProvider", "$locationProvider", function($routeProvider, $locationProvider) {
	$locationProvider.hashPrefix("");
	
	$routeProvider
		.when("/main", {template: "<venture-main></venture-main>"})
		.when("/stories", {template: "<venture-story></venture-story>"})
		.when("/stories/user", {template: "<venture-story-user></venture-story-user>", reloadOnSearch: false})
		.when("/stories/user?:story", {template: "<venture-story-user></venture-story-user>", reloadOnSearch: false})
		.when("/pages", {template: "<venture-pages></venture-pages>"})
		.when("/read", {template: "<venture-read></venture-read>", reloadOnSearch: true}) // temp till we fix read controller
		.when("/read/?:story?:page", {template: "<venture-read></venture-read>", reloadOnSearch: true})
		.when("/branch_edit/?:page", {template: "<venture-branch-edit></venture-branch-edit>"})
		
		.otherwise("/stories", {template: "<venture-story></venture-story>"});
}]);