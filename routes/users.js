var express = require("express");
var userHelper = require("../helper/userHelper");
var builderHelper = require("../helper/builderHelper");

var router = express.Router();
var db = require("../config/connection");
var collections = require("../config/collections");
const adminHelper = require("../helper/adminHelper");
const ObjectId = require("mongodb").ObjectID;
const path = require('path');
const htmlPdf = require('html-pdf-node');
var fs = require("fs");
const axios = require('axios');
const officerHelper = require("../helper/officerHelper");

const verifySignedIn = (req, res, next) => {
  if (req.session.signedIn) {
    next();
  } else {
    res.redirect("/signin");
  }
};

/* GET home page. */
router.get("/", async function (req, res, next) {
  let user = req.session.user;


  userHelper.getAllworkspaces().then((workspaces) => {
    res.render("users/index", { admin: false, layout: 'home', workspaces, user });
  });
});

router.get("/home", async function (req, res, next) {
  let user = req.session.user;
  userHelper.getAllworkspaces().then(async (workspaces) => {

    // Getting Users Registrations and Its count of each status
    const societyRegistration = await userHelper.getAllregistrations(user._id);

    const bylawRegistrations = await userHelper.getAllbylawregistrations(user._id);
    const allRegistrations = [...societyRegistration || [], ...bylawRegistrations || []];

    const totalApplication = allRegistrations.length;
    const approvedApplication = allRegistrations.filter(reg => reg.status === 'completed').length;
    const rejectedApplication = allRegistrations.filter(reg => reg.status === 'rejected').length;
    const processingApplications = allRegistrations.filter(reg => ['assistant-registrar-review', 'payment', 'deputy-registrar-review', 'joint-registrar-review'].includes(reg.status)).length;

    res.render("users/home", {
      admin: false,
      workspaces,
      user,
      totalApplication,
      approvedApplication,
      rejectedApplication,
      processingApplications
    });
  });
});




// router.get("/index", async function (req, res, next) {
//   let user = req.session.user;
//   userHelper.getAllworkspaces().then((workspaces) => {
//     res.render("users/index", { admin: false, layout: 'home', workspaces, user });
//   });
// });

// router.get("/index", async function (req, res, next) {
//   let user = req.session.user;
//   userHelper.getAllworkspaces().then((workspaces) => {
//     res.render("users/index", { admin: false, workspaces, user });
//   });
// });


router.get("/notifications", verifySignedIn, function (req, res) {
  let user = req.session.user;  // Get logged-in user from session

  // Use the user._id to fetch notifications for the logged-in user
  userHelper.getnotificationById(user._id).then((notifications) => {
    res.render("users/notifications", { admin: false, notifications, user });
  }).catch((err) => {
    console.error("Error fetching notifications:", err);
    res.status(500).send("Error fetching notifications");
  });
});

router.get("/about", async function (req, res) {
  res.render("users/about", { admin: false, });
})


router.get("/contact", async function (req, res) {
  res.render("users/contact", { admin: false, });
})

router.get("/service", async function (req, res) {
  res.render("users/service", { admin: false, });
})


router.post("/add-feedback", async function (req, res) {
  let user = req.session.user; // Ensure the user is logged in and the session is set
  let feedbackText = req.body.text; // Get feedback text from form input
  let username = req.body.username; // Get username from form input
  let workspaceId = req.body.workspaceId; // Get workspace ID from form input
  let builderId = req.body.builderId; // Get builder ID from form input

  if (!user) {
    return res.status(403).send("User not logged in");
  }

  try {
    const feedback = {
      userId: ObjectId(user._id), // Convert user ID to ObjectId
      workspaceId: ObjectId(workspaceId), // Convert workspace ID to ObjectId
      builderId: ObjectId(builderId), // Convert builder ID to ObjectId
      text: feedbackText,
      username: username,
      createdAt: new Date() // Store the timestamp
    };

    await userHelper.addFeedback(feedback);
    res.redirect("/single-workspace/" + workspaceId); // Redirect back to the workspace page
  } catch (error) {
    console.error("Error adding feedback:", error);
    res.status(500).send("Server Error");
  }
});



