// stories
function venture_story_ctrl(users, pages, current, $location) {
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
	self.story_mode = "view"; // choices are "edit" or "view", both apply to editor panel in 'my stories' mode
	
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
			self.story_mode = "edit";
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
				self.story_mode = "view";
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
	
	self.read_story = function(story) {
		var id = story || self.current.story._id;
		$location.path("/read").search({story: id});
	};
	
	// choices are 'edit' or 'view'
	self.set_story_mode = function(mode) {
		self.story_mode = mode;
	};
	
	self.clear_current = function() {
		self.current.story = null;
	};
	
	self.exit_edit = function() {
		self.story_mode = "view";
	};
	
	// init and load
	self.pages.clear_data();
	self.current.story = null;
	self.pages.get_all_stories(self.user_mode);
	
	console.log("venture_story_ctrl called");
}
angular.module("app").controller("venture_story_ctrl", ["users", "pages", "current", "$location", venture_story_ctrl]);
angular.module("app").component("ventureStory", {
	bindings: {}
	, controller: ["users", "pages", "current", "$location", venture_story_ctrl]
	, controllerAs: "v_story"
	, templateUrl: "html/templates/venture_story.html"
});

// try this
angular.module("app").component("ventureStoryUser", {
	bindings: {}
	, controller: ["users", "pages", "current", "$location", venture_story_ctrl]
	, controllerAs: "v_story"
	, templateUrl: "html/templates/venture_story_user.html"
});