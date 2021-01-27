var express = require("express")
var router  = express.Router({mergeParams:true})
var campground = require("../models/campground")
var Comment = require("../models/comment")
var middleware = require("../middleware")

router.get("/new",middleware.isLoggedIn,function(req,res){
	campground.findOne({slug: req.params.slug},function(err,campground){
		if(err){
			console.log(err);
		}else{
			res.render("comments/new", {campground:campground});
		}
	});
});

router.post("/",middleware.isLoggedIn,function(req,res){
	campground.findOne({slug: req.params.slug},function(err,campground){
		if(err){
			console.log(err)
			res.redirect("/campgrounds");
		}else{
			Comment.create(req.body.comment,function(err,comment){
				if(err){
					req.flash("error","Something Went Wrong!")
					console.log(err)
				}else{
					comment.author.id = req.user._id
					comment.author.username = req.user.username
					comment.save()
					campground.comments.push(comment);
					campground.save();
					req.flash("success","Successfully Added Comment")
					res.redirect("/campgrounds/" + campground.slug);
				}
			});
		}
	})
});

router.get("/:comment_id/edit",middleware.checkcmntuser,function(req,res){
	Comment.findById(req.params.comment_id,function(err,cmnt){
		if(err){
			res.redirect("back")
		}else{
			res.render("comments/edit",{campground_slug : req.params.slug , comment : cmnt})
		}
	})
	
})
router.put("/:comment_id",middleware.checkcmntuser,function(req,res){
	Comment.findByIdAndUpdate(req.params.comment_id,req.body.comment,function(err,cmnt){
		if(err){
			res.redirect("back")
		}else{
			res.redirect("/campgrounds/" + req.params.slug)
		}
	})
})
router.delete("/:comment_id",middleware.checkcmntuser,function(req,res){
	Comment.findByIdAndRemove(req.params.comment_id,function(err,del){
		if(err){
			res.redirect("back")
		}else{
			req.flash("success","Comment Deleted")
			res.redirect("/campgrounds/" + req.params.slug)
		}
	})
})


module.exports = router;