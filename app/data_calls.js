// app/data_calls.js
"use strict"

const Q = require("q");
const User = require("./models/user.js");
const Story = require("./models/story.js");
const Page = require("./models/page.js");
const Option = require("./models/option.js");

// some little utilities
function zero_pad(num) {
	if (num.constructor != Number) {
		throw new Error("zero_pad passed something that is not a number.");
	}
	
	var temp = "" + num;
	var blank = "00000";
	var q = blank.substring(0, blank.length - temp.length) + temp;
	return q;
}

// takes a list of pages returned from a query that .populate()'d its option_ids, 
// pulls out the populated option objects and tucks them into their own array on return obj,
// then replaces them in option_ids array with the original ids
function fix_populated_options(pages, accum_obj) {
	if (pages.constructor != Array) {
		throw new Error("fix_populated_options was passed a non-array");
	}
	
	var q = accum_obj || {pages: [], options: []};
	console.log("q: ", q);
	
	var p, o;
	q.pages = q.pages.concat(pages);
	for (p = 0; p < q.pages.length; p++) {
		for (o = 0; o < q.pages[p].option_ids.length; o++) {
			q.options.push(q.pages[p].option_ids[o]);
			q.pages[p].option_ids[o] = q.options[q.options.length - 1]._id;
		}
	}
	
	// I can probably switch back to this now? still take out the constructor string check
	/*q.pages = q.pages.concat(pages);
	q.pages.map(function(p, p_i) {
		console.log("map for page: ", p_i);
		p.option_ids.map(function(o, i, arr) {
			if (o.constructor === String) {
				return;
			}
			q.options.push(o);
			console.log("**********");
			console.log("arr[i] bef: ", arr[i]);
			arr[i] = o._id;
			console.log("arr[i] aft: ", arr[i]);
		});
	});
	*/
	return q;
};

// exports
module.exports.test = function(req, res) {
	console.log("test called at ", Date.now());
	res.send();
};

// gets stories bare, no pages
module.exports.get_stories = function(req, res) {
	// grab our current user_id
	var user_id = req.user && req.user._id ? req.user._id : null;
	// check if we're loading with the possibility of editing them or not
	var for_edit = false;
	if (req.query.for_edit && req.query.for_edit === "true") {
		for_edit = true;
	}
	
	// if no story id was passed, get all stories that the user can see
	if (! req.params.story) {
		return get_all_stories(user_id, for_edit).then(
			// success
			function(stories) {
				res.send({message: "success", stories: stories});
			},
			// fail
			function(err) {
				console.log("get_all_stories failed with: ", err);
				res.send({message: "get_all_stories failed", err: err});
			}
		);
	}
	// otherwise fetch the story requested
	else {
		Story.find({_id: req.params.story, $or: [{_public_view: true}, {_public_view: false, created_by_user: user_id}]}).then(
			// success
			function(story) {
				//console.log("get one story got: ", story);
				res.send({message: "success", stories: story});
			},
			// fail
			function(err) {
				console.log("get one story failed with: ", err);
				res.status(501);
				res.send({message: "error finding story_id: " + req.params.story + ", err: " + err, err: err});
			}
		);
	}
};

// gets all stories with _public view set to true, and if passed a user_id on the req, also gets 
// non-public stories created by the user
function get_all_stories(user_id, for_edit) {
	var query_obj = {};
	// permissions
	if (user_id) {
		// distinguish between loading stories with the intention of editing them vs just viewing/reading
		// when loading for edit, return only stories created by the current user and where public_edit is false
		if (for_edit) {
			console.log("running for_edit");
			query_obj = {created_by_user: user_id, _public_edit: false};
		}
		else {
			query_obj = {$or: [{created_by_user: user_id}, {_public_view: true}]};
		}
	}
	// should not be called with for_edit === true without a user_id
	else {
		query_obj = {_public_view: true};
	}
	
	return Story.find(query_obj).populate("created_by_user").lean().then(
		// success
		function(stories) {
			stories.forEach(function(s) {
				var created_by_id = s.created_by_user._id.toString();
				s.created_by_username = s.created_by_user.local.username;
				s.created_by_user = undefined;
				s.own_story = false;
				if (created_by_id == user_id) {
					s.own_story = true;
				}
			});
			return stories;
		},
		// fail
		function(err) {
			console.log("get_all_stories find() call failed with: ", err);
			return Q.reject(err);
		}
	);
};

