angular.module("app", ["ngResource", "ui.router"]);


angular.module("app").config(["$stateProvider", function($stateProvider) {
	var main = {
		name: "main"
		, url: "/main"
		, template: "<venture-main></venture-main>"
	};
	
	var stories = {
		name: "stories"
		, url: "/stories?story"
		, component: "ventureStory"
		//, template: "<venture-story></venture-story>"
	};
	
	var my_stories = {
		name: "my_stories"
		, url: "/stories/user"
		, component: "ventureStoryUser"
		//, template: "<venture-story-user></venture-story-user>"
	};
	
	var pages = {
		name: "pages"
		, url: "/pages?story"
		, component: "venturePages"
		//, template: "<venture-pages></venture-pages>"
	};
	
	var read = {
		name: "read"
		, url: "/read?story&page&option"
		, component: "ventureRead"
		//, template: "<venture-read></venture-read>"
	};
	
	// actually not sure if I need branch edit, come back to that later
	
	$stateProvider.state(main);
	$stateProvider.state(stories);
	$stateProvider.state(my_stories);
	$stateProvider.state(pages);
	$stateProvider.state(read);
	
}]);

/*
angular.module("app").config(["$routeProvider", "$locationProvider", function($routeProvider, $locationProvider) {
	$locationProvider.hashPrefix("");
	
	$routeProvider
		.when("/main", {template: "<venture-main></venture-main>"})
		.when("/stories", {template: "<venture-story></venture-story>"})
		.when("/stories/user", {template: "<venture-story-user></venture-story-user>", reloadOnSearch: false})
		.when("/stories/user?:story", {template: "<venture-story-user></venture-story-user>", reloadOnSearch: false})
		.when("/pages", {template: "<venture-pages></venture-pages>"})
		.when("/read", {template: "<venture-read></venture-read>", reloadOnSearch: false}) 
		.when("/read/?:story", {template: "<venture-read></venture-read>", reloadOnSearch: false})
		.when("/read/?:story?:page", {template: "<venture-read></venture-read>", reloadOnSearch: false})
		.when("/read/?:story?:page?:option", {template: "<venture-read></venture-read>", reloadOnSearch: false})
		.when("/branch_edit/?:page", {template: "<venture-branch-edit></venture-branch-edit>"})
		
		.otherwise("/stories", {template: "<venture-story></venture-story>"});
}]);
*/