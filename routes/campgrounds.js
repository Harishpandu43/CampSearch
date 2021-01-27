var express = require("express")
var router  = express.Router()
var campground = require("../models/campground")
var middleware = require("../middleware")
var multer = require('multer');
var User = require("../models/user")
var Comment = require("../models/comment");
var Review = require("../models/review");
var storage = multer.diskStorage({
  filename: function(req, file, callback) {
    callback(null, Date.now() + file.originalname);
  }
});
var imageFilter = function (req, file, cb) {
    // accept image files only
    if (!file.originalname.match(/\.(jpg|jpeg|png|gif)$/i)) {
        return cb(new Error('Only image files are allowed!'), false);
    }
    cb(null, true);
};
var upload = multer({ storage: storage, fileFilter: imageFilter})

var cloudinary = require('cloudinary');
cloudinary.config({ 
  cloud_name: 'harishpandu43', 
  api_key: '724473775199978', 
  api_secret: 'qCwYXuimN0a3oXXTXjlW3j0Wz3E'
});


//INDEX - show all campgrounds
router.get("/", function(req, res){
	var noMatch= null;
	var perPage = 8;
    var pageQuery = parseInt(req.query.page);
    var pageNumber = pageQuery ? pageQuery : 1;
	if(req.query.search){
	 const regex = new RegExp(escapeRegex(req.query.search), 'gi');
	   campground.find({name: regex}).skip((perPage * pageNumber) - perPage).limit(perPage).exec(function(err, allCampgrounds){
		   campground.count({name: regex}).exec(function (err, count) {
           if(err){
               console.log(err);
           } else {
			   
              if(allCampgrounds.length < 1) {
                  noMatch = "No campgrounds match that query, please try again.";
              }
              res.render("campgrounds/index",{campgrounds: allCampgrounds,
                        current: pageNumber,
                        pages: Math.ceil(count / perPage),
                        noMatch: noMatch,
                        search: req.query.search});
           }
    });
	   })
	}else{
    // Get all campgrounds from DB
		campground.find({}).skip((perPage * pageNumber) - perPage).limit(perPage).exec(function(err, allCampgrounds){
		   campground.count().exec(function (err, count) {
		   if(err){
			   console.log(err);
		   } else {
			  res.render("campgrounds/index",{campgrounds: allCampgrounds, page: 'campgrounds' ,noMatch: noMatch,current: pageNumber,
                    pages: Math.ceil(count / perPage)});
		   }
		});
})
}
});

router.get("/new",middleware.isLoggedIn,function(req,res){
	res.render("campgrounds/new");
});

router.post("/", middleware.isLoggedIn, upload.single('image'), function(req, res) {
    cloudinary.v2.uploader.upload(req.file.path, async function(err, result) {
      if(err) {
        req.flash('error', err.message);
        return res.redirect('back');
      }
      // add cloudinary url for the image to the campground object under image property
      req.body.campground.image = result.secure_url;
      // add image's public_id to campground object
      req.body.campground.imageId = result.public_id;
      // add author to campground
      req.body.campground.author = {
        id: req.user._id,
        username: req.user.username
      }
      
		 try {
      		var camp = await campground.create(req.body.campground);
      let user = await User.findOne({slug: req.params.slug}).populate('followers').exec();
      let newNotification = {
        username: req.user.username,
        campgroundId: camp.id
      }
      for(const follower of user.followers) {
        let notification = await Notification.create(newNotification);
        follower.notifications.push(notification);
        follower.save();
      }

      //redirect back to campgrounds page
      res.redirect("/campgrounds/"+ camp.slug);
    } catch(err) {
      req.flash('error', err.message);
      res.redirect('back');
    }
    });
});

router.get("/:slug",function(req,res){
	campground.findOne({slug: req.params.slug}).populate("comments likes").populate({
        path: "reviews",
        options: {sort: {createdAt: -1}}
    }).exec(function(err,camp){
		if(err){
			console.log(err);
		}else{
			res.render("campgrounds/show",{campground:camp});
		}
	});
});

router.get("/:slug/edit",middleware.checkuser,function(req,res){
	campground.findOne({slug: req.params.slug}, function(err,camp){
	res.render("campgrounds/edit",{campground : camp})
	})
})

router.post("/:slug/like", middleware.isLoggedIn, function (req, res) {
    campground.findOne({slug : req.params.slug}, function (err, foundCampground) {
        if (err) {
            console.log(err);
            return res.redirect("/campgrounds");
        }

        // check if req.user._id exists in foundCampground.likes
        var foundUserLike = foundCampground.likes.some(function (like) {
            return like.equals(req.user._id);
        });

        if (foundUserLike) {
            // user already liked, removing like
            foundCampground.likes.pull(req.user._id);
        } else {
            // adding the new user like
            foundCampground.likes.push(req.user);
        }

        foundCampground.save(function (err) {
            if (err) {
                console.log(err);
                return res.redirect("/campgrounds");
            }
            return res.redirect("/campgrounds/" + foundCampground.slug);
        });
    });
});
router.put("/:slug",middleware.checkuser,upload.single("image"),function(req,res){
	 campground.findOne({slug: req.params.slug}, async function(err, campground){
        if(err){
            req.flash("error", err.message);
            res.redirect("back");
        } else {
            if (req.file) {
              try {
                  await cloudinary.v2.uploader.destroy(campground.imageId);
                  var result = await cloudinary.v2.uploader.upload(req.file.path);
                  campground.imageId = result.public_id;
                  campground.image = result.secure_url;
              } catch(err) {
                  req.flash("error", err.message);
                  return res.redirect("back");
              }
            }
            campground.name = req.body.name;
            campground.desc = req.body.desc;
			campground.price =req.body.price;
            campground.save();
            req.flash("success","Successfully Updated!");
            res.redirect("/campgrounds/" + campground.slug);
        }
    });
})

router.delete('/:slug', middleware.checkuser,function(req, res) {
  campground.findOne({slug: req.params.slug}, async function(err, campground) {
    if(err) {
      req.flash("error", err.message);
      return res.redirect("back");
    }
    try {
		Comment.remove({"_id": {$in: campground.comments}},function(err){
			if(err){
				console.log(err);
                return res.redirect("/campgrounds");
			}
		})
		Review.remove({"_id": {$in: campground.reviews}},function(err){
			if(err){
				console.log(err);
                return res.redirect("/campgrounds");
			}
		})
        await cloudinary.v2.uploader.destroy(campground.imageId);
        campground.remove();
        req.flash('success', 'Campground deleted successfully!');
        res.redirect('/campgrounds');
    } catch(err) {
        if(err) {
          req.flash("error", err.message);
          return res.redirect("back");
        }
    }
  });
});
function escapeRegex(text) {
    return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
};

module.exports = router;