// increments the short_id counter on the requested story object and returns the incremented value
// used in ancestor_path
module.exports.get_page_short_id = function(req, res) {
	var story_id = req.params.story;
	
	if (! story_id) {
		res.status(422);
		return res.send({message: "no story_id passed for page_short_id"});
	}
	
	var query_obj = {_id: story_id};
	var set_obj = {$inc: {page_short_id_counter: 1}};
	var ret_obj = {success: false, message: null, err: null, counter: -1, counter_str: null};
	
	Story.findOneAndUpdate(query_obj, set_obj).then(
		// success
		function(story) {
			if (story) {
				ret_obj.message = "success";
				ret_obj.success = true;
				ret_obj.counter = story.page_short_id_counter;
				ret_obj.counter_str = zero_pad(ret_obj.counter);
			}
			else {
				ret_obj.message = "could not find story for id: " + story_id;
			}
			
			return res.send(ret_obj);
		}, 
		// fail
		function(err) {
			ret_obj.message = "error in Story.findOneAndUpdate for story_id: " + story_id;
			ret_obj.err = err;
			
			return res.send(ret_obj);
		}
	);
};

// save stories... currently only called with one story at a time from front-end, but can handle multiples
module.exports.save_stories = function(req, res) {
	var save_stories = req.body.stories.new_ones;
	var mod_stories = req.body.stories.mod;
	var finished = {inserts: false, updts: false};
	
	var i, new_story, new_stories = [], updt_story, updt_story_ids = [], updt_stories = [], updt_stories_finished = [];
	// create new stories, build list for insert
	save_stories.forEach(function(s) {
		new_story = new Story();
		new_story._id = s._id;
		new_story._title = s._title;
		new_story._description = s._description;
		new_story._public_view = s._public_view;
		new_story._public_edit = s._public_edit;
		new_story.created_by_user = req.user._id;
		new_story.updated_by_user = req.user._id;
		new_story.page_ids = s.page_ids;
		
		new_stories.push(new_story);
	});
	
	// set up promises
	var insert_prom, update_prom;
	
	// modify stories, first check if we even need to bother
	if (! mod_stories.length) {
		update_prom = Q.resolve();
	}
	else {
		// pull stories for update from db and modify with new values
		// first make an array of ids we're updating
		mod_stories.forEach(function(s) {
			updt_story_ids.push(s._id);
		});
		// now query and kick off updates
		update_prom = Story.find({_id: {$in: updt_story_ids}}).then(
			// success
			function(db_stories) {
				var db_stories_dict = array_to_dict(db_stories); // dict by _id of stories from query
				var temp, to_write = [];
				mod_stories.forEach(function(s) {
					temp = db_stories_dict[s._id];
					temp._title = s._title;
					temp._description = s._description;
					temp._public_view = s._public_view;
					temp._public_edit = s._public_edit;
					temp._updated_by_user = req.user._id;
					temp.page_ids = s.page_ids;

					to_write.push(temp.save());
				});

				return Q.all(to_write);
			},
			// fail
			function(err) {
				return Q.reject(err);
			}
		);
	}
	
	// now the inserts, check if we need to bother
	if (! save_stories.length) {
		insert_prom = Q.resolve();
	}
	else {
		insert_prom = Story.insertMany(new_stories);
	}
	
	// now line them all up
	Q.all([update_prom, insert_prom]).then(
		// success
		function() {
			res.send({message: "finished inserting and updating"});
		}, 
		// fail
		function(err) {
			res.send({message: "error inserting or updating stories", err: err});
		}
	);
	
	// utility thing
	function array_to_dict(arr) {
		var dict = {};
		arr.forEach(function(itm) {
			dict[itm._id] = itm;
		});
		return dict;
	}
	
};

