var express = require("express")
var router  = express.Router()
var passport= require("passport")
var User = require("../models/user")
var campground = require("../models/campground")
var async         = require("async")
var nodemailer    = require("nodemailer")
var crypto    = require("crypto")
var middleware = require("../middleware")
var Notification = require("../models/notification");





router.get("/",function(req,res){
	res.render("landing");
});

// show register form
router.get("/register", function(req, res){
   res.render("register", {page: 'register'}); 
});

router.post("/register",function(req,res){
	var newuser = new User({
		username:req.body.username,
		firstname:req.body.firstname,
		lastname:req.body.lastname,
		email:req.body.email,
		avatar:req.body.avatar,
		desc:req.body.desc
	})
    
	if(req.body.admincode === "Harish1999"){
		newuser.isAdmin = true;
	}
	User.register(newuser, req.body.password,function(err,user){
		if(err){
    		console.log(err);
    		return res.render("register", {error: err.message});
		}
		passport.authenticate("local")(req,res,function(){
			req.flash("success","Succesfully Signed Up.Nice to Meet You " + user.username)
			res.redirect("/campgrounds")
		})
	})
})

//show login form
router.get("/login", function(req, res){
   res.render("login", {page: 'login'}); 
});
router.post("/login",passport.authenticate("local",
	{
		successRedirect : "/campgrounds",
		failureRedirect : "/login",
	    successFlash: 'Welcome to YelpCamp!'
	}),function(req,res){
	
})

router.get("/logout",function(req,res){
	req.logout()
	req.flash("success","See You Later! ")
	res.redirect("/campgrounds")
})

router.get('/forgot', function(req, res) {
  res.render('forgot');
});

router.post('/forgot', function(req, res, next) {
  async.waterfall([
    function(done) {
      crypto.randomBytes(20, function(err, buf) {
        var token = buf.toString('hex');
        done(err, token);
      });
    },
    function(token, done) {
      User.findOne({ email: req.body.email }, function(err, user) {
        if (!user) {
          req.flash('error', 'No account with that email address exists.');
          return res.redirect('/forgot');
        }

        user.resetPasswordToken = token;
        user.resetPasswordExpires = Date.now() + 3600000; // 1 hour

        user.save(function(err) {
          done(err, token, user);
        });
      });
    },
    function(token, user, done) {
      var smtpTransport = nodemailer.createTransport({
        service: 'Gmail', 
        auth: {
          user: 'telugumemes2018@gmail.com',
          pass: process.env.GMAILPW
        }
      });
      var mailOptions = {
        to: user.email,
        from: 'telugumemes2018@gmail.com',
        subject: 'Node.js Password Reset',
        text: 'You are receiving this because you (or someone else) have requested the reset of the password for your account.\n\n' +
          'Please click on the following link, or paste this into your browser to complete the process:\n\n' +
          'http://' + req.headers.host + '/reset/' + token + '\n\n' +
          'If you did not request this, please ignore this email and your password will remain unchanged.\n'
      };
      smtpTransport.sendMail(mailOptions, function(err) {
        console.log('mail sent');
        req.flash('success', 'An e-mail has been sent to ' + user.email + ' with further instructions.');
        done(err, 'done');
      });
    }
  ], function(err) {
    if (err) return next(err);
    res.redirect('/forgot');
  });
});

router.get('/reset/:token', function(req, res) {
  User.findOne({ resetPasswordToken: req.params.token, resetPasswordExpires: { $gt: Date.now() } }, function(err, user) {
    if (!user) {
      req.flash('error', 'Password reset token is invalid or has expired.');
      return res.redirect('/forgot');
    }
    res.render('reset', {token: req.params.token});
  });
});

router.post('/reset/:token', function(req, res) {
  async.waterfall([
    function(done) {
      User.findOne({ resetPasswordToken: req.params.token, resetPasswordExpires: { $gt: Date.now() } }, function(err, user) {
        if (!user) {
          req.flash('error', 'Password reset token is invalid or has expired.');
          return res.redirect('back');
        }
        if(req.body.password === req.body.confirm) {
          user.setPassword(req.body.password, function(err) {
            user.resetPasswordToken = undefined;
            user.resetPasswordExpires = undefined;

            user.save(function(err) {
              req.login(user, function(err) {
                done(err, user);
              });
            });
          })
        } else {
            req.flash("error", "Passwords do not match.");
            return res.redirect('back');
        }
      });
    },
    function(user, done) {
      var smtpTransport = nodemailer.createTransport({
        service: 'Gmail', 
        auth: {
          user: 'telugumemes2018@gmail.com',
          pass: process.env.GMAILPW
        }
      });
      var mailOptions = {
        to: user.email,
        from: 'telugumemes2018@mail.com',
        subject: 'Your password has been changed',
        text: 'Hello,\n\n' +
          'This is a confirmation that the password for your account ' + user.email + ' has just been changed.\n'
      };
      smtpTransport.sendMail(mailOptions, function(err) {
        req.flash('success', 'Success! Your password has been changed.');
        done(err);
      });
    }
  ], function(err) {
    res.redirect('/campgrounds');
  });
});

// USER PROFILE
router.get("/users/:id", function(req, res) {
  User.findById(req.params.id, function(err, foundUser) {
    if(err) {
      req.flash("error", "Something went wrong.");
      return res.redirect("/");
    }
    campground.find().where('author.id').equals(foundUser._id).exec(function(err, campgrounds) {
      if(err) {
        req.flash("error", "Something went wrong.");
        return res.redirect("/");
      }
      res.render("users/show", {user: foundUser, campgrounds: campgrounds});
    })
  });
});
router.get("/users/:id/edit",middleware.isLoggedIn,function(req,res){
	User.findById(req.params.id,function(err,edituser){
		res.render("users/edit",{user:edituser})
	})
})
router.put("/users/:id",function(req,res){
	User.findById(req.params.id,function(err,user){
		if(err){
			req.flash("error", "Something went wrong.");
        	return res.redirect("back");
		}else{
			user.username = req.body.username;
            user.firstname = req.body.firstname;
			user.lastname	= req.body.lastname;
			user.email		 =	req.body.email;
			user.avatar 	=	req.body.avatar;
			user.desc  = req.body.desc;
            user.save();
            req.flash("success","Successfully Updated!");
            res.redirect("/users/" + user._id);
		}
	})
});
router.get('/follow/:id', middleware.isLoggedIn, async function(req, res) {
  try {
    let user = await User.findById(req.params.id);
    user.followers.push(req.user._id);
    user.save();
    req.flash('success', 'Successfully followed ' + user.username + '!');
    res.redirect('/users/' + req.params.id);
  } catch(err) {
    req.flash('error', err.message);
    res.redirect('back');
  }
});
// view all notifications
router.get('/notifications', middleware.isLoggedIn, async function(req, res) {
  try {
    let user = await User.findById(req.user._id).populate({
      path: 'notifications',
      options: { sort: { "_id": -1 } }
    }).exec();
    let allNotifications = user.notifications;
    res.render('notifications/index', { allNotifications });
  } catch(err) {
    req.flash('error', err.message);
    res.redirect('back');
  }
});

// handle notification
router.get('/notifications/:id', middleware.isLoggedIn, async function(req, res) {
  try {
    let notification = await Notification.findById(req.params.id);
    notification.isRead = true;
    notification.save();
    res.redirect(`/campgrounds/${notification.campgroundId}`);
  } catch(err) {
    req.flash('error', err.message);
    res.redirect('back');
  }
});
module.exports = router;