// pages
function venture_page_ctrl(users, pages, current, $location, $routeParams, $interval) {
	var self = this;
	self.users = users;
	self.pages = pages;
	self.current = current;
	
	// some ui stuff
	self.message = null;
	self.pages.clear_data();
	
	self.populate_pages = function() {
		// if we're editing a whole story
		if (self.mode === "story_edit") {
			self.pages.load_pages_for_story(self.current.story).then(
				// success
				// pages (if there were any) were created up in the pages service after loading
				// all we get here is a boolean that tells us whether any pages were loaded
				// so we can create a new one if there weren't any
				function(got_pages) {
					if (! got_pages) {
						self.current.page = self.pages.create_new_page({story_id: self.current.story._id, first: true});
					}
					else {
						self.current.page = self.pages.pages[0];
					}
				},
				// fail
				function(err) {
					console.log("load_pages_for_story failed in venture_page_ctrl with: ", err);
				}
			);
		}
		// or if we're doing a branch edit
		else if (self.mode === "branch_edit") {
			var new_page = self.pages.create_new_page({	story_id: self.current.story._id
														, _id: self.branch_edit_new_page
														, parent_ancestor_path: self.branch_edit_parent_ancestor_path
														, no_list_refresh: true});
			self.current.page = new_page;
			self.pages.root_page = new_page;
			self.pages.refresh_sorted_page_list();
		}
	};
	
	self.renew_branch_edit_option_lock = function() {
		self.pages.renew_option_lock(self.current.story._id, self.branch_edit_option).then(
			// success
			function(payload) {
				console.log("renew option lock success: ", payload);
			}, 
			// fail
			function(payload) {
				console.log("renew option lock failed: ", payload);
			}
		);
	};
	
	self.exit_edit = function() {
		if (self.mode === "branch_edit") {
			self.current.stop_renewing_locks();
			self.pages.unlock_option(self.current.story._id, self.branch_edit_option);
			$location.path("/read").search({story: self.current.story._id, page: self.branch_edit_source_page});
		}
		else if (self.mode === "story_edit") {
			$location.path("/stories/user").search({story: self.current.story._id});;
		}
	};
	
	// story management/service interaction functions
	self.create_new_story = function() {
		if (self.users.logged_in()) {
			var new_story = self.pages.create_new_story({created_by: self.users.user._id});
			self.current.story = new_story;
		}
	};
	
	self.read_story = function(story) {
		var id = story || self.current.story._id;
		$location.path("/read").search({story: id});
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
	
	// ui display stuff
	self.page_margin = function(lvl) {
		lvl = lvl || 0;
		var style = lvl.toString() + "rem";
		return style;
	};
	
	self.toggle_collapsed = function(page) {
		page.ui.cx_collapsed = !page.ui.cx_collapsed;
		self.pages.refresh_sorted_page_list();
	};
	
	self.any_child_pages_do_not_exist = function(page) {
		var cx = page.get_child_pages();
		if (cx.length != page.option_ids.length) {
			return true;
		}
		return false;
	};
	
	// test
	self.test_get_descendants = function(option_id) {
		console.log("test_get_descendants");
		self.pages.get_option_descendants(option_id);
	};
	
	// delete stuff
	self.delete_page = function(page) {
		var page_id = page._id;
		
		self.pages.get_page_descendants(page_id).then(
			// success
			function(results) {
				// remember that the pages and options we get from this call
				// are not getting built into actual Pages, just data containers
				self.current.popup_data.popup_type = "delete_page";
				self.current.popup_data.page_to_delete = page_id;
				self.current.popup_data.pages = results.pages;
				//self.current.popup_data.options = results.options;
				self.current.popup_data.confirm_callback = self.finish_delete_page;
				self.current.popup_visible = true;
			},
			// fail
			function(err) {
				console.log("error returned from pages.get_page_descendants: ", err);
			}
		);
	};
	
	self.delete_option = function(option) {
		// some checks on this?
		var option_id = option._id;
		
		self.pages.get_option_descendants(option_id).then(
			// success
			function(results) {
				// remember that the pages and options we get from this
				// are not getting built into actual Pages, just data containers
				self.current.popup_data.popup_type = "delete_option";
				self.current.popup_data.option_to_delete = option_id;
				self.current.popup_data.pages = results.pages;
				//self.current.popup_data.options = results.options;
				self.current.popup_data.confirm_callback = self.finish_delete_option;
				self.current.popup_visible = true;
			}, 
			// fail
			function(err) {
				console.log("error returned from pages.get_option_descendants: ", err);
			}
		);
	};
	
	// called from popup
	self.finish_delete_option = function() {
		self.pages.delete_option(self.current.popup_data.option_to_delete).then(
			// success
			function(payload) {
				console.log("delete success");
				self.current.popup_init();
				self.pages.clear_data();
				self.populate_pages();
			}, 
			// fail
			function(err) {
				console.log("pages.delete_option call in page_ctrl.finish_delete_option failed with: ", err);
				
			}
		);
	};
	
	// called from popup
	self.finish_delete_page = function() {
		self.pages.delete_page(self.current.popup_data.page_to_delete).then(
			// success
			function(payload) {
				console.log("delete success");
				self.current.popup_init();
				self.pages.clear_data();
				self.populate_pages();
			},
			// fail
			function(err) {
				console.log("pages.delete_page call in page_ctrl.finish_delete_page failed with: ", err);
			}
		);
	};
	
	// its own function in case we want to do something in the controller here
	self.save_all_pages = function() {
		self.pages.save_all()
	};
	
	// do our initial setup
	// if we've launched this as a branch edit rather than whole-story edit
	if ($routeParams.mode && $routeParams.mode === "branch_edit" && $routeParams.new_page && $routeParams.option) {
		self.mode = "branch_edit";
		self.branch_edit_option = $routeParams.option;
		self.branch_edit_new_page = $routeParams.new_page;
		self.branch_edit_source_page = $routeParams.source_page;
		self.branch_edit_parent_ancestor_path = $routeParams.parent_ancestor_path;
		// so we'll keep our option locked for editing -- delay set to 5 sec for testing
		// temporarily commented out!!!!
		//self.current.branch_edit_option_lock = $interval(self.renew_branch_edit_option_lock, 5000);
	}
	else {
		self.mode = "story_edit";
	}
	
	if (! self.pages.page && self.current.story) {
		self.populate_pages();
	}
}
angular.module("app").controller("venture_page_ctrl", ["users", "pages", "current", "$location", "$routeParams", "$interval", venture_page_ctrl]);
angular.module("app").component("venturePages", {
	bindings: {}
	, controller: ["users", "pages", "current", "$location", "$routeParams", "$interval", venture_page_ctrl]
	, controllerAs: "v_page"
	, templateUrl: "html/templates/venture_page.html"
});