// save pages and options
module.exports.save_pages = function(req, res) {
	
	var save_pages = req.body.pages.to_save;
	//var updt_pages = req.body.pages.to_update;
	var front_update_pages = req.body.pages.to_update;
	var save_options = req.body.options.to_save;
	//var updt_options = req.body.options.to_update;
	var front_update_options = req.body.options.to_update;
	var finished = {pages: {inserts: false, updates: false}, options: {inserts: false, updates: false}};
	
	// all our promises
	var insert_pages_prom, update_pages_prom, insert_options_prom, update_options_prom;
	
	// create new page objects from schema, build list for insert
	var i, new_page, new_pages = [], updt_page, fetched_updt_pages = [], updt_page_ids = [], updt_pages_finished = [];
	save_pages.forEach(function(p) {
		new_page = new Page();
		new_page._id = p._id;
		new_page.short_id = p.short_id;
		new_page.ancestor_path = p.ancestor_path;
		new_page._title = p._title;
		new_page._text = p._text;
		new_page.first = p.first;
		new_page.source_option = p.source_option;
		new_page.story_id = p.story_id;
		new_page.option_ids = p.option_ids;
		new_page.created_by_user = req.user._id;
		new_page.updated_by_user = req.user._id;
		
		new_pages.push(new_page);
	});
	
	if (! new_pages.length) {
		insert_pages_prom = Q.resolve();
	}
	else {
		insert_pages_prom = Page.insertMany(new_pages).then(
			// success
			function(results) {
				// nothing here, just want to handle failure
			},
			// fail
			function(err) {
				console.log("Page.insertMany failed in save_pages with: ", err);
				return new Error(err);
			}
		);
	}
	
	/*
	for (i = 0; i < save_pages.length; i++) {
		new_page = new Page();
		new_page._id = save_pages[i]._id;
		new_page.short_id = save_pages[i].short_id;
		new_page.ancestor_path = save_pages[i].ancestor_path;
		new_page._title = save_pages[i]._title;
		new_page._text = save_pages[i]._text;
		new_page.first = save_pages[i].first;
		new_page.source_option = save_pages[i].source_option;
		new_page.story_id = save_pages[i].story_id;
		new_page.option_ids = save_pages[i].option_ids;
		new_page.created_by_user = req.user._id;
		new_page.updated_by_user = req.user._id;
		
		new_pages.push(new_page);
	}
	*/
	
	// now updating pages
	// first get a list of ids for query
	front_update_pages.forEach(function(p) {
		updt_page_ids.push(p._id);
	});
	
	// now set up the promise and do the query
	if (! front_update_pages.length) {
		update_pages_prom = Q.resolve();
	}
	else {
		update_pages_prom = Page.find({_id: {$in: updt_page_ids}}).then(
			// success
			function(pages) {
				var db_updt_pages_dict = array_to_dict(pages), to_write = [], temp;
				front_update_pages.forEach(function(p) {
					temp = db_updt_pages_dict[p._id];
					
					temp._title = p._title;
					temp._text = p._text;
					temp.first = p.first;
					temp.source_option = p.source_option;
					temp.story_id = p.story_id;
					temp.option_ids = p.option_ids;
					temp.updated_by_user = req.user._id;
					
					to_write.push(temp.save());
				});
				
				return Q.all(to_write);
			},
			// fail
			function(err) {
				console.log("Page.find for update pages failed with: ", err);
				return new Error(err);
			}
		);
	}
	
	// now options, first set up new ones
	var new_option, new_options = [];
	save_options.forEach(function(o) {
		new_option = new Option();
		new_option._id = o._id;
		new_option._text = o._text;
		new_option._sort_order = o._sort_order;
		new_option.page_id = o._page_id;
		new_option.target_page = o.target_page;
		new_option.story_id = o.story_id;
		new_option.created_by_user = req.user._id;
		new_option.updated_by_user = req.user._id;
		
		new_options.push(new_option);
	});
	
	if (! new_options.length) {
		insert_options_prom = Q.resolve();
	}
	else {
		insert_options_prom = Option.insertMany(new_options).then(
			// success
			function(results) {
				// nothing here, just want to handle failure
			},
			// fail
			function(err) {
				console.log("Option.insertMany failed in save_pages with: ", err);
				return Q.reject(err);
			}
		);
	}
	
	// now the updates, first get a list of ids for query
	var updt_option_ids = [];
	front_update_options.forEach(function(o) {
		updt_option_ids.push(o._id);
	});
	
	// now set up the promise with query
	if (! front_update_options.length) {
		update_options_prom = Q.resolve();
	}
	else {
		update_options_prom = Option.find({_id: {$in: updt_option_ids}}).then(
			// success
			function(options) {
				var db_updt_options_dict = array_to_dict(options), to_write = [], temp;
				front_update_options.forEach(function(o) {
					temp = db_updt_options_dict[o._id];
					temp._text = o._text;
					temp._sort_order = o._sort_order;
					temp.page_id = o.page_id; 
					temp.target_page = o.target_page;
					temp.story_id = o.story_id;
					temp.updated_by_user = req.user._id;
					
					to_write.push(temp.save());
				});
				
				return Q.all(to_write);
			},
			// fail
			function(err) {
				console.log("Option.find in save_pages failed with: ", err);
				return Q.reject(err);
			}
		);
	}
	
	// now line them all up
	Q.all([insert_pages_prom, insert_options_prom, update_pages_prom, update_options_prom]).then(
		// success
		function() {
			res.send({message: "finished inserting and updating"});
		}, 
		// fail
		function(err) {
			res.send({message: "error inserting or updating pages", err: err});
		}
	);
	
	// utility thing used in update query
	function array_to_dict(arr) {
		var dict = {};
		arr.forEach(function(itm) {
			dict[itm._id] = itm;
		});
		return dict;
	}
};

