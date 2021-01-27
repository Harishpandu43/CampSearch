var campground = require("../models/campground")
var Comment = require("../models/comment")
var Review = require("../models/review");


var middlewareobj = {}
middlewareobj.checkuser = function(req,res,next){
	if(req.isAuthenticated()){
		campground.findOne({slug: req.params.slug} ,function(err,camp){
		if(err){
			req.flash("error","Campground Not Found")
			res.redirect("back")
		}else{
			if(camp.author.id.equals(req.user._id) || req.user.isAdmin)
			{
			next();
			}else{
			req.flash("error","Permission Denied!")
			res.redirect("back")
		}
		}
	})
	}else{
		req.flash("error","You Need to be LOGGED IN to do that")
		res.redirect("back")
	}
}
middlewareobj.checkcmntuser = function(req,res,next){
	if(req.isAuthenticated()){
		Comment.findById(req.params.comment_id, function(err,cmnt){
		if(err){
			res.redirect("back")
		}else{
			if(cmnt.author.id.equals(req.user._id) || req.user.isAdmin)
			{
			next();
			}else{
			req.flash("You are NOT AUTHORIZED to do that")	
			res.redirect("back")
		}
		}
	})
	}else{
		req.flash("error","You Need to be LOGGED IN to do that")
		res.redirect("back")
	}
}

middlewareobj.checkReviewOwnership = function(req, res, next) {
    if(req.isAuthenticated()){
        Review.findById(req.params.review_id, function(err, foundReview){
            if(err || !foundReview){
                res.redirect("back");
            }  else {
                // does user own the comment?
                if(foundReview.author.id.equals(req.user._id)) {
                    next();
                } else {
                    req.flash("error", "You don't have permission to do that");
                    res.redirect("back");
                }
            }
        });
    } else {
        req.flash("error", "You need to be logged in to do that");
        res.redirect("back");
    }
};

middlewareobj.checkReviewExistence = function (req, res, next) {
    if (req.isAuthenticated()) {
        campground.findOne({slug:req.params.slug}).populate("reviews").exec(function (err, foundCampground) {
            if (err || !foundCampground) {
                req.flash("error", "Campground not found.");
                res.redirect("back");
            } else {
                // check if req.user._id exists in foundCampground.reviews
                var foundUserReview = foundCampground.reviews.some(function (review) {
                    return review.author.id.equals(req.user._id);
                });
                if (foundUserReview) {
                    req.flash("error", "You already wrote a review.");
                    return res.redirect("/campgrounds/" + foundCampground.slug);
                }
                // if the review was not found, go to the next middleware
                next();
            }
        });
    } else {
        req.flash("error", "You need to login first.");
        res.redirect("back");
    }
};

middlewareobj.isLoggedIn = function(req,res,next){
	if(req.isAuthenticated()){
		return next();
	}
	req.flash("error", "You Need to LOG IN !")
	res.redirect("/login")
}

module.exports = middlewareobj;