router.get("/single-workspace/:id", async function (req, res) {
  let user = req.session.user;
  const workspaceId = req.params.id;

  try {
    const workspace = await userHelper.getWorkspaceById(workspaceId);

    if (!workspace) {
      return res.status(404).send("Workspace not found");
    }
    const feedbacks = await userHelper.getFeedbackByWorkspaceId(workspaceId); // Fetch feedbacks for the specific workspace

    res.render("users/single-workspace", {
      admin: false,
      user,
      workspace,
      feedbacks
    });
  } catch (error) {
    console.error("Error fetching workspace:", error);
    res.status(500).send("Server Error");
  }
});




////////////////////PROFILE////////////////////////////////////
router.get("/profile", async function (req, res, next) {
  let user = req.session.user;
  res.render("users/profile", { admin: false, user });
});

////////////////////USER TYPE////////////////////////////////////
router.get("/usertype", async function (req, res, next) {
  res.render("users/usertype", { admin: false, layout: 'empty' });
});





router.get("/signup", function (req, res) {
  if (req.session.signedIn) {
    res.redirect("/");
  } else {
    res.render("users/signup", { admin: false, layout: 'empty' });
  }
});

router.post("/signup", async function (req, res) {
  const { Fname, Email, Phone, Address, Pincode, District, Password } = req.body;
  let errors = {};

  // Check if email already exists
  const existingEmail = await db.get()
    .collection(collections.USERS_COLLECTION)
    .findOne({ Email });

  if (existingEmail) {
    errors.email = "This email is already registered.";
  }

  // Validate phone number length and uniqueness

  if (!Phone) {
    errors.phone = "Please enter your phone number.";
  } else if (!/^\d{10}$/.test(Phone)) {
    errors.phone = "Phone number must be exactly 10 digits.";
  } else {
    const existingPhone = await db.get()
      .collection(collections.USERS_COLLECTION)
      .findOne({ Phone });

    if (existingPhone) {
      errors.phone = "This phone number is already registered.";
    }
  }
  // Validate Pincode
  // if (!Pincode) {
  //   errors.pincode = "Please enter your pincode.";
  // } else if (!/^\d{6}$/.test(Pincode)) {
  //   errors.pincode = "Pincode must be exactly 6 digits.";
  // }

  if (!Fname) errors.fname = "Please enter your first name.";
  if (!Email) errors.email = "Please enter your email.";
  // if (!Address) errors.address = "Please enter your address.";
  // if (!District) errors.district = "Please enter your city.";

  // Password validation
  if (!Password) {
    errors.password = "Please enter a password.";
  } else {
    const strongPasswordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_])[A-Za-z\d\W_]{8,}$/;
    if (!strongPasswordRegex.test(Password)) {
      errors.password = "Password must be at least 8 characters long and include an uppercase letter, a lowercase letter, a number, and a special character.";
    }
  }

  if (Object.keys(errors).length > 0) {
    return res.render("users/signup", {
      admin: false,
      layout: 'empty',
      errors,
      Fname,
      Email,
      Phone,
      // Address,
      // Pincode,
      // District,
      Password
    });
  }

  // Proceed with signup
  userHelper.doSignup(req.body).then((response) => {
    req.session.signedIn = true;
    req.session.user = response;
    res.redirect("/");
  }).catch((err) => {
    console.error("Signup error:", err);
    res.status(500).send("An error occurred during signup.");
  });
});


router.get("/signin", function (req, res) {
  if (req.session.signedIn) {
    res.redirect("/");
  } else {
    res.render("users/signin", {
      admin: false,
      layout: 'empty',
      signInErr: req.session.signInErr,
    });
    req.session.signInErr = null;
  }
});


router.post("/signin", function (req, res) {
  const { Email, Password } = req.body;

  if (!Email || !Password) {
    req.session.signInErr = "Please fill in all fields.";
    return res.render("users/signin", {
      admin: false,
      layout: 'empty',
      signInErr: req.session.signInErr,
      email: Email,
      password: Password,
    });
  }

  userHelper.doSignin(req.body).then((response) => {
    if (response.status) {
      req.session.signedIn = true;
      req.session.user = response.user;
      res.redirect("/");
    } else {
      // If the user is disabled, display the message
      req.session.signInErr = response.msg || "Invalid Email/Password";
      res.render("users/signin", {
        admin: false,
        layout: 'empty',
        signInErr: req.session.signInErr,
        email: Email
      });
    }
  });
});




router.get("/signout", function (req, res) {
  req.session.signedIn = false;
  req.session.user = null;
  res.redirect("/");
});

router.get("/edit-profile/:id", verifySignedIn, async function (req, res) {
  let user = req.session.user;
  let userId = req.session.user._id;
  let userProfile = await userHelper.getUserDetails(userId);
  res.render("users/edit-profile", { admin: false, userProfile, user });
});

