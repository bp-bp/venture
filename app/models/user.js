// app/models/user.js
"use strict"

const mongoose = require("mongoose");
const bcrypt = require("bcrypt-nodejs");
const ObjectId = mongoose.Schema.Types.ObjectId;

// schema for user
const user_schema = mongoose.Schema({
	_id: ObjectId
	, admin: {type: Boolean, default: false}
	,local: {	username: String
				, password: String
			}
});

// hash password
user_schema.methods.hash_password = function(password) {
	return bcrypt.hashSync(password, bcrypt.genSaltSync(8), null);
};

// check password
user_schema.methods.check_password = function(password) {
	console.log("checking password");
	var is_valid = bcrypt.compareSync(password, this.local.password);
	console.log("password is valid: ", is_valid);
	return bcrypt.compareSync(password, this.local.password);
};

// expose model
module.exports = mongoose.model("User", user_schema);