// given a story_id, get pages and options
// used for edit, currently only creating user can globally edit existing pages.
// stories that allow branch_edit cannot be edited this way even by creating user
// add user check
function fetch_pages_for_story(story_id) {
	var return_obj = {pages: [], options: []};
	return Page.find({story_id: story_id}).populate("option_ids").then(
		// success
		function(result) {
			var i, q;
			for (i = 0; i < result.length; i++) {
				for (q = 0; q < result[i].option_ids.length; q++) {
					return_obj.options.push(result[i].option_ids[q]);
					result[i].option_ids[q] = result[i].option_ids[q]._id;
				}
				return_obj.pages.push(result[i]);
			}
			return return_obj;
			//res.send({message: "load_pages_for_story success", results: return_obj});
		},
		// fail
		function(err) {
			console.log("Page.find/populate in load_pages_for_story failed with: ", err);
			return Q.reject(err);
			//res.send({message: "Page.find/populate in load_pages_for_story failed", err: err});
		}
	);
}

module.exports.load_pages_for_story = function(req, res) {
	console.log("load_pages_for_story");
	var story_id = req.query.story;
	var user_id = req.user && req.user._id ? req.user._id : null;
	var return_obj = {pages: [], options: []};
	
	// check that we got the params we need and a logged-in user
	if (! story_id) {
		res.status(422);
		return res.send({message: "no story_id passed for load_pages_for_story"});
	}
	if (! user_id) {
		res.status(403);
		return res.send({message: "no user_id in load_pages_for_story"});
	}
	
	// check if we're allowed. Will not load if: 
	// - story allows branch_edit (such stories are "frozen" except at the leaves)
	// - user is not the user who created the story (future feature: allowing other specific users to edit)
	var query = {_id: story_id, _public_edit: false, created_by_user: user_id};
	Story.findOne(query).then(
		// success
		function(story) {
			if (story) {
				fetch_pages_for_story(story_id).then(
					// success
					function(results) {
						res.send({message: "success", results: results});
					},
					// fail
					function(err) {
						res.send({message: "Page.find/populate in load_pages_for_story failed with: " + err, err: err});
					}
				);
			}
			else {
				res.status(403);
				res.send({message: "You cannot edit the pages in this story"});
			}
		},
		// fail
		function(err) {
			res.status(501);
			res.send({message: "error checking permissions in story: " + story_id, err: err});
		}
	);
};

