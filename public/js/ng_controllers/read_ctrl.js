// read
function venture_read_ctrl(users, pages, current, $q, $location, $rootScope, $route, $routeParams) {
	console.log("**********loading read controller**********");
	var self = this;
	self.users = users;
	self.pages = pages;
	self.current = current;
	var stop_loading = false;
	
	console.log("self.current.story: ", self.current.story);
	console.log("self.current.page: ", self.current.page);
	console.log("$routeParams: ", $routeParams.current.params.story, $routeParams.current.params.page);
	
	if (	self.current.story 
			&& self.current.story._id === $routeParams.current.params.story
			&& self.current.page
			&& self.current.page._id === $routeParams.current.params.page) {
		console.log("do nothing!");
		stop_loading = true;
	}
	
	// used when reaching the end of a branch, asking user to branch edit
	self.ask_for_edit = false;
	self.ask_for_edit_page_id = null;
	self.branch_edit_message = null;
	self.branch_edit_fail = null;
	// indicates if there are no pages in the current story
	self.empty_story = false;
	
	// all this loading stuff could really go in a function
	if (! stop_loading) {
		// handle route and reload if necessary
		var param_story, param_page, param_option;
		// if there's no story in the url
		if (! $routeParams.current.params.story) {
			console.log("no story passed");
			// if there's no current story either there's nothing we can do here
			if (! self.current.story) {
				return;
			}
			param_story = self.current.story._id;
			//$location.search({story: param_story});
			console.log("$routeParams here is: ", $routeParams);
		}
		else {
			param_story = $routeParams.current.params.story;
		}

		// now if there's no page in the url, we'll load the first one from the story -- set param_page to null for now
		if (! $routeParams.current.params.page) {
			console.log("no page passed");
			param_page = null;
		}
		// otherwise set param_page from the route
		else {
			param_page = $routeParams.current.params.page;
		}
		
		// param_option only goes one way -- grab it from routeParams if it exists
		param_option = $routeParams.current.params.option || null;

		// clear everything and load fresh
		self.pages.prep_for_read();

		// get our story
		var story_prom;
		if (! self.current.story) {
			story_prom = self.pages.get_story(param_story).then(
				// success
				function(payload) {
					self.current.story = payload.stories[0];
					return self.pages.read_page(self.current.story._id, param_page);
				},
				// fail
				function(err) {
					console.log("get_story call in read controller failed with: ", err);
					return $q.reject(err);
				}
			);
		}
		// or if story is already loaded
		else {
			console.log("calling read_page in another place");
			story_prom = self.pages.read_page(self.current.story._id, param_page);
		}
		
		story_prom.then(
			// success
			function (payload) {
				// if a page was retrieved
				if (payload.page_found) {
					var i, page = self.pages.create_loaded_page(payload.page);
					payload.options.map(function(opt) {
						self.pages.create_loaded_option(opt);
					});
					self.current.page = page;
					$location.search({story: param_story, page: page._id, option: $routeParams.current.params.option});
				}
				else if (payload.sought_first) {
					self.empty_story = true;
				}
				// otherwise no page was found on a legit branch, inform user or ask if they want to branch edit
				else {
					self.ask_for_edit = true;
					self.ask_for_edit_page_id = param_page;
					self.ask_for_edit_option_id = param_option;
				}
			},
			// fail
			function(err) {
				console.log("read_page call in read controller failed with: ", err);
				return $q.reject(err);
			}
		);
	}
	
	
	self.turn_page = function(page_id, option_id) {
		console.log("turn_page called with page_id: ", page_id, "and option_id: ", option_id);
		if (page_id) {
			$location.search({story: self.current.story._id, page: page_id, option: option_id});
			/*
			console.log("doing it");
			$location.search({story: self.current.story._id, page: page_id});
			self.pages.read_page(self.current.story._id, page_id).then(
				// success
				function(payload) {
					console.log("payload: ", payload);
					if (payload.page_found) {
						var page = self.pages.create_loaded_page(payload.page);
						payload.options.map(function(opt) {
							self.pages.create_loaded_option(opt);
						});
						self.current.page = page;
					}
					else {
						// placeholder blank page here
						console.log("page not found");
						self.ask_for_edit = true;
						self.ask_for_edit_page_id = page_id;
						self.ask_for_edit_option_id = option_id;
					}
				}, 
				// fail
				function(err) {
					console.log("read_page call in turn_page failed with: ", err);
				}
			);
			*/
		}
		else {
			console.log("no page_id in turn_page");
		}
	};
	
	// not using
	self.branch_edit_page = function(story_id, page_id) {
		$location.path("/pages").search({mode: "branch_edit", page: page_id});
	};
	
	// this one
	self.branch_edit_option = function(story_id, option_id) {
		self.pages.branch_edit_option(self.current.story._id, option_id).then(
			// success
			function(option) {
				var ancestor_path = null;
				//if (option.parent_page && ! option.parent_page.first) { // think through which way this should be
				if (option.parent_page) {
					console.log("here");
					ancestor_path = option.parent_page.ancestor_path;
				}
				console.log("option:", option);
				$location.path("/pages").search({mode: "branch_edit", new_page: option.target_page, source_page: option.page_id, parent_ancestor_path: ancestor_path, option: option._id});
			},
			// fail
			function(result) {
				console.log("pages.branch_edit_option call in venture_page_ctrl failed with: ", result);
				if (result.message === "lock refused") {
					console.log("lock was refused");
					self.branch_edit_message = "Somebody else is already writing something new here. Check back later to read it.";
					self.branch_edit_fail = "lock refused";
				}
				else {
					console.log("error: ", result.err);
					self.branch_edit_message = "There was an error -- please refresh your browser or try again later.";
					self.branch_edit_fail = "error";
				}
			}
		);
		
		
	};
}
angular.module("app").controller("venture_read_ctrl", ["users", "pages", "current", "$q", "$location", "$routeParams", "$rootScope", "$route", venture_read_ctrl]);
angular.module("app").component("ventureRead", {
	bindings: {}
	, controller: ["users", "pages", "current", "$q", "$location", "$routeParams", "$rootScope", "$route", venture_read_ctrl]
	, controllerAs: "v_read"
	, templateUrl: "html/templates/venture_read.html"
});