router.post("/edit-profile/:id", verifySignedIn, async function (req, res) {
  try {
    const { Fname, Lname, Email, Phone, Address, District, Pincode } = req.body;
    let errors = {};

    // Validate first name
    if (!Fname || Fname.trim().length === 0) {
      errors.fname = 'Please enter your first name.';
    }

    if (!District || District.trim().length === 0) {
      errors.district = 'Please enter your first name.';
    }

    // Validate last name
    if (!Lname || Lname.trim().length === 0) {
      errors.lname = 'Please enter your last name.';
    }

    // Validate email format
    if (!Email || !/^\S+@\S+\.\S+$/.test(Email)) {
      errors.email = 'Please enter a valid email address.';
    }

    // Validate phone number
    if (!Phone) {
      errors.phone = "Please enter your phone number.";
    } else if (!/^\d{10}$/.test(Phone)) {
      errors.phone = "Phone number must be exactly 10 digits.";
    }


    // Validate pincode
    if (!Pincode) {
      errors.pincode = "Please enter your pincode.";
    } else if (!/^\d{6}$/.test(Pincode)) {
      errors.pincode = "Pincode must be exactly 6 digits.";
    }

    if (!Fname) errors.fname = "Please enter your first name.";
    if (!Lname) errors.lname = "Please enter your last name.";
    if (!Email) errors.email = "Please enter your email.";
    if (!Address) errors.address = "Please enter your address.";
    if (!District) errors.district = "Please enter your district.";

    // Validate other fields as needed...

    // If there are validation errors, re-render the form with error messages
    if (Object.keys(errors).length > 0) {
      let userProfile = await userHelper.getUserDetails(req.params.id);
      return res.render("users/edit-profile", {
        admin: false,
        userProfile,
        user: req.session.user,
        errors,
        Fname,
        Lname,
        Email,
        Phone,
        Address,
        District,
        Pincode,
      });
    }

    // Update the user profile
    await userHelper.updateUserProfile(req.params.id, req.body);

    // Fetch the updated user profile and update the session
    let updatedUserProfile = await userHelper.getUserDetails(req.params.id);
    req.session.user = updatedUserProfile;

    // Redirect to the profile page
    res.redirect("/profile");
  } catch (err) {
    console.error("Profile update error:", err);
    res.status(500).send("An error occurred while updating the profile.");
  }
});

router.get("/requested", function (req, res) {
  let user = req.session.user;

  userHelper.getAllregistrations(user._id).then((registrations) => {
    const transformedRegistrations = userHelper.transformRegistrations(registrations);

    if (transformedRegistrations.length === 0) {
      return res.redirect("/registration");
    }

    res.render("users/requested", {
      admin: false,
      layout: "layout",
      registrations: transformedRegistrations,
      user
    });
  });
});


router.get("/preview/requested", function (req, res) {
  let user = req.session.user;

  let dummyRegistrationStatus = [
    {
      "_id": "123456",
      "status": "payment",
      "reason": "",
      "steps": [
        { "name": "form-submitted", "status": "completed" },
        { "name": "payment", "status": "active" },
        { "name": "assistant-registrar-review", "status": "inactive" },
        { "name": "deputy-registrar-review", "status": "inactive" },
        { "name": "joint-registrar-review", "status": "inactive" },
        { "name": "completed", "status": "inactive" }
      ]
    },
    {
      "_id": "789101",
      "status": "completed",
      "reason": "",
      "steps": [
        { "name": "form-submitted", "status": "completed" },
        { "name": "payment", "status": "completed" },
        { "name": "assistant-registrar-review", "status": "completed" },
        { "name": "deputy-registrar-review", "status": "completed" },
        { "name": "joint-registrar-review", "status": "completed" },
        { "name": "completed", "status": "completed" }
      ]
    },
    {
      "_id": "112131",
      "status": "rejected",
      "reason": "Incomplete information submitted.",
      "steps": [
        { "name": "form-submitted", "status": "completed" },
        { "name": "payment", "status": "completed" },
        { "name": "assistant-registrar-review", "status": "rejected" },
        { "name": "deputy-registrar-review", "status": "rejected" },
        { "name": "joint-registrar-review", "status": "inactive" },
        { "name": "completed", "status": "inactive" }
      ]
    }
  ];

  res.render("users/requested", { admin: false, layout: "layout", registrations: dummyRegistrationStatus, dummyRegistrationStatus, user });

});