// read stuff
function get_page_for_read(story_id, page_id) {
	
	// if we weren't passed a page_id we should get the first page of the story
	if (! page_id) {
		console.log("no page_id");
		return Page.findOne({story_id: story_id, first: true}).populate("option_ids").then(
			// success
			function(page) {
				var return_obj = {message: "success", page_found: true, sought_first: true, page: null, options: []}, i;
				if (! page) {
					return_obj.page_found = false;
					return_obj.message = "page not found"
					return return_obj;
				}
				
				// fix options
				for (i = 0; i < page.option_ids.length; i++) {
					return_obj.options.push(page.option_ids[i]);
					page.option_ids[i] = page.option_ids[i]._id;
				}
				return_obj.page = page;
				return return_obj;
			},
			// fail 
			function(err) {
				console.log("failed to get first page of story: ", story_id);
				return Q.reject({message: "error fetching first page of story_id: " + story_id, err: err});
			}
		);
	}
	// if we were passed a page_id, grab just that one
	else {
		console.log("got a page_id");
		return Page.findOne({_id: page_id}).populate("option_ids").then(
			// success
			function(page) {
				var return_obj = {message: "success", page_found: true, page: null, options: []}, i;
				
				// still a success if the requested page doesn't exist, user may request branch_edit
				if (! page) {
					return_obj.page_found = false;
					return_obj.message = "page not found"
					return return_obj;
					//res.send(return_obj);
				}
				else {
					for (i = 0; i < page.option_ids.length; i++) {
						return_obj.options.push(page.option_ids[i]);
						page.option_ids[i] = page.option_ids[i]._id;
					}
					return_obj.page = page;
					return return_obj;
					//res.send(return_obj);
				}
			},
			// fail
			function(err) {
				console.log("failed to get page_id " + page_id + " with error: ", err);
				return Q.reject({message: "error fetching page: " + page_id + ", with error: " + err, err: err});
			}
		);
	}
}

module.exports.read_page = function(req, res) {
	var story_id = req.params.story || null;
	var page_id = req.params.page || null;
	var user_id = req.user && req.user._id ? req.user._id : null;
	
	// check if we got params we need
	if (! story_id) {
		res.status(422);
		return res.send({message: "no story_id passed for read_page"});
	}
	
	// check if we're allowed to read this page
	var query = {_id: story_id};
	if (user_id) {
		query.$or = [{_public_view: true}, {_public_view: false, created_by_user: user_id}];
	}
	else {
		query._public_view = true;
	}
	console.log("user_id: ", user_id);
	console.log("query: ", query);
	Story.findOne(query).then(
		// success
		function(story) {
			console.log("story: ", story);
			if (story) {
				console.log("here");
				console.log("story_id: ", story_id, " page_id: ", page_id);
				get_page_for_read(story_id, page_id).then(
					// success
					function(return_obj) {
						return res.send(return_obj);
					}, 
					// fail
					function(fail_obj) {
						res.status(501)
						return res.send(fail_obj);
					}
				);
			}
			else {
				res.status(403);
				return res.send({message: "you are not allowed to read pages from this story"});
			}
		},
		// fail
		function(err) {
			res.status(501);
			return res.send({message: "permissions check in read_page returned error", err: err});
		}
	);
	
	//var option_ids = [];
	
	/*
	// if we weren't passed a page_id we should get the first page of the story
	if (! req.params.page) {
		Page.find({story_id: req.params.story, first: true}).populate("option_ids").then(
			// success
			function(results) {
				var return_obj = {message: "success", page_found: true, page: null, options: []}, page = results[0], i;
				if (! page) {
					return_obj.page_found = false;
					return_obj.message = "page not found"
					res.send(return_obj);
				}
				
				for (i = 0; i < page.option_ids.length; i++) {
					return_obj.options.push(page.option_ids[i]);
					page.option_ids[i] = page.option_ids[i]._id;
				}
				return_obj.page = page;
				res.send(return_obj);
			},
			// fail 
			function(err) {
				console.log("failed to get first page of story: ", req.params.story);
				res.status(501);
				res.send({message: "error fetching first page of story_id: " + req.params.story});
			}
		);
	}
	// if we were passed a page_id, grab just that one
	else {
		Page.find({_id: req.params.page}).populate("option_ids").then(
			// success
			function(results) {
				var return_obj = {message: "success", page_found: true, page: null, options: []}, page = results[0], i;
				
				// still a success if the requested page doesn't exist, user may request branch_edit
				if (! page) {
					return_obj.page_found = false;
					return_obj.message = "page not found"
					res.send(return_obj);
				}
				else {
					for (i = 0; i < page.option_ids.length; i++) {
						return_obj.options.push(page.option_ids[i]);
						page.option_ids[i] = page.option_ids[i]._id;
					}
					return_obj.page = page;
					res.send(return_obj);
				}
			},
			// fail
			function(err) {
				console.log("failed to get page_id " + req.params.page + " with error: ", err);
				res.status(501);
				res.send({message: "error fetching page: " + req.params.page + ", with error: " + err, err: err});
			}
		);
	}
	*/
};


// branch editing - locks

