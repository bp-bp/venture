// app/story_calls.js
"use strict"

const Q = require("q");
const Story = require("./models/story.js");

// gets either one or all allowed stories bare, no pages
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
				// blank out created by _id from backend, set some flags for front end
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