///////ADD registration/////////////////////                                         
router.get("/registration", verifySignedIn, async (req, res) => {
  try {
    const userId = req.session.user._id; // Assuming `user._id` is stored in the session
    const registration = await db.get()
      .collection(collections.REGISTRATION)
      .findOne({ userId: new ObjectId(userId) }); // Find the user's registration data

    // if (registration) {


    //   return res.redirect("/requested");
    // }

    // If no pending status, render the registration page
    res.render("users/registration", { admin: false, layout: "layout", user: req.session.user });
  } catch (error) {
    console.error("Error fetching registration status:", error);
    res.status(500).send("Something went wrong. Please try again.");
  }
});


router.post("/registration", function (req, res) {
  try {
    const registrationData = req.body;

    // Ensure all three required files are received
    const proposedByeLaws = req.files ? req.files.ProposedByeLaws : null;
    const promotingCommitteeMinutes = req.files ? req.files.PromotingCommitteeMinutes : null;
    const projectReport = req.files ? req.files.ProjectReport : null;

    // Store file paths
    const documentFiles = [
      { file: proposedByeLaws, name: "ProposedByeLaws" },
      { file: promotingCommitteeMinutes, name: "PromotingCommitteeMinutes" },
      { file: projectReport, name: "ProjectReport" }
    ];

    const documentPaths = [];

    documentFiles.forEach(({ file, name }, index) => {
      if (file) {
        // Generate unique filename
        const uniqueFileName = `${Date.now()}-${index}-${file.name.replace(/\s+/g, '')}`;
        const filePath = `/documents/${uniqueFileName}`;

        // Move file to public documents directory
        file.mv(`./public${filePath}`, (err) => {
          if (err) {
            console.error(`File upload error (${name}):`, err);
          }
        });

        documentPaths.push({ [name]: filePath });
      }
    });

    // Add document paths to registration data
    registrationData.documents = documentPaths;

    // Setting Payment Pending
    registrationData.status = 'form-submitted';

    userHelper.registration(registrationData, (id) => {
      res.redirect("/requested");
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).send('Registration failed');
  }
});




router.get('/place-order/:id', verifySignedIn, async (req, res) => {
  const workspaceId = req.params.id;

  // Validate the workspace ID
  if (!ObjectId.isValid(workspaceId)) {
    return res.status(400).send('Invalid workspace ID format');
  }

  let user = req.session.user;

  // Fetch the product details by ID
  let workspace = await userHelper.getWorkspaceDetails(workspaceId);

  // If no workspace is found, handle the error
  if (!workspace) {
    return res.status(404).send('Workspace not found');
  }

  // Render the place-order page with workspace details
  res.render('users/place-order', { user, workspace });
});

router.post('/place-order', async (req, res) => {
  let user = req.session.user;
  let workspaceId = req.body.workspaceId;

  // Fetch workspace details
  let workspace = await userHelper.getWorkspaceDetails(workspaceId);
  let totalPrice = workspace.Price; // Get the price from the workspace

  // Call placeOrder function
  userHelper.placeOrder(req.body, workspace, totalPrice, user)
    .then((orderId) => {
      if (req.body["payment-method"] === "COD") {
        res.json({ codSuccess: true });
      } else {
        userHelper.generateRazorpay(orderId, totalPrice).then((response) => {
          res.json(response);
        });
      }
    })
    .catch((err) => {
      console.error("Error placing order:", err);
      res.status(500).send("Internal Server Error");
    });
});



router.post("/verify-payment", async (req, res) => {
  console.log(req.body);
  userHelper
    .verifyPayment(req.body)
    .then(() => {
      userHelper.changePaymentStatus(req.body["order[receipt]"]).then(() => {
        res.json({ status: true });
      });
    })
    .catch((err) => {
      res.json({ status: false, errMsg: "Payment Failed" });
    });
});

router.get("/order-placed", verifySignedIn, async (req, res) => {
  let user = req.session.user;
  let userId = req.session.user._id;
  // le = await userHelper.g(userId);
  res.render("users/order-placed", { admin: false, user });
});

router.get("/orders", verifySignedIn, async function (req, res) {
  let user = req.session.user;
  let userId = req.session.user._id;
  // Fetch user orders
  let orders = await userHelper.getUserOrder(userId);
  res.render("users/orders", { admin: false, user, orders });
});

router.get("/view-ordered-workspaces/:id", verifySignedIn, async function (req, res) {
  let user = req.session.user;
  let orderId = req.params.id;

  // Log the orderId to see if it's correctly retrieved
  console.log("Retrieved Order ID:", orderId);

  // Check if orderId is valid
  if (!ObjectId.isValid(orderId)) {
    console.error('Invalid Order ID format:', orderId);  // Log the invalid ID
    return res.status(400).send('Invalid Order ID');
  }

  try {
    let workspaces = await userHelper.getOrderWorkspaces(orderId);
    res.render("users/order-workspaces", {
      admin: false,
      user,
      workspaces,
    });
  } catch (err) {
    console.error('Error fetching ordered workspaces:', err);
    res.status(500).send('Internal Server Error');
  }
});

router.get("/payment/:id", verifySignedIn, async function (req, res) {
  let user = req.session.user;
  const registrationId = req.params.id;

  try {
    const registration = await db.get()
      .collection(collections.REGISTRATION)
      .findOne({ _id: ObjectId(registrationId) });

    if (!registration) {
      return res.status(404).send("Registration not found");
    }

    const paymentOptions = [
      {
        "title": "Additional Limit in District",
        "description": "Extended operational area within district",
        "value": 10000
      },
      {
        "title": "District Limit Group",
        "description": "Standard district-level registration",
        "value": 5000
      },
      {
        "title": "Additional in Taluk",
        "description": "Extended area within taluk limits",
        "value": 4000
      }
    ]

    res.render("users/payment", { admin: false, layout: "layout", registrationId, user, paymentOptions });
  } catch (error) {
    console.error("Error fetching registration:", error);
    res.status(500).send("Something went wrong. Please try again.");
  }
});


router.get("/cancel-order/:id", verifySignedIn, function (req, res) {
  let orderId = req.params.id;
  userHelper.cancelOrder(orderId).then(() => {
    res.redirect("/orders");
  });
});

router.post("/search", verifySignedIn, async function (req, res) {
  let user = req.session.user;
  let userId = req.session.user._id;
  // le = await userHelper.g(userId);
  userHelper.searchProduct(req.body).then((response) => {
    res.render("users/search-result", { admin: false, user, response });
  });
});

router.post('/create-order', (req, res) => {
  const { amount, registrationId } = req.body;
  userHelper.generateRazorpay(registrationId, amount).then((order) => {
    res.json(order);
  }).catch((err) => {
    console.error("Error creating order:", err);
    res.status(500).send("Internal Server Error");
  });
});

router.post('/verify-payment', (req, res) => {
  userHelper.verifyPayment(req.body).then(() => {
    res.json({ status: true });
  }).catch((err) => {
    res.json({ status: false, errMsg: "Payment Failed" });
  });
});

router.post('/update-registration-status/:id', verifySignedIn, async (req, res) => {
  const registrationId = req.params.id;
  const { status } = req.body;

  try {
    await userHelper.changeRegistrationStatus(registrationId, status);
    res.json({ success: true });
  } catch (error) {
    console.error("Error updating registration status:", error);
    res.json({ success: false, error: "Failed to update registration status" });
  }
});


router.post('/update-bylawregistration-status/:id', verifySignedIn, async (req, res) => {
  const bylawregistrationId = req.params.id;
  const { status } = req.body;

  try {
    await userHelper.changebylawRegistrationStatus(bylawregistrationId, status);
    res.json({ success: true });
  } catch (error) {
    console.error("Error updating bylawregistration status:", error);
    res.json({ success: false, error: "Failed to update bylawregistration status" });
  }
});






router.get("/bylawrequested", function (req, res) {
  let user = req.session.user;

  userHelper.getAllbylawregistrations(user._id).then((bylawregistrations) => {
    const transformedbylawRegistrations = userHelper.transformbylawRegistrations(bylawregistrations);

    if (transformedbylawRegistrations.length === 0) {
      return res.redirect("/bylawregistration");
    }

    res.render("users/bylawrequested", {
      admin: false,
      layout: "layout",
      bylawregistrations: transformedbylawRegistrations,
      user
    });
  });
});


router.get("/preview/bylawrequested", function (req, res) {
  let user = req.session.user;

  let dummyRegistrationStatus = [
    {
      "_id": "123456",
      "status": "payment",
      "reason": "",
      "steps": [
        { "name": "form-submitted", "status": "completed" },
        { "name": "payment", "status": "active" },
        { "name": "assistant-registrar-review", "status": "inactive" },
        { "name": "deputy-registrar-review", "status": "inactive" },
        { "name": "joint-registrar-review", "status": "inactive" },
        { "name": "completed", "status": "inactive" }
      ]
    },
    {
      "_id": "789101",
      "status": "completed",
      "reason": "",
      "steps": [
        { "name": "form-submitted", "status": "completed" },
        { "name": "payment", "status": "completed" },
        { "name": "assistant-registrar-review", "status": "completed" },
        { "name": "deputy-registrar-review", "status": "completed" },
        { "name": "joint-registrar-review", "status": "completed" },
        { "name": "completed", "status": "completed" }
      ]
    },
    {
      "_id": "112131",
      "status": "rejected",
      "reason": "Incomplete information submitted.",
      "steps": [
        { "name": "form-submitted", "status": "completed" },
        { "name": "payment", "status": "completed" },
        { "name": "assistant-registrar-review", "status": "rejected" },
        { "name": "deputy-registrar-review", "status": "rejected" },
        { "name": "joint-registrar-review", "status": "inactive" },
        { "name": "completed", "status": "inactive" }
      ]
    }
  ];

  res.render("users/bylawrequested", { admin: false, layout: "layout", registrations: dummyRegistrationStatus, dummyRegistrationStatus, user });

});






///////ADD bylawregistration/////////////////////                                         
router.get("/bylawregistration", verifySignedIn, async (req, res) => {
  try {

    // If no pending status, render the bylawregistration page
    res.render("users/bylawregistration", { admin: false, layout: "layout", user: req.session.user });
  } catch (error) {
    console.error("Error fetching bylawregistration status:", error);
    res.status(500).send("Something went wrong. Please try again.");
  }
});


router.post("/bylawregistration", function (req, res) {
  try {
    const bylawregistrationData = req.body;

    // Ensure all required files are received
    const minutesOfDirectorBoardMeeting = req.files ? req.files.DirectorBoardMinutes : null;
    const minutesOfAnnualSpecialGBMeeting = req.files ? req.files.AnnualSpecialGBMinutes : null;
    const affidavit = req.files ? req.files.Affidavit : null;
    const noticeOfGBMeeting = req.files ? req.files.GBMeetingNotice : null;
    const detailsOfServingOfNotice = req.files ? req.files.ServingNoticeDetails : null;
    const challanPayment = req.files ? req.files.ChallanPayment : null;

    // Store file paths
    const documentFiles = [
      { file: minutesOfDirectorBoardMeeting, name: "MinutesOfDirectorBoardMeeting" },
      { file: minutesOfAnnualSpecialGBMeeting, name: "MinutesOfAnnualSpecialGBMeeting" },
      { file: affidavit, name: "Affidavit" },
      { file: noticeOfGBMeeting, name: "NoticeOfGBMeeting" },
      { file: detailsOfServingOfNotice, name: "DetailsOfServingOfNotice" },
      { file: challanPayment, name: "ChallanPayment" }
    ];

    const documentPaths = [];

    documentFiles.forEach(({ file, name }, index) => {
      if (file) {
        // Generate unique filename
        const uniqueFileName = `${Date.now()}-${index}-${file.name.replace(/\s+/g, '')}`;
        const filePath = `/bylaw-documents/${uniqueFileName}`;

        // Move file to public documents directory
        file.mv(`./public${filePath}`, (err) => {
          if (err) {
            console.error(`File upload error (${name}):`, err);
          }
        });

        documentPaths.push({ [name]: filePath });
      }
    });

    // Add document paths to bylawregistration data
    bylawregistrationData.documents = documentPaths;

    // Setting Payment Pending
    bylawregistrationData.status = 'form-submitted';

    userHelper.bylawregistration(bylawregistrationData, (id) => {
      res.redirect("/bylawrequested");
    });
  } catch (error) {
    console.error('bylawRegistration error:', error);
    res.status(500).send('bylawRegistration failed');
  }
});


router.post('/create-order-bylaw', (req, res) => {
  const { amount, bylawregistrationId } = req.body;
  userHelper.generateRazorpay(bylawregistrationId, amount).then((order) => {
    res.json(order);
  }).catch((err) => {
    console.error("Error creating order:", err);
    res.status(500).send("Internal Server Error");
  });
});




router.get("/bylawpayment/:id", verifySignedIn, async function (req, res) {
  let user = req.session.user;
  const bylawregistrationId = req.params.id;

  try {
    const bylawregistration = await db.get()
      .collection(collections.BYLAWREGISTRATION)
      .findOne({ _id: ObjectId(bylawregistrationId) });

    if (!bylawregistration) {
      return res.status(404).send("BylawRegistration not found");
    }

    const paymentOptions = [
      {
        "title": "For All Groups",
        "description": "Extended operational area within district",
        "value": 500
      },
      {
        "title": "For SC/ST, Women, and School Groups",
        "description": "Standard district-level registration",
        "value": 50
      },
    ]

    res.render("users/bylawpayment", { admin: false, layout: "layout", bylawregistrationId, user, paymentOptions });
  } catch (error) {
    console.error("Error fetching registration:", error);
    res.status(500).send("Something went wrong. Please try again.");
  }
});

router.get("/audit", verifySignedIn, async function (req, res) {
  let user = req.session.user;

  try {
    const audits = await userHelper.getAuditsByUserId(user._id);
    res.render("users/user-audit", {
      admin: false,
      layout: "layout", user, audits
    });
  } catch (error) {
    console.error("Error fetching audits:", error);
    res.status(500).send("Something went wrong. Please try again.");
  }
});

router.post('/submit-audit-documents/:auditId', verifySignedIn, async (req, res) => {
  const auditId = req.params.auditId;
  let { documents } = req.body;
  try {
    console.log(req.files)
    const annualAuditReport = req.files ? req.files.annualAuditReport : null;
    const minutesOfAGM = req.files ? req.files.minutesOfAGM : null;
    const updatedMemberList = req.files ? req.files.updatedMemberList : null;
    const incomeExpenditureStatement = req.files ? req.files.incomeExpenditureStatement : null;

    const documentFiles = [
      { file: annualAuditReport, name: "annualAuditReport" },
      { file: minutesOfAGM, name: "minutesOfAGM" },
      { file: updatedMemberList, name: "updatedMemberList" },
      { file: incomeExpenditureStatement, name: "incomeExpenditureStatement" }
    ];

    const documentPaths = [];

    documentFiles.forEach(({ file, name }, index) => {
      if (file) {
        const uniqueFileName = `${Date.now()}-${index}-${file.name.replace(/\s+/g, '')}`;
        const filePath = `/audit-documents/${uniqueFileName}`;

        file.mv(`./public${filePath}`, (err) => {
          if (err) {
            console.error(`File upload error (${name}):`, err);
          }
        });

        documentPaths.push({ [name]: filePath });
      }
    });

    documents = documentPaths;
    await userHelper.submitAuditDocuments(auditId, documents);
    res.json({ success: true });
  } catch (error) {
    console.error('Error submitting audit documents:', error);
    res.json({ success: false, error: 'Failed to submit audit documents' });
  }
});




// View training materials
router.get('/training', async (req, res) => {
  try {
    let user = req.session.user;

    const trainingMaterials = await adminHelper.getAllMaterials();
    const completedMaterials = await userHelper.getAllCompletedMeterials(req.session.user._id);

    // Map through training materials and set the status if completed
    const materialsWithStatus = trainingMaterials.map(material => {
      const isCompleted = completedMaterials.some(completed => completed._id.toString() === material._id.toString());
      return {
        ...material,
        status: isCompleted ? 'completed' : 'pending'
      };
    });

    res.render('users/training-materials', {
      admin: false,
      layout: "layout",trainingMaterials: materialsWithStatus,user
    });
  } catch (error) {
    console.error('Error fetching training materials:', error);
    res.status(500).send('Internal Server Error');
  }
});

// Complete training material
router.post('/training/complete/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.session.user._id;
    await userHelper.completeTrainingMaterial(userId, id);
    res.redirect('/training');
  } catch (error) {
    console.error('Error completing training material:', error);
    res.status(500).send('Internal Server Error');
  }
});