// not currently using this, but let's keep it around 
// called from branch_edit_page
function lock_page_and_fetch(user_id, story_id, page_id) {
	var five_mins_ago = new Date( Date.now() - (60000 * 60) ); // temporarily 1 hour
	
	return Page.findOneAndUpdate(	{_id: page_id, story_id: story_id
												, $or: [	{"lock.is_locked": false} // if not locked at all
													, {"lock.is_locked": true, "lock.user_id": user_id} // if locked but by current user
													, {"lock.is_locked": true, "lock.time_last_renewed": {$lte: five_mins_ago}}
													]
							}
							, {$set: {	"lock.user_id": user_id
										, "lock.time_created": Date.now()
										, "lock.time_last_renewed": Date.now()
										, "lock.is_locked": true}}).then(
		// success
		function(page) {
			if (page) {
				return page;
			}
			else {
				throw new Error("failed to get lock");
			}
		},
		// fail
		function(err) {
			console.log("Page.find in get_page_lock failed with: ", err);
			throw new Error(err);
		}
	);
}

// called when finished with a branch edit
function unlock_option(user_id, story_id, option_id) {
	var minus_five_mins = new Date(Date.now() - (60000 * 5) );
	var ret_obj = {option: null, message: null, err: null};
	
	return Option.findOneAndUpdate( {_id: option_id, story_id: story_id, "lock.user_id": user_id
									// I don't think we need the 'or' here, if it's the right option
									// and the lock belongs to the user, why not unlock it
									//, $or: [ 	{"lock.is_locked": false} // report success if not locked in the first place
									//			, {"lock.is_locked": true, "lock.user_id": user_id} // otherwise unlock only if locked by current user
									//		]
									}
									, {$set: {	"lock.user_id": null
												, "lock.time_created": Date.now()
												, "lock.time_last_renewed": Date.now()
												, "lock.is_locked": false}}).then(
		// success
		function(option) {
			if (option) {
				ret_obj.option = option;
				ret_obj.message = "success";
				return ret_obj;
			}
			// this would be caused by either bad params or a lock created by another user...
			else {
				ret_obj.message = "could not find option to unlock";
				return ret_obj;
			}
		},
		// fail
		function(err) {
			ret_obj.message = "error";
			ret_obj.err = err;
			return ret_obj;
		}
	);
}

// finds option and locks it (if possible), returns it
// needs check that story has _public_edit = true
function lock_option_and_fetch(user_id, story_id, option_id) {
	var minus_five_mins = new Date( Date.now() - (60000 * 5) );
	var ret_obj = {option: null, message: null, err: null};
	
	Story.findOne
	
	return Option.findOneAndUpdate( {_id: option_id, story_id: story_id
									, $or: [ 	{"lock.is_locked": false} // if not locked at all
												, {"lock.is_locked": true, "lock.user_id": user_id} // if locked by current user
												, {"lock.is_locked": true, "lock.time_last_renewed": {$lte: minus_five_mins}} // if lock is older than 5 minutes
											]
									}
									, {$set: {	"lock.user_id": user_id
												, "lock.time_created": Date.now()
												, "lock.time_last_renewed": Date.now()
												, "lock.is_locked": true}}).populate("page_id").then( // note the populate here
		
		// success
		function(option) {
			if (option) {
				ret_obj.option = option;
				ret_obj.message = "success";
				// handle populated page
				ret_obj.parent_page = option.page_id; // this is the whole page object 
				
				return ret_obj;
			}
			else {
				ret_obj.message = "could not get lock";
				return ret_obj;
			}
		}, 
		// fail
		function(err) {
			console.log("Option.find in lock_option_and_fetch failed with: ", err);
			ret_obj.message = "error";
			ret_obj.err = err;
			return ret_obj;
		}
	)
}

// called when finished with a branch_edit
module.exports.unlock_option = function(req, res) {
	var story_id = req.params.story || null;
	var option_id = req.params.option || null;
	var user_id = req.user && req.user._id ? req.user._id : null;
	
	// check that we got the params we need and a logged-in user
	if (! story_id) {
		res.status(422);
		return res.send({message: "no story_id passed for branch edit"});
	}
	if (! option_id) {
		res.status(422);
		return res.send({message: "no option_id passed for branch edit"});
	}
	if (! user_id) {
		res.status(403);
		return res.send({message: "no user_id in branch_edit, shouldn't have even got here"});
	}
	
	// try to unlock option, report success or failure
	unlock_option(user_id, story_id, option_id).then(
		// only success
		function(obj) {
			if (obj.err) {
				res.status(500);
			}
			// .message set in unlock_option function
			res.send(obj);
		}
	);
};

