// app/models/page.js
"use strict"

const mongoose = require("mongoose");
const ObjectId = mongoose.Schema.Types.ObjectId;


// schema for option
const option_schema = mongoose.Schema({
	_id: ObjectId
	, _text: String
	, _sort_order: Number
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

// schema for page
const page_schema = mongoose.Schema({
	_id: ObjectId
	, short_id: String
	// skipping root_id, covered by story_id, remove from venture.js
	, ancestor_path: String
	, _title: String
	, _text: String
	, first: Boolean
	//, source_option: {type: ObjectId, ref: "Option"}
	, source_option: {type: ObjectId, ref: "Page.option_ids"}
	, created_by_user: {type: ObjectId, ref: "User"}
	, updated_by_user: {type: ObjectId, ref: "User"}
	, story_id: {type: ObjectId, ref: "Story"}
	//, option_ids: [{type: ObjectId, ref: "Option"}]
	, option_ids: [option_schema]
	
	// decided not to use this, branch_edit can only happen from an option
	// with no target page
	, lock: { 	user_id: {type: ObjectId, ref: "User", default: null}
				, time_created: {type: Date, default: 0}
				, time_last_renewed: {type: Date, default: 0} 
				, is_locked: {type: Boolean, default: false}
			}
});


// expose model
module.exports = mongoose.model("Page", page_schema);
//module.exports = mongoose.model("Option", option_schema);