// Generate certificate
router.get('/training/certificate/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const user = req.session.user;
    const material = await adminHelper.getMaterialDetails(id);

    // Enhanced certificate HTML with improved styling
    const fullHtml = `
    <!DOCTYPE html>
    <html>
      <head>
      <meta charset="UTF-8">
      <title>Certificate of Completion</title>
      <style>
        body {
        font-family: 'Times New Roman', Times, serif;
        text-align: center;
        padding: 50px;
        background: #f9f9f9;
        }
        .certificate {
        width: 80%;
        margin: 0 auto;
        padding: 40px;
        border: 15px solid #2c3e50;
        background: #fff;
        box-shadow: 5px 5px 15px rgba(0, 0, 0, 0.2);
        position: relative;
        }
        .certificate::before, .certificate::after {
        content: '';
        position: absolute;
        border: 2px solid #2c3e50;
        top: 10px;
        bottom: 10px;
        left: 10px;
        right: 10px;
        }
        .certificate h1 {
        font-size: 50px;
        color: #2c3e50;
        margin-bottom: 20px;
        }
        .certificate p {
        font-size: 20px;
        margin: 10px 0;
        }
        .certificate h2 {
        font-size: 35px;
        color: #34495e;
        margin: 20px 0;
        }
        .certificate h3 {
        font-size: 30px;
        color: #16a085;
        }
        .signature {
        margin-top: 50px;
        display: flex;
        justify-content: space-between;
        padding: 0 50px;
        }
        .signature div {
        border-top: 2px solid #000;
        width: 40%;
        text-align: center;
        font-size: 18px;
        padding-top: 5px;
        }
      </style>
      </head>
      <body>
      <div class="certificate">
        <h1>Certificate of Completion</h1>
        <p>This is to certify that</p>
        <h2>${user.Fname} ${user.Lname}</h2>
        <p>has successfully completed the training material</p>
        <h3>${material.title}</h3>
        <p>on ${new Date().toLocaleDateString()}</p>
   
      </div>
      
      </body>
    </html>
    `;

    const options = {
      format: 'A4',
      margin: {
        top: '20mm',
        right: '20mm',
        bottom: '20mm',
        left: '20mm'
      },
      printBackground: true,
      preferCSSPageSize: true
    };

    const dir = path.join(__dirname, '../public/certificates');
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    const pdfPath = path.join(dir, `${user._id}-${material.title}.pdf`);
    const file = { content: fullHtml };
    const pdfBuffer = await htmlPdf.generatePdf(file, options);
    fs.writeFileSync(pdfPath, pdfBuffer);

    res.download(pdfPath);
  } catch (error) {
    console.error('Error generating certificate:', error);
    res.status(500).send('Internal Server Error');
  }
});

