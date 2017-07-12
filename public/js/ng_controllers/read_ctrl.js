function venture_read_ctrl(users, pages, current, $q, $location, $state, $rootScope) {
	console.log("**********loading read controller**********");
	var self = this;
	self.users = users;
	self.pages = pages;
	self.current = current;
	
	//********** handle our parameters **********//
	self.this_story = null;
	self.this_page = null;
	self.source_option = null;
	self.need_story = false;
	
	self.init_params = function() {
		//*** story ***//
		// if there's a story id in the url 
		if ($state.params.story) {
			self.this_story = $state.params.story;
		}
		// otherwise look to see if there's a current story loaded
		else {
			// set it to the id of the current story
			if (self.current.story) {
				$location.search({story: self.current.story._id});
				self.this_story = self.current.story._id;
			}
			// if there's no current.story, AND there's no story in the url, send user back to the stories list
			else {
				console.log("redirecting");
				$location.path("/stories");
				return;
			}
		}
		// finally check to see if our story is loaded
		if (! self.current.story) {
			self.need_story = true;
		}

		//*** page ***//
		// if there's a page id in the url
		if ($state.params.page) {
			self.this_page = $state.params.page;
		}
		// otherwise self.this_page is null, we'll load the first page from the current story
		else {
			self.this_page = null;
		}

		//*** option ***//
		// param_option only gets set one way -- grab it from routeParams if it exists
		self.source_option = $state.params.option || null;
	};
	
	self.load_from_params = function() {
		//********** load everything up **********//
	
		// first clear everything and load fresh -- is this necessary?
		//self.pages.prep_for_read();

		var story_prom;

		// if there's no story loaded, set up to get one
		if (self.need_story) {
			story_prom = function() {
				return self.pages.get_story(self.this_story).then(
					function(story) {
						//console.log("setting current story");
						self.current.story = story;
						return story;
					}
				).catch(
					function(err) {
						console.log("error from story_prom: ", err);
						return $q.reject(err);
					}
				);
			};
		}
		else {
			story_prom = function() {
				return $q.when(self.current.story);
			};
		}

		// now the page we're reading
		var page_prom = function() {
			//console.log("self.current.story: ", self.current.story);
			return self.pages.read_page(self.current.story._id, self.this_page).catch(
				function(err) {
					console.log("error from page_prom: ", err);
					return $q.reject(err);
				}
			);
		};

		// now make it go
		story_prom().then(page_prom).then(
			function(payload) {
				// if we found a page
				if (payload.page_found) {
					self.current.page = payload.page;
					// make sure our params are all set 
					$location.search({story: self.current.story._id, page: payload.page._id, option: payload.page.source_option});
					
				}
				// if we were trying to find the first page in the story but found nothing, the story is empty
				else if (payload.sought_first) {
					self.empty_story = true;
				}
				// otherwise we found no page on a legit branch, ask if the user wants to branch edit
				else {
					// insert stuff here
				}
			}
		).catch(
			function(err) {
				console.log("error loading data for read_page: ", err);
			}
		);
	};
	
	self.init_params();
	self.load_from_params();
	
	
	self.turn_page = function(page_id, option_id) {
		console.log("turn_page called with page_id: ", page_id, "and option_id: ", option_id);
		if (page_id) {
			$location.search({story: self.current.story._id, page: page_id, option: option_id});
			//self.$route.reload(); // replace
		}
		else {
			console.log("no page_id in turn_page");
		}
	};
	
}

// read
function xventure_read_ctrl(users, pages, current, $q, $location, $rootScope, $route, $routeParams) {
	console.log("**********loading read controller**********");
	var self = this;
	self.users = users;
	self.pages = pages;
	self.current = current;
	var stop_loading = false;
	
	console.log("self.current.story: ", self.current.story);
	console.log("self.current.page: ", self.current.page);
	console.log("$state.params: ", $state.params.current.params.story, $state.params.current.params.page);
	
	if (	self.current.story 
			&& self.current.story._id === $state.params.current.params.story
			&& self.current.page
			&& self.current.page._id === $state.params.current.params.page) {
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
		if (! $state.params.current.params.story) {
			console.log("no story passed");
			// if there's no current story either there's nothing we can do here
			if (! self.current.story) {
				// we should maybe redirect back to /stories
				return;
			}
			param_story = self.current.story._id;
			//$location.search({story: param_story});
			console.log("$state.params here is: ", $state.params);
		}
		else {
			param_story = $state.params.current.params.story;
		}

		// now if there's no page in the url, we'll load the first one from the story -- set param_page to null for now
		if (! $state.params.current.params.page) {
			console.log("no page passed");
			param_page = null;
		}
		// otherwise set param_page from the route
		else {
			param_page = $state.params.current.params.page;
		}
		
		// param_option only goes one way -- grab it from routeParams if it exists
		param_option = $state.params.current.params.option || null;

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
					/*var i, page = self.pages.create_loaded_page(payload.page);
					payload.options.map(function(opt) {
						self.pages.create_loaded_option(opt);
					});
					self.current.page = page;*/
					console.log("we got a page");
					self.current.page = payload.page;
					$location.search({story: param_story, page: payload.page._id, option: $state.params.current.params.option});
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
		}
		else {
			console.log("no page_id in turn_page");
		}
	};
	
	
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
angular.module("app").controller("venture_read_ctrl", ["users", "pages", "current", "$q", "$location", "$state", "$rootScope", venture_read_ctrl]);
angular.module("app").component("ventureRead", {
	bindings: {}
	, controller: ["users", "pages", "current", "$q", "$location", "$state", "$rootScope", venture_read_ctrl]
	, controllerAs: "v_read"
	, templateUrl: "html/templates/venture_read.html"
});