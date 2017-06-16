// app/models/story.js
"use strict"

const mongoose = require("mongoose");
const ObjectId = mongoose.Schema.Types.ObjectId;

// schema for story
const story_schema = mongoose.Schema({
	_id: ObjectId
	, _title: String
	, _description: String
	
	, _public_view: Boolean
	, _public_edit: Boolean // means branch edit, cannot be publicly deep-editable
	
	, page_short_id_counter: {type: Number, default: 0} // incremented every time a page is created, used for 
														// ancestor paths of pages
	
	, created_by_user: {type: ObjectId, ref: "User"}
	, updated_by_user: {type: ObjectId, ref: "User"}
	, page_ids: [{type: ObjectId, ref: "Page"}]
});

// expose model
module.exports = mongoose.model("Story", story_schema);