// AI Chatbot page
router.get('/chatbot', verifySignedIn, async (req, res) => {
  try {
    const userId = req.session.user._id;
    const chatMessages = await userHelper.getChatMessages(userId);
    res.render('users/chat-with-ai', {
      admin: false,
      layout: "layout", user: req.session.user, chatMessages
    });
  } catch (error) {
    console.error('Error fetching chat messages:', error);
    res.status(500).send('Internal Server Error');
  }
});

// Query AI Chatbot
router.post('/chat-with-ai/query', verifySignedIn, async (req, res) => {
  try {
    const { query } = req.body;
    const userId = req.session.user._id;
    const settings = await adminHelper.getAIChatbotSettings();
    const response = await axios.post(
      'https://api.together.xyz/v1/completions',
      {
        model: 'mistralai/Mistral-7B-Instruct-v0.1',
        prompt: `${settings.prompt}\nUser: ${query}\nAI:`,
        max_tokens: 200,
      },
      {
        headers: { Authorization: `Bearer f4a911ae033eb1b34093cc4d80e28881270d57f6626d605a0a1727fc169f95e9` },
      }
    );

    const aiResponse = response.data.choices[0].text;

    // Save user query and AI response to the database
    await userHelper.saveChatMessage(userId, query, 'user');
    await userHelper.saveChatMessage(userId, aiResponse, 'ai');

    res.json({ response: aiResponse });
  } catch (error) {
    console.error('Error querying AI:', error);
    res.status(500).send('Internal Server Error');
  }
});

// Register a complaint
router.post('/complaints/register', verifySignedIn, async (req, res) => {
  try {
    const userId = req.session.user._id;
    const { text } = req.body;

    await officerHelper.registerComplaint(userId, text);
    res.redirect('/complaints');
  } catch (error) {
    console.error('Error registering complaint:', error);
    res.status(500).send('Internal Server Error');
  }
});

// View user complaints
router.get('/complaints', verifySignedIn, async (req, res) => {
  try {
    const userId = req.session.user._id;
    const complaints = await officerHelper.getUserComplaints(userId);

    res.render('users/complaints', { admin: false, layout: 'layout', user: req.session.user, complaints });
  } catch (error) {
    console.error('Error fetching complaints:', error);
    res.status(500).send('Internal Server Error');
  }
});

module.exports = router;
