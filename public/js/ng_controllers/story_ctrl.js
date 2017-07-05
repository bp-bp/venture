// stories
function venture_story_ctrl(users, pages, current, $location, $routeParams) {
	var self = this;
	self.users = users;
	self.pages = pages;
	self.current = current;
	
	// detect whether we're in "all stories" or "my stories" mode
	self.user_mode = null;
	if ($location.path() === "/stories/user") {
		self.user_mode = "for_edit";
	}
	else if ($location.path() === "/stories") {
		self.user_mode = "for_view";
	}
	
	// some ui stuff
	self.message = null;
	//self.story_mode = "view"; // choices are "edit" or "view", both apply to editor panel in 'my stories' mode
	
	// display text for _public_edit and _public_view properties
	self.public_edit_display = function(bool) {
		if (bool) {
			return "This story can be added to by anyone while reading, but you can no longer edit pages that already exist.";
		}
		else {
			return "You can edit any page in this story, but other users cannot add to it while reading.";
		}
	};
	
	self.public_view_display = function(bool) {
		if (bool) {
			return "This story can be read by anyone."
		}
		else {
			return "This story is private -- only you can see it."
		}
	};
	
	// story management/service interaction functions
	self.create_new_story = function() {
		if (self.users.logged_in()) {
			var new_story = self.pages.create_new_story({created_by: self.users.user._id});
			self.current.story = new_story;
		}
	};
	
	self.save_current_story = function() {
		if (! self.current.story) {
			return;
		}
		var to_save = [self.current.story];
		self.pages.save_stories(to_save).then(
			// success
			function() {
			},
			// fail
			function(err) {
				self.message = err;
			}
		);
	};
	
	self.edit_pages = function() {
		$location.path("/pages");
	};
	
	self.select_story = function(story) {
		self.current.story = story;
		$location.search({story: self.current.story._id});
	};
	
	self.read_story = function(story) {
		var id = story._id || self.current.story._id;
		$location.path("/read").search({story: id});
	};
	
	self.clear_current = function() {
		self.current.story = null;
	};
	
	// init and load
	// currently not working... committed to reloading everything when switching pages, just load all and set current story to story specified
	var param_story = $routeParams.story || null;
	self.pages.clear_data();
	self.current.story = null;
	self.pages.get_all_stories(self.user_mode).then(
		// success
		function() {
			// set current story if it was specified in query
			if (param_story) {
				self.current.story = self.pages.find_story(param_story);
			}
		}
	);
}
// for browsing all public stories
angular.module("app").controller("venture_story_ctrl", ["users", "pages", "current", "$location", "$routeParams", venture_story_ctrl]);
angular.module("app").component("ventureStory", {
	bindings: {}
	, controller: ["users", "pages", "current", "$location", "$routeParams", venture_story_ctrl]
	, controllerAs: "v_story"
	, templateUrl: "html/templates/venture_story.html"
});

// for editing user's own stories
angular.module("app").component("ventureStoryUser", {
	bindings: {}
	, controller: ["users", "pages", "current", "$location", "$routeParams", venture_story_ctrl]
	, controllerAs: "v_story"
	, templateUrl: "html/templates/venture_story_user.html"
});