// kicks off branch_edit 
module.exports.branch_edit_option = function(req, res) {
	var story_id = req.params.story || null;
	var option_id = req.params.option || null;
	var user_id = req.user && req.user._id ? req.user._id : null;
	
	// check that we got the params we need and a logged-in user
	if (! story_id) {
		res.status(422);
		return res.send({message: "no story_id passed for branch edit"});
	}
	if (! option_id) {
		res.status(422);
		return res.send({message: "no option_id passed for branch edit"});
	}
	if (! user_id) {
		res.status(403);
		return res.send({message: "no user_id in branch_edit, shouldn't have even got here"});
	}
	
	// attempt to lock option and, if successful, return it
	lock_option_and_fetch(user_id, story_id, option_id).then(
		// only success
		function(obj) {
			// if query errored out
			if (obj.err) {
				res.status(500);
				res.send({message: "error fetching option with lock: " + obj.err});
			}
			// if query returned but didn't fetch a option -- already locked or bad params
			else if (! obj.option && obj.message === "could not get lock") {
				res.send({message: "could not get lock", option: obj.option});
			}
			else if (obj.option) {
				res.send({message: "success", option: obj.option, parent_page: obj.parent_page});
			}
		}
	);
};

// branch edit page -- not using right now, but let's keep it on hand
module.exports.branch_edit_page = function(req, res) {
	var story_id = req.params.story || null;
	var page_id = req.params.page || null;
	var user_id = req.user && req.user._id ? req.user._id : null;
	
	// check we got our params and a logged-in user
	if (! story_id) {
		res.status(422);
		return res.send({message: "no story_id passed for branch edit"});
	}
	if (! page_id) {
		res.status(422);
		return res.send({message: "no page_id passed for branch edit"});
	}
	if (! user_id) {
		res.status(403);
		return res.send({message: "no user_id in branch_edit, shouldn't have even got here"});
	}
	
	// attempt to lock page and, if successful, return it
	lock_page_and_fetch(user_id, story_id, page_id).then(
		// success
		function(page) {
			// if we got us a page, handle here
			if (page) {
				res.send({message: "great success", page: page});
			}
			else {
				res.send({message: "could not get page lock", page: page});
			}
		}, 
		// fail
		function(err) {
			// find best way to distinguish between an error in the fetch to just failing to get a lock
			res.status(500);
			res.send({message: "error fetching page with lock: " + err});
		}
	);
};

// given a page_id returns it's page along with its descendants (populates options)
function get_page_descendants(page_id) {
	return Page.findOne({_id: page_id}).lean().populate("option_ids").then(
		// success
		function(page) {
			// this will grab the original page too, arguably we're getting it twice but we need
			// the ancestor_path
			return Page.find({ancestor_path: {$regex: "^" + page.ancestor_path}}).lean().populate("option_ids");
		},
		// fail
		function(err) {
			console.log("error in get_page_descendants findOne call: ", err);
			return Q.reject(err);
		}
	).then(
		// success
		function(pages) {
			var ret = fix_populated_options(pages);
			return ret;
		},
		// fail
		function(err) {
			console.log("error in find call in get_page_descendants: ", err);
			return Q.reject(err);
		}
	);
}

// given an option_id returns it's option along with descendants (populates options)
function get_option_descendants(option_id) {
	var ret = {pages: [], options: []};
	return Option.findOne({_id: option_id}).lean().then(
		// success
		function(option) {
			ret.options.push(option);
			ret.orig_option = option;
			return Page.findOne({source_option: option_id}).populate("option_ids").lean();
		},
		// fail
		function(err) {
			return Q.reject(err);
		}
	).then(
		// success
		function(page) {
			return Page.find({ancestor_path: {$regex: "^" + page.ancestor_path}}).populate("option_ids").lean();
		},
		// fail
		function(err) {
			return Q.reject(err);
		}
	).then(
		// success
		function(pages) {
			ret = fix_populated_options(pages, ret);
			return ret;
		},
		// fail
		function(err) {
			console.log("error in find call in get_option_descendants: ", err);
			return Q.reject(err);
		}
	);
};

