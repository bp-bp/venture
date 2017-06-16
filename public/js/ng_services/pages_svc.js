angular.module("app").service("pages", ["$resource", "$q", "$http", "id", function($resource, $q, $http, id) {
	this.stories = [];
	this.pages = [];
	this.sorted_page_list = []; // sorted by position in tree, used in ui display
	this.root_page = null;
	this.options = []; // am i using this still?
	this.thing = "hiya there";
	this.id = id;
	this.$q = $q;
	var srv = this;
	
	this.stories_rsc = $resource( 	"/stories/:story/?for_edit=:for_edit"
									//, {get: {isArray: true}}
									, {story: "@story"}
								);
	
	// specifying a different url for delete action is not working, seems to be using default url
	this.rsc = $resource(	"/pages/:page/?first=:first"
								, {page: "@page", first: "@first"}
								, {	update: {method: "PUT", isArray: true} 
									, delete: {url: "/pages/:page/options/:option", method: "DELETE", page: "@page", option: "@option"}}
								);
	
	this.pages_rsc = $resource( 	"/pages/:page/?story=:story"
									, {page: "@page", story: "@story"}
									, {update: {method: "PUT", isArray: true}
										, delete: {url: "/pages/:page/options/:option", method: "DELETE", page: "@page", option: "@option"}}
								);
								
	this.read_rsc = $resource( 		"/read/:story/:page"
									, {story: "@story", page: "@page"});
	
	// not using this?
	this.get_page_lock = function(page_id) {
		return $http.get("/page_lock/" + page_id).then(
			// success
			function(payload) {
				console.log("get_page_lock success, got: ", payload);
			}, 
			// fail
			function(err) {
				console.log("get_page_lock failed with: ", err);
			}
		);
	};
	
	// def not using this
	this.branch_edit_page = function(story_id, page_id) {
		return $http.get("/branch_edit/" + story_id + "/" + page_id).then(
			// success
			function(payload) {
				console.log("branch_edit_page success, got: ", payload);
				return payload;
			}, 
			// fail
			function(err) {
				console.log("branch_edit_page failed with: ", err);
				throw new Error(err);
			}
		);
	};
	
	this.branch_edit_option = function(story_id, option_id) {
		return $http.get("/branch_edit/" + story_id + "/" + option_id).then(
			// success
			function(payload) {
				console.log("branch_edit_option returned, got: ", payload);
				// check if we got a page, if not reject
				if (payload.data.option) {
					var option = payload.data.option;
					option.parent_page = payload.data.parent_page;
					option.page_id = option.parent_page._id;
					return option;
				}
				else {
					return $q.reject({message: "lock refused", err: null});
				}
			},
			// fail
			function(err) {
				console.log("branch_edit_option failed with: ", err);
				//throw new Error(err);
				return $q.reject({message: "error", err: err});
			}
		);
	};
	
	this.renew_option_lock = function(story_id, option_id) {
		return $http.get("/renew_option_lock/" + story_id + "/" + option_id).then(
			// success
			function(payload) {
				return payload;
			},
			// fail
			function(payload) {
				return $q.reject(payload);
			}
		);
	};
	
	this.unlock_option = function(story_id, option_id) {
		return $http.get("/unlock_option/" + story_id + "/" + option_id).then(
			// success
			function(payload) {
				return payload;
			},
			// fail
			function(payload) {
				return $q.reject(payload);
			}
		);
	};
	
	this.read_page = function(story_id, page_id) {
		return this.read_rsc.get({story: story_id, page: page_id}).$promise.then(
			// success
			function(payload) {
				console.log("pages service read_page success, returned: ", payload);
				return payload;
			},
			// fail
			function(err) {
				console.log("pages service read_page failed with: ", err);
				return $q.reject(err);
			}
		);
	};
	
	this.get_story = function(story_id) {
		console.log("get_story called with: ", story_id);
		return this.stories_rsc.get({story: story_id}).$promise.then(
			// sucess
			function(payload) {
				console.log("get_story success");
				console.log("got: ", payload);
				return payload;
			},
			// fail
			function(err) {
				console.log("get_story failed with: ", err);
				return $q.reject(err);
			}
		);
	};
	
	this.get_all_stories = function(user_mode) {
		var for_edit = false;
		if (user_mode === "for_edit") {
			for_edit = true;
		}
		return this.stories_rsc.get({for_edit: for_edit}).$promise.then(
			// success
			function(payload) {
				var stories = payload.stories;
				var i, s;
				for (i = 0; i < stories.length; i++) {
					s = new srv.Story(stories[i]);
					srv.stories.push(s);
				}
				
			}, 
			// fail
			function(err) {
				console.log("get_all_stories failed with: ", err);
				return $q.reject(err);
			}
		);
	};
	
	// I think we're only ever going to do one at a time here...
	this.save_stories = function(_stories) {
		var stories = (_stories.constructor === Array) ? _stories : [_stories];
		var i, mod = [], new_ones = [];
		for (i = 0; i < stories.length; i++) {
			if (stories[i].is_new) {
				new_ones.push(stories[i]);
			}
			else if (stories[i].modified) {
				mod.push(stories[i]);
			}
		}
		
		return this.stories_rsc.save({stories: {new_ones: new_ones, mod: mod}}).$promise.then(
			// success
			function(res) {
				console.log("save_stories success");
				console.log("res: ", res);
				var i;
				for (i = 0; i < stories.length; i++) {
					stories[i].is_new = false;
					stories[i].modified = false;
				}
				return res;
			},
			// fail
			function(err) {
				console.log("save_stories failed with: ", err);
				return $q.reject(err);
			}
		);
	};
	
	this.get_page_descendants = function(page_id) {
		console.log("get_page_descendants called with: ", page_id);
		return $http.get("/get_descendants/page/" + page_id).then(
			// success
			function(payload) {
				console.log("get_page_descendants success, got: ", payload);
				return payload.data.results;
			},
			// fail
			function(err) {
				console.log("get_page_descendants failed with: ", err);
				return $q.reject(err);
			}
		);
	};
	
	this.get_option_descendants = function(option_id) {
		return $http.get("/get_descendants/option/" + option_id).then(
			// success
			function(payload) {
				console.log("get_option_descendants success, got: ", payload);
				return payload.data.results;
			}, 
			// fail
			function(err) {
				console.log("get_option_descendants failed with: ", err);
				return $q.reject(err);
			}
		);
	};
	
	this.tree_rsc = $resource( 	"/trees/:root_id"
								, {root_id: "@root_id"}
								);
	
	this.clear_data = function() {
		console.log("clearing pages data");
		this.pages = [];
		this.root_page = null;
		this.options = [];
		this.stories = [];
	};
	
	// note that these are the same, clean up
	this.prep_for_read = function() {
		//console.log("clearing pages and options, retaining story");
		// losing story too
		this.pages = [];
		this.root_page = null;
		this.options = [];
		this.stories = [];
	};
	
	this.prep_for_branch_edit = function() {
		this.pages = [];
		this.root_page = null;
		this.options = [];
		this.stories = [];
	};
	
	this.clear_data = function() {
		this.pages = [];
		this.root_page = null;
		this.options = [];
		this.stories = [];
	};
	
	// using this?
	this.get_page = function(obj) {
		console.log("getting a page");
		console.log("id: ", obj.id);
		return this.rsc.get({page: obj.id}).$promise.then(
			// success
			function(payload) {
				console.log("payload: ", payload);
				var results = JSON.parse(JSON.stringify(payload));
				var pages = results.pages, options = results.options;
				var gotten_page = (pages.length === 0) ? null : pages[0];
				
				if (gotten_page) {
					if (obj.replace_data) {
						srv.clear_data();
					}
					gotten_page = new srv.Page(gotten_page);
					srv.pages.push(gotten_page);
				}
				
				if (options.length > 0) {
					srv.options = srv.options.concat(options);
				}
				
				return gotten_page;
			},
			// fail
			function(err) {
				console.log("get page failed");
				console.log(err);
				return err;
			}
		);
	};
	
	this.delete_option = function(option_id) {
		return this.pages_rsc.delete({page: "null", option: option_id}).$promise.then(
			// success
			function(payload) {
				console.log("pages.delete_options success, got: ", payload);
				return payload;
			},
			// fail
			function(err) {
				console.log("pages.delete_option failed with: ", err);
				return $q.reject(err);
			}
		);
	};
	
	this.delete_page = function(page_id) {
		return this.pages_rsc.delete({page: page_id, option: "null"}).$promise.then(
			// success
			function(payload) {
				console.log("pages.delete_page success, got: ", payload);
				return payload;
			},
			// fail
			function(err) {
				console.log("pages.delete_page failed with: ", err);
				return $q.reject(err);
			}
		);
	};
	
	// we checked for child pages below, but we're only sending the option to delete
	// we'll check again and decide what to delete on the server in case there's a front/backend mismatch for some reason
	// cx_ind is a boolean, if true then children are present and 
	// we'll need to reload whole tree after delete is finished
	this.xdelete_option = function(opt, cx_ind) {
		console.log("delete_option called");
		// only sending one option at a time
		var send_obj = {page: "hi", option: opt._id};
		
		// no need for this... do it on backend
		function clean_up_parent(payload) {
			console.log("got this: ", payload);
			// now that option and its children are deleted on backend, remove the deleted option's id
			// from parent page's option_ids array
			var parent_page = opt.get_parent_page(), i;
			for (i = 0; i < parent_page.option_ids.length; i++) {
				if (opt._id === parent_page.option_ids[i]) {
					parent_page.option_ids.splice(i, 1);
				}
			}
		}
		
		return this.rsc.delete(send_obj).$promise.then(
			// success
			function(payload) {
				console.log("delete option success");
				console.log(payload);
				return payload;
			},
			// fail
			function(err) {
				console.log("pages.delete_option failed with: ", err);
				return err;
			}
		);
	};
	
	this.create_loaded_page = function(loaded) {
		var init_obj = {};
		
		init_obj._id = loaded._id;
		init_obj.first = loaded.first;
		init_obj.is_new = false;
		init_obj._title = loaded._title;
		init_obj._text = loaded._text;
		init_obj.source_option = loaded.source_option;
		init_obj.created_by_user = loaded.created_by_user;
		init_obj.story_id = loaded.story_id;
		init_obj.option_ids = loaded.option_ids;
		init_obj.short_id = loaded.short_id;
		init_obj.ancestor_path = loaded.ancestor_path;
		init_obj.root_id = loaded.root_id;

		init_obj.loaded = true;
		init_obj.modified = false;
		
		var page = new this.Page(init_obj);
		
		this.pages.push(page);

		if (init_obj.first) {
			this.root_page = this.pages[this.pages.length - 1];
		}
		
		return page;
	};
	
	this.create_loaded_option = function(loaded) {
		var init_obj = {};
		
		init_obj._id = loaded._id;
		init_obj.is_new = false;
		init_obj._text = loaded._text;
		init_obj.page_id = loaded.page_id;
		init_obj.story_id = loaded.story_id;
		init_obj.target_page = loaded.target_page;

		init_obj.loaded = true;
		init_obj.modified = false;
		
		var option = new this.Option(init_obj);
		
		this.options.push(option);
		
		return option;
	};
	
	this.load_pages_for_story = function(story) {
		var story_id = story._id;
		
		return this.pages_rsc.get({story: story_id}).$promise.then(
			// success
			function(payload) {
				console.log("load_pages_for_story in pages service returned: ", payload);
				
				var loaded_pages = payload.results.pages;
				var loaded_options = payload.results.options;
				var i, init_obj;
				
				// returns true (received pages) or false (did not receive any pages), check for false here
				if (! loaded_pages.length) {
					return false;
				}
				
				// build our pages
				for (i = 0; i < loaded_pages.length; i++) {
					srv.create_loaded_page(loaded_pages[i]);
				}
				
				// now options
				for (i = 0; i < loaded_options.length; i++) {
					srv.create_loaded_option(loaded_options[i]);
				}
				
				srv.refresh_sorted_page_list();
				
				return true;
				
			},
			// fail
			function(err) {
				console.log("load_pages_for_story in pages service failed with: ", err);
				return $q.reject(err);
			}
		);
	}
	
	this.save_page = function(_pages) {
		console.log("save_page called");
		console.log("_pages: ", _pages);
		var pages = (_pages.constructor === Array) ? _pages : [_pages];
		console.log("pages: ", pages);
		var i, options = [];
		for (i = 0; i < pages.length; i++) {
			options = options.concat(pages[i].get_options());
		}
		
		console.log("options: ", options);
		
		// fix here for multiple pages
		var send_obj = {pages: pages, options: options};
		return this.pages_rsc.save(send_obj).$promise.then(
			// success
			function(payload) {
				console.log("save page success");
				console.log(payload);
				return payload;
			},
			// fail
			function(payload) {
				console.log("save page fail");
				console.log(payload);
				return payload;
			}
		);
	};
	
	this.update_page = function(_pages) {
		console.log("update_page called");
		var pages = (_pages.constructor === Array) ? _pages : [_pages];
		console.log("pages: ", pages);
		var i, options = [];
		for (i = 0; i < pages.length; i++) {
			options = options.concat(pages[i].get_options());
		}
		
		var send_obj = {pages: pages, options: options};
		return this.pages_rsc.update(send_obj).$promise.then(
			// success
			function(payload) {
				console.log("update_page success");
				console.log(payload);
				return payload;
			},
			// fail
			function(err) {
				console.log("update_page failed with ", err);
				$q.reject(err);
			}
		);
	};
	
	this.save_all = function() {
		var i, send_obj = {}, p_to_save = [], p_to_update = [], o_to_save = [], o_to_update = [];
		// split all our pages into to_save/to_update
		for (i = 0; i < this.pages.length; i++) {
			if (this.pages[i].is_new) {
				p_to_save.push(this.pages[i]);
			}
			else if (this.pages[i].modified) {
				p_to_update.push(this.pages[i]);
			}
		}
		
		// same deal with options
		for (i = 0; i < this.options.length; i++) {
			if (this.options[i].is_new) {
				o_to_save.push(this.options[i]);
			}
			else if (this.options[i].modified) {
				o_to_update.push(this.options[i]);
			}
		}
		
		send_obj = {pages: {to_save: p_to_save, to_update: p_to_update}, options: {to_save: o_to_save, to_update: o_to_update}};
		
		// to use on success
		function demodify(itm) {
			itm.is_new = false;
			itm.modified = false;
		}
		
		// send to server
		return this.pages_rsc.save(send_obj).$promise.then(
			// success
			function(payload) {
				console.log("save_all success");
				console.log(payload);
				send_obj.pages.to_save.map(demodify);
				send_obj.pages.to_update.map(demodify);
				send_obj.options.to_save.map(demodify);
				send_obj.options.to_update.map(demodify);
				return payload;
			},
			// fail
			function(err) {
				console.log("save_all in pages service failed with: ", err);
				return $q.reject(err);
			}
		);
	};
	this.create_new_page = function(init) {
		init.is_new = true;
		var page = new this.Page(init);
		if (this.pages.length === 0) {
			this.root_page = page;
		}
		this.pages.push(page);
		return page;
	};
	
	this.Story = function(init) {
		var that = this;
		this.type = "story";
		this.is_new = init.hasOwnProperty("is_new") ? init.is_new : false;
		this._title = init._title || null;
		this._description = init._description || null;
		
		this.created_by = init.created_by_username || null;
		this.my_story = init.own_story || false;
		this._public_view = init._public_view || false; // default these to false?
		this._public_edit = init._public_edit || false; // default these to false?
		
		//this._id = init.hasOwnProperty("_id") ? init._id : srv.id.gen_id();
		this.page_ids = init.page_ids || []; // do I need this, or am I good with pages having a story_id field?
		if (this.is_new) {
			this.modified = true;
		}
		else {
			this.modified = init.hasOwnProperty("modified") ? init.modified : false;
		}
		
		this._id = null;
		if (init.hasOwnProperty("_id")) {
			this._id = init._id;
		}
		else {
			srv.id.gen_id().then(
				// success
				function(id) {
					that._id = id;
				},
				// fail
				function(err) {
					console.log("could not gen id for new User: ", err);
				}
			);
		}
		
	};
	
	// getter setters
	this.Story.prototype.title = function(val) {
		if (val != undefined) {
			this._title = val;
			this.modified = true;
		}
		return this._title;
	};
	
	this.Story.prototype.description = function(val) {
		if (val != undefined) {
			this._description = val;
			this.modified = true;
		}
		return this._description;
	};
	
	this.Story.prototype.public_view = function(val) {
		if (val != undefined) {
			this._public_view = val;
			this.modified = true;
		}
		return this._public_view;
	};
	
	this.Story.prototype.public_edit = function(val) {
		if (val != undefined) {
			this._public_edit = val;
			this.modified = true;
		}
		return this._public_edit;
	};
	
	// utiilities
	this.Story.prototype.get_pages = function() {
		var i, pg, pages = [];
		for (i = 0; i < this.page_ids.length; i++) {
			pg = this.get_page_from_id(this.page_ids[i]);
			pages.push(pg);
		}
		return pages;
	};
	
	this.Story.prototype.disp_title = function() {
		return this._title ? this._title : "Untitled Story";
	};
	
	this.Story.prototype.disp_description = function() {
		return this._description ? this._description : "...";
	};
	
	/*this.Story.prototype.created_by = function(user_id) {
		if (this.
	};*/
	
	// created_by should already be on init obj
	this.create_new_story = function(init) {
		init.is_new = true;
		init.own_story = true;
		var story = new this.Story(init);
		this.stories.push(story);
		return story;
	};
	
	this.Page = function(init) {
		//console.log("init: ", init);
		var that = this;
		this.type = "page";
		this.first = init.hasOwnProperty("first") ? init.first : false;
		this.is_new = init.hasOwnProperty("is_new") ? init.is_new : false;
		this._title = init._title || null;
		this._text = init._text || null;
		this.source_option = init.source_option || null;
		this.created_by_user = init.created_by_user || null; // should always be filled in -- not yet implemented
		this.story_id = init.story_id || null; 
		this.option_ids = init.option_ids || [];
		
		this.malformed = false; // set to true if gen_id or get_page_short_id return errors
		this.finished = false; // not gonna use this I think...
		this._ancestor_path_prom = null;
		
		this._id = null;
		if (init.hasOwnProperty("_id")) {
			this._id = init._id;
			// we should not refresh the sorted page list if we're loading data from the server
			// pages/options will get created out of order and the recursive sort will not work
			// if we've created a new page in the hierarchy and everything else is already loaded, however,
			// go ahead and refresh
			// only refresh if we're not building from data loaded from server -- not everything will exist yet
			// think about if we can just test for "is_new" instead?
			if (! init.loaded && ! init.no_list_refresh) {
				srv.refresh_sorted_page_list();
			}
		}
		else{
			srv.id.gen_id().then(
				// success
				function(id) {
					that._id = id;
					that.root_id = that.first ? that._id : root_id;
					srv.refresh_sorted_page_list();
				},
				// fail
				function(err) {
					console.log("could not gen id for new Page, err: ", err);
					that.malformed = true;
				}
			);
		}
		
		this.short_id = null;
		this.short_id_prom = null;
		if (init.hasOwnProperty("short_id")) {
			this.short_id = init.short_id;
			this.short_id_prom = srv.$q.when(this.short_id);
		}
		else {
			this.short_id_prom = srv.id.get_page_short_id(this.story_id).then(
				// success
				function(short_id) {
					that.short_id = short_id;
					return that.short_id;
				},
				// fail
				function(err) {
					// placeholder stuff... need some way of marking a new page as 'malformed' if either this
					// or gen_id fails
					console.log("could not get short_id for new Page, err: ", err);
					that.short_id = null;
					that.malformed = true;
					return $q.reject();
				}
			);
		}
		
		this.ancestor_path = null;
		this.ancestor_path_prom = null;
		this.parent_ancestor_path_prom = null;
		// if ancestor_path was provided on init object, we're good
		if (init.hasOwnProperty("ancestor_path")) {
			this.ancestor_path = init.ancestor_path;
			this.ancestor_path_prom = srv.$q.when(this.ancestor_path);
			//this.ancestor_path_prom = srv.$q.when(this.ancestor_path);
		}
		// if parent ancestor_path was provided on init object, save it and plug it into promise
		if (init.hasOwnProperty("parent_ancestor_path")) {
			this.parent_ancestor_path = init.parent_ancestor_path;
			this.parent_ancestor_path_prom = srv.$q.when(this.parent_ancestor_path);
		}
		// if we're the first page
		else if (this.first) {
			this.parent_ancestor_path_prom = srv.$q.when("");
		}
		// if none of the above and we still need an ancestor_path, we'll need to get it from the parent page
		else if (!this.ancestor_path) {
			console.log("init: ", init);
			var parent_page = this.get_parent_page();
			this.parent_ancestor_path_prom = parent_page.ancestor_path_prom;
		}
		
		// if we still need to build ancestor_path, we need to wait until we've got both our short_id and the parent page's ancestor_path...
		if (! this.ancestor_path) {
			this.ancestor_path_prom = srv.$q.all([this.short_id_prom, this.parent_ancestor_path_prom]).then(
				// success
				function(results) {
					console.log("success in ancestor_path_prom $q.all(), got: ", results);
					console.log("ancestor_path is: ", that.ancestor_path);
					var short_id = results[0];
					var parent_ancestor_path = results[1];

					if (! parent_ancestor_path) {
						that.ancestor_path = short_id;
					}
					else {
						that.ancestor_path = parent_ancestor_path + "_" + short_id;
					}

					console.log("now ancestor_path is: ", that.ancestor_path);
					return that.ancestor_path;

				},
				// fail
				function(err) {
					console.log("something failed in ancestor_path_prom $q.all(): ", err);
					that.malformed = true;
					return $q.reject(err);
				}
			);
		}
		
		// creating a new ancestor_path handled in success callback for short_id
		
		var root_id = init.hasOwnProperty("root_id") ? init.root_id : null;
		//this.root_id = this.first ? this._id : root_id;
		
		// for various ui-related properties not saved to server
		this.ui = {	depth: null
					, cx_collapsed: false
					, collapsed: false
				};
		
		this.modified = init.hasOwnProperty("modified") ? init.modified : true;
	};
	
	this.Page.prototype.ancestor_path_prom = function() {
		// if we're all set
		if (this.ancestor_path || this.first) {
			return $q.resolve(this.ancestor_path);
		}
		// if we don't have our ancestor path yet
		else {
			return this._ancestor_path_prom;
		}
	};
	
	// getters/setters
	this.Page.prototype.title = function(val) {
		if (val != undefined) {
			this._title = val;
			this.modified = true;
		}
		return this._title;
	};
	
	this.Page.prototype.text = function(val) {
		if (val != undefined) {
			this._text = val;
			this.modified = true;
		}
		return this._text;
	};
	
	// display stuff
	this.Page.prototype.disp_title = function() {
		return this._title ? this._title : "Untitled Page";
	};
	
	this.Page.prototype.disp_text = function() {
		return this._text ? this._text : "...";
	};
	
	this.Page.prototype.add_option = function() {
		var init = {page_id: this._id, is_new: true, story_id: this.story_id};
		var option = new srv.Option(init);
		//this.option_ids.push(option._id); // now added in Option's callback from gen_id server call
		srv.options.push(option);
		
		// no, cause we want to be able to define option without actually spawning target
		//option.spawn_target_page();
		this.modified = true;
	};
	
	this.Page.prototype.get_options = function() {
		var i, opt, options = []; 
		for (i = 0; i < this.option_ids.length; i++) {
			opt = srv.get_option_from_id(this.option_ids[i]);
			if (opt) {
				// wtf am i doing here
				//options.push(srv.get_option_from_id(this.option_ids[i]));
				options.push(opt);
			}
		}
		//console.log("got options: ", options);
		return options;
	};
	
	this.Page.prototype.get_parent_page = function() {
		if (! this.source_option) {
			return null;
		}
		var source_option = srv.get_option_from_id(this.source_option);
		if (! source_option) {
			//console.log("couldn't find source option for " + this.title);
			return null;
		}
		//console.log("found source option");
		var parent_page = source_option.get_parent_page();
		return parent_page;
	};
	
	// gets immediate children, not recursive
	this.Page.prototype.get_child_pages = function() {
		var i, page, options = this.get_options(), cx = [];
		//console.log("get_child_pages options: ", options);
		for (i = 0; i < options.length; i++ ) {
			page = srv.get_page_from_id(options[i].target_page);
			if (page) {
				cx.push(page);
			}
		}
		//console.log("child_pages: ", cx);
		//console.log("get_child_pages returning: ", (cx.length > 0) ? cx : null);
		//return (cx.length > 0) ? cx : null;
		//return (cx.length > 0) ? cx : [];
		return cx;
	};
	
	this.Page.prototype.spawn_all_child_pages = function() {
		var i, options = this.get_options();
		for (i = 0; i < options.length; i++) {
			options[i].spawn_target_page();
		}
	};
	
	function pad_zeros(_num, width) {
		var num = _num.toString();
		return num.length >= width ? num : new Array(width - num.length + 1).join("0") + num;
	}
	
	// walk page tree to get sort string for tree view
	this.Page.prototype.set_sort_string = function(_stub, _opt_idx) {
		//var prev_level = _prev_level || 0;
		var stub = _stub || "";
		//var opt_idx = _opt_idx || 1;
		var opt_idx = angular.isDefined(_opt_idx) ? _opt_idx + 1 : 1;
		//console.log("_stub: ", _stub);
		//console.log("_opt_idx: ", _opt_idx);
		
		//prev_level += 1;
		var sort_string = stub ? _stub + "_" + pad_zeros(opt_idx, 5) : pad_zeros(opt_idx, 5);
		this.sort_string = sort_string;
		var i;
		for (i = 0; i < this.option_ids.length; i++) {
			var opt_target_page = srv.get_option_from_id(this.option_ids[i]).get_target_page();
			if (opt_target_page) {
				opt_target_page.set_sort_string(this.sort_string, i);
			}
		}
	};
	
	this.Page.prototype.pass_up_cx = function(lvl, parent_collapsed) {
		console.log("pass_up_cx");
		var arr = [], i, me = this, cx = this.get_child_pages();
		lvl += 1;
		this.ui.depth = lvl;
		if (parent_collapsed) {
			this.ui.collapsed = true;
		}
		else {
			this.ui.collapsed = false;
			parent_collapsed = this.ui.cx_collapsed;
		}
		
		arr.push(this);
		for (i = 0; i < cx.length; i++) {
			arr = arr.concat(cx[i].pass_up_cx(lvl, parent_collapsed));
		}
		
		return arr;
	};
	
	this.refresh_sorted_page_list = function() {
		console.log("refresh_sorted_page_list");
		var arr = [], lvl = 0;
		arr = this.root_page.pass_up_cx(lvl);
		//return arr;
		this.sorted_page_list = arr;
	}
	
	this.Option = function(init) {
		var that = this;
		this.type = "option";
		this.is_new = init.hasOwnProperty("is_new") ? init.is_new : false;
		this._text = init.hasOwnProperty("_text") ? init._text : null;
		//this._id = init.hasOwnProperty("_id") ? init._id : srv.id.new_id();
		this.page_id = init.page_id;
		this.story_id = init.story_id || null; 
		//this.target_page = init.hasOwnProperty("target_page") ? init.target_page : srv.id.new_id();
		
		// handle new id for target page
		this.target_page = null;
		if (init.hasOwnProperty("target_page")) {
			this.target_page = init.target_page;
		}
		else {
			srv.id.gen_id().then(
				// success
				function(id) {
					that.target_page = id;
				},
				// fail
				function(err) {
					console.log("could not gen id for new Option's target page: ", err);
				}
			);
		}
		
		// now handle option's id
		this._id = null;
		if (init.hasOwnProperty("_id")) {
			this._id = init._id;
		}
		else {
			srv.id.gen_id().then(
				// success
				function(id) {
					that._id = id;
					// add self to parent page's option_ids
					srv.get_page_from_id(that.page_id).option_ids.push(id);
				},
				// fail
				function(err) {
					console.log("could not gen id for new User: ", err);
				}
			);
		}
		
		this.modified = init.hasOwnProperty("modified") ? init.modified : true;
	};
	
	// getters/setters
	this.Option.prototype.text = function(val) {
		if (val != undefined) {
			this._text = val;
			this.modified = true;
		}
		return this._text;
	};
	
	this.Option.prototype.spawn_target_page = function() {
		//console.log("spawn_target_page");
		//console.log("this: ", this);
		//console.log("target_page id: ", this.target_page);
		var target_page = srv.get_page_from_id(this.target_page);
		if (target_page) {
			return target_page;
		}
		
		// if page doesn't exist yet, actually create it here
		console.log("parent page: ", this.get_parent_page());
		var root_id = this.get_parent_page().root_id;
		
		var target_page_init = {is_new: true, source_option: this._id, _id: this.target_page, root_id: root_id, story_id: this.story_id};
		target_page = new srv.Page(target_page_init);
		srv.pages.push(target_page);
		srv.refresh_sorted_page_list();
		srv.root_page.set_sort_string();
		return target_page;
	};
	
	this.Option.prototype.get_target_page = function() {
		var target_page = srv.get_page_from_id(this.target_page);
		//return srv.get_page_from_id(this.target_page);
		return target_page;
	};
	
	this.Option.prototype.get_parent_page = function() {
		return srv.get_page_from_id(this.page_id);
	};
	
	function hunt_child_pages(page) {
		//console.log("page to hunt: ", page);
		var q = [], cx = page.get_child_pages(), sub = [], i;
		//console.log("page.text: ", page.text);
		//console.log("children: ", cx);
		if (cx) {
			q = q.concat(cx);
			for (i = 0; i < cx.length; i++) {
				sub = hunt_child_pages(cx[i]);
				if (sub.length > 0) {
					q = q.concat(sub);
				}
			}
		}
		
		return q;
	};
	
	this.Option.prototype.get_child_pages_recurse = function() {
		var cx = [], target_page = this.get_target_page(), i;
		if (target_page) {
			cx = hunt_child_pages(target_page);
		}
		//console.log("final cx: ", cx);
		cx = cx.concat(target_page);
		return cx;
	};
	
	this.get_option_from_id = function(_id) {
		var i; 
		for (i = 0; i < this.options.length; i++) {
			if (this.options[i]._id === _id) {
				return this.options[i];
			}
		}
		return null;
	};
	
	this.get_page_from_id = function(_id) {
		var i;
		for (i = 0; i < this.pages.length; i++) {
			if (this.pages[i]._id === _id) {
				return this.pages[i];
			}
		}
		return null; 
	};
	
	// no no no
	this.page_tree = function() {
		var i, lvl, cx_pages = [], pages_found, q = [], tree = [];
		// get first
		for (i = 0; i < this.pages.length; i++) {
			if (this.pages[i].first) {
				q.push(this.pages[i]);
			}
		}
		
		// stop if we didn't find a first page
		if (q.length === 0) {
			return null;
		}
		tree.push(q);
		q = [];
		
		cx_pages = q[0][0].get_child_pages();
		
		while (cx_pages) {
			tree.push(cx_pages);
			lvl = tree.length - 1;
			for (i = 0; i < tree[lvl].length; i++) {
				
			}
		}
		
		
		return tree;
	};
	
	this.get_modified = function() {
		var i, mods = {stories: [], pages: [], options: []};
		for (i = 0; i < this.stories.length; i++) {
			if (this.stories[i].modified) {
				mods.stories.push(this.stories[i]);
			}
		}
		for (i = 0; i < this.pages.length; i++) {
			if (this.pages[i].modified) {
				mods.pages.push(this.pages[i]);
			}
		}
		for (i = 0; i < this.options.length; i++) {
			if (this.options[i].modified) {
				mods.options.push(this.options[i]);
			}
		}
		return mods;
	};
	
	
}]);
