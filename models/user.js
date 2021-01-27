var mongoose = require("mongoose")
var passportlocalmongoose = require("passport-local-mongoose")

var userschema = new mongoose.Schema({
	username : {type:String,unique:true,required:true}, password : String, 
	firstname:String,
	lastname:String,
	desc:String,
	email:{type:String,unique:true,required:true},
	avatar:String,
	notifications: [
    	{
    	   type: mongoose.Schema.Types.ObjectId,
    	   ref: 'Notification'
    	}
    ],
    followers: [
    	{
    		type: mongoose.Schema.Types.ObjectId,
    		ref: 'User'
    	}
    ],
	resetPasswordToken:String,
	resetPasswordExpires:Date,
	isAdmin:{type: Boolean,default : false}
})

userschema.plugin(passportlocalmongoose)
module.exports = mongoose.model("User",userschema)