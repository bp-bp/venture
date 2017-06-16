// app/models/option.js
"use strict"

const mongoose = require("mongoose");
const ObjectId = mongoose.Schema.Types.ObjectId;

// schema for option
const option_schema = mongoose.Schema({
	_id: ObjectId
	, _text: String
	, page_id: {type: ObjectId, ref: "Page"}
	, target_page: {type: ObjectId, ref: "Page"}
	, created_by_user: {type: ObjectId, ref: "User"}
	, updated_by_user: {type: ObjectId, ref: "User"}
	, story_id: {type: ObjectId, ref: "Story"}
	
	// locked during branch_edit
	, lock: { 	user_id: {type: ObjectId, ref: "User", default: null}
				, time_created: {type: Date, default: 0}
				, time_last_renewed: {type: Date, default: 0} 
				, is_locked: {type: Boolean, default: false}
			}
});

// expose model
module.exports = mongoose.model("Option", option_schema);