// used as prelude to delete
module.exports.get_descendants = function(req, res) {
	var type = req.params.type || null;
	var id = req.params.id || null;
	
	// check we were passed the things we need
	if (! type || (type != "page" && type != "option")) {
		res.status(422);
		return res.send({message: "no or invalid type passed"});
	}
	if (! id) {
		res.status(422);
		return res.send({message: "no id passed"});
	}
	
	// call correct function for each type and return results
	if (type === "page") {
		//get_page_descendants
		get_page_descendants(id).then( 
			// success
			function(results) {
				// rejigger so the options are pulled out -- wait why?
				res.send({message: "success", results: results});
			},
			// fail
			function(err) {
				console.log("get_descendants page call failed with: ", err);
				res.status(501);
				res.send({message: "get_descendants page call failed", err: err});
			}
		);
	}
	else if (type === "option") {
		get_option_descendants(id).then(
			// success
			function(results) {
				//console.log("got these pages: ", pages);
				res.send({message: "success", results: results});
			},
			// fail
			function(err) {
				console.log("get_descendants option call failed with: ", err);
				res.status(501);
				res.send({message: "get_descendants option call failed with: ", err});
			}
		);
	}
};

// master delete handler for pages and options
// add user check 
module.exports.delete = function(req, res) {
	console.log("delete called");
	console.log(req.params);
	
	// options first
	// params.page == "null" if we're just deleting an option
	var page_id, option_id;
	page_id = req.params.page === "null" ? null : req.params.page;
	option_id = req.params.option === "null" ? null : req.params.option;
	
	// just handle options first... have a check for nulls and then define 
	// self-resolving promise, call .all() at the end?
	if (option_id) {
		get_option_descendants(option_id).then(
			// success
			function(results) {
				var pages_to_del = [];
				var options_to_del = [];
				
				results.pages.forEach(function(p) {
					pages_to_del.push(p._id);
				});
				results.options.forEach(function(o) {
					options_to_del.push(o._id);
				});
				
				// now fetch option's parent page and remove reference from option_ids list
				var update_parent = Page.findOne({_id: results.orig_option.page_id}).then(
					// success
					function(page) {
						// remove option_id from list
						page.option_ids.forEach(function(oid, i, arr) {
							// leave as == because oid is an ObjectId object and option_id is a string
							if (oid == option_id) {
								arr.splice(i, 1);
							}
						});
						// save it back
						page.save();
					},
					// fail
					function(err) {
						return Q.reject(err);
					}
				);
				
				var page_del_query = {_id: {$in: pages_to_del}};
				var option_del_query = {_id: {$in: options_to_del}};
				
				Q.all([Page.remove(page_del_query), Option.remove(option_del_query), update_parent]).then(
					// success
					function(result) {
						res.send({message: "success deleting pages and options", pages_deleted: pages_to_del, options_deleted: options_to_del});
					},
					// fail
					function(err) {
						console.log("error deleting pages or options: ", err);
						res.status(501);
						res.send({message: "error deleting pages or options", err: err});
					}
				);
			}
		);
	}
	
	// now if we're passed a page
	if (page_id) {
		get_page_descendants(page_id).then(
			// success
			function(results) {
				var pages_to_del = [];
				var options_to_del = [];
				
				results.pages.forEach(function(p) {
					pages_to_del.push(p._id);
				});
				results.options.forEach(function(o) {
					options_to_del.push(o._id);
				});
				
				var page_del_query = {_id: {$in: pages_to_del}};
				var option_del_query = {_id: {$in: options_to_del}};
				
				Q.all([Page.remove(page_del_query), Option.remove(option_del_query)]).then(
					// success
					function(result) {
						res.send({message: "success deleting pages and options", pages_deleted: pages_to_del, options_deleted: options_to_del});
					},
					// fail
					function(err) {
						console.log("error deleting pages or options: ", err);
						res.status(501);
						res.send({message: "error deleting pages or options", err: err});
					}
				);
			},
			// fail
			function(err) {
				console.log("error returned from get_page_descendats: ", err);
				res.status(501);
				res.send({message: "error deleting pages or options", err: err});
			}
		);
	}
	
	
};