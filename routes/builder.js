var express = require("express");
var builderHelper = require("../helper/builderHelper");
var fs = require("fs");
const userHelper = require("../helper/userHelper");
const adminHelper = require("../helper/adminHelper");

var router = express.Router();
var db = require("../config/connection");
var collections = require("../config/collections");
const ObjectId = require("mongodb").ObjectID;


const verifySignedIn = (req, res, next) => {
  if (req.session.signedInBuilder) {
    next();
  } else {
    res.redirect("/builder/signin");
  }
};

/* GET admins listing. */
router.get("/", verifySignedIn, function (req, res, next) {
  let builder = req.session.builder;
  res.render("builder/home", { builder: true, layout: "layout", builder });
});


///////ALL notification/////////////////////                                         
router.get("/all-notifications", verifySignedIn, async function (req, res) {
  let builder = req.session.builder;

  // Ensure you have the builder's ID available
  let builderId = builder._id; // Adjust based on how builder ID is stored in session

  // Pass builderId to getAllOrders
  let orders = await builderHelper.getAllOrders(builderId);
  let notifications = await builderHelper.getAllnotifications(builderId)
  res.render("builder/all-notifications", { builder: true, layout: "layout", notifications, builder, orders });
});

///////ADD notification/////////////////////                                         
router.get("/add-notification", verifySignedIn, function (req, res) {
  let builder = req.session.builder;
  res.render("builder/all-notifications", { builder: true, layout: "layout", builder });
});

///////ADD notification/////////////////////                                         
router.post("/add-notification", function (req, res) {
  builderHelper.addnotification(req.body, (id) => {
    res.redirect("/builder/all-notifications");
  });
});

router.get("/delete-notification/:id", verifySignedIn, function (req, res) {
  let notificationId = req.params.id;
  adminHelper.deletenotification(notificationId).then((response) => {
    res.redirect("/builder/all-notifications");
  });
});

///////EDIT notification/////////////////////                                         
router.get("/edit-notification/:id", verifySignedIn, async function (req, res) {
  let builder = req.session.builder;
  let notificationId = req.params.id;
  let notification = await builderHelper.getnotificationDetails(notificationId);
  console.log(notification);
  res.render("builder/edit-notification", { builder: true, layout: "layout", notification, builder });
});

///////EDIT notification/////////////////////                                         
router.post("/edit-notification/:id", verifySignedIn, function (req, res) {
  let notificationId = req.params.id;
  builderHelper.updatenotification(notificationId, req.body).then(() => {
    if (req.files) {
      let image = req.files.Image;
      if (image) {
        image.mv("./public/images/notification-images/" + notificationId + ".png");
      }
    }
    res.redirect("/builder/all-notifications");
  });
});

///////DELETE notification/////////////////////                                         
router.get("/delete-notification/:id", verifySignedIn, function (req, res) {
  let notificationId = req.params.id;
  builderHelper.deletenotification(notificationId).then((response) => {
    res.redirect("/builder/all-notifications");
  });
});

///////DELETE ALL notification/////////////////////                                         
router.get("/delete-all-notifications", verifySignedIn, function (req, res) {
  builderHelper.deleteAllnotifications().then(() => {
    res.redirect("/builder/all-notifications");
  });
});


////////////////////PROFILE////////////////////////////////////
router.get("/profile", async function (req, res, next) {
  let builder = req.session.builder;
  res.render("builder/profile", { builder: true, layout: "layout", builder });
});


///////ALL workspace/////////////////////                                         
// router.get("/all-feedbacks", verifySignedIn, async function (req, res) {
//   let builder = req.session.builder;

//   const workspaceId = req.params.id;

//   console.log('workspace')

//   try {
//     const workspace = await userHelper.getWorkspaceById(workspaceId);
//     const feedbacks = await userHelper.getFeedbackByWorkspaceId(workspaceId); // Fetch feedbacks for the specific workspace
//     console.log('feedbacks', feedbacks)
//     res.render("builder/all-feedbacks", { builder: true, layout: "layout", workspace, feedbacks, builder });
//   } catch (error) {
//     console.error("Error fetching workspace:", error);
//     res.status(500).send("Server Error");
//   }

// });


router.get("/builder-feedback", async function (req, res) {
  let builder = req.session.builder; // Get the builder from session

  if (!builder) {
    return res.status(403).send("Builder not logged in");
  }

  try {
    // Fetch feedback for this builder
    const feedbacks = await builderHelper.getFeedbackByBuilderId(builder._id);

    // Fetch workspace details for each feedback
    const feedbacksWithWorkspaces = await Promise.all(feedbacks.map(async feedback => {
      const workspace = await userHelper.getWorkspaceById(ObjectId(feedback.workspaceId)); // Convert workspaceId to ObjectId
      if (workspace) {
        feedback.workspaceName = workspace.name; // Attach workspace name to feedback
      }
      return feedback;
    }));

    // Render the feedback page with builder, feedbacks, and workspace data
    res.render("builder/all-feedbacks", {
      builder,  // Builder details
      feedbacks: feedbacksWithWorkspaces // Feedback with workspace details
    });
  } catch (error) {
    console.error("Error fetching feedback and workspaces:", error);
    res.status(500).send("Server Error");
  }
});



///////ALL workspace/////////////////////                                         
router.get("/all-workspaces", verifySignedIn, function (req, res) {
  let builder = req.session.builder;
  builderHelper.getAllworkspaces(req.session.builder._id).then((workspaces) => {
    res.render("builder/all-workspaces", { builder: true, layout: "layout", workspaces, builder });
  });
});

///////ADD workspace/////////////////////                                         
router.get("/add-workspace", verifySignedIn, function (req, res) {
  let builder = req.session.builder;
  res.render("builder/add-workspace", { builder: true, layout: "layout", builder });
});

///////ADD workspace/////////////////////                                         
router.post("/add-workspace", function (req, res) {
  // Ensure the builder is signed in and their ID is available
  if (req.session.signedInBuilder && req.session.builder && req.session.builder._id) {
    const builderId = req.session.builder._id; // Get the builder's ID from the session

    // Pass the builderId to the addworkspace function
    builderHelper.addworkspace(req.body, builderId, (workspaceId, error) => {
      if (error) {
        console.log("Error adding workspace:", error);
        res.status(500).send("Failed to add workspace");
      } else {
        let image = req.files.Image;
        image.mv("./public/images/workspace-images/" + workspaceId + ".png", (err) => {
          if (!err) {
            res.redirect("/builder/all-workspaces");
          } else {
            console.log("Error saving workspace image:", err);
            res.status(500).send("Failed to save workspace image");
          }
        });
      }
    });
  } else {
    // If the builder is not signed in, redirect to the sign-in page
    res.redirect("/builder/signin");
  }
});


///////EDIT workspace/////////////////////                                         
router.get("/edit-workspace/:id", verifySignedIn, async function (req, res) {
  let builder = req.session.builder;
  let workspaceId = req.params.id;
  let workspace = await builderHelper.getworkspaceDetails(workspaceId);
  console.log(workspace);
  res.render("builder/edit-workspace", { builder: true, layout: "layout", workspace, builder });
});

///////EDIT workspace/////////////////////                                         
router.post("/edit-workspace/:id", verifySignedIn, function (req, res) {
  let workspaceId = req.params.id;
  builderHelper.updateworkspace(workspaceId, req.body).then(() => {
    if (req.files) {
      let image = req.files.Image;
      if (image) {
        image.mv("./public/images/workspace-images/" + workspaceId + ".png");
      }
    }
    res.redirect("/builder/all-workspaces");
  });
});

///////DELETE workspace/////////////////////                                         
router.get("/delete-workspace/:id", verifySignedIn, function (req, res) {
  let workspaceId = req.params.id;
  builderHelper.deleteworkspace(workspaceId).then((response) => {
    fs.unlinkSync("./public/images/workspace-images/" + workspaceId + ".png");
    res.redirect("/builder/all-workspaces");
  });
});

///////DELETE ALL workspace/////////////////////                                         
router.get("/delete-all-workspaces", verifySignedIn, function (req, res) {
  builderHelper.deleteAllworkspaces().then(() => {
    res.redirect("/builder/all-workspaces");
  });
});


router.get("/all-users", verifySignedIn, async function (req, res) {
  let builder = req.session.builder;

  // Ensure you have the builder's ID available
  let builderId = builder._id; // Adjust based on how builder ID is stored in session

  // Pass builderId to getAllOrders
  let orders = await builderHelper.getAllOrders(builderId);

  res.render("builder/all-users", {
    builder: true,
    layout: "layout",
    orders,
    builder
  });
});

router.get("/all-transactions", verifySignedIn, async function (req, res) {
  let builder = req.session.builder;

  // Ensure you have the builder's ID available
  let builderId = builder._id; // Adjust based on how builder ID is stored in session

  // Pass builderId to getAllOrders
  let orders = await builderHelper.getAllOrders(builderId);

  res.render("builder/all-transactions", {
    builder: true,
    layout: "layout",
    orders,
    builder
  });
});

router.get("/pending-approval", function (req, res) {
  if (!req.session.signedInBuilder || req.session.builder.approved) {
    res.redirect("/builder");
  } else {
    res.render("builder/pending-approval", {
      builder: true, layout: "empty",
    });
  }
});


router.get("/signup", function (req, res) {
  if (req.session.signedInBuilder) {
    res.redirect("/builder");
  } else {
    res.render("builder/signup", {
      builder: true, layout: "empty",
      signUpErr: req.session.signUpErr,
    });
  }
});

router.post("/signup", async function (req, res) {
  const { Companyname, Email, Phone, Address, City, Pincode, Password } = req.body;
  let errors = {};

  // Field validations
  if (!Companyname) errors.Companyname = "Please enter your company name.";
  if (!Email) errors.email = "Please enter your email.";
  if (!Phone) errors.phone = "Please enter your phone number.";
  if (!Address) errors.address = "Please enter your address.";
  if (!City) errors.city = "Please enter your city.";
  if (!Pincode) errors.pincode = "Please enter your pincode.";
  if (!Password) errors.password = "Please enter a password.";

  // Check if email or company name already exists
  const existingEmail = await db.get()
    .collection(collections.BUILDER_COLLECTION)
    .findOne({ Email });
  if (existingEmail) errors.email = "This email is already registered.";

  const existingCompanyname = await db.get()
    .collection(collections.BUILDER_COLLECTION)
    .findOne({ Companyname });
  if (existingCompanyname) errors.Companyname = "This company name is already registered.";

  // Validate Pincode and Phone
  if (!/^\d{6}$/.test(Pincode)) errors.pincode = "Pincode must be exactly 6 digits.";
  if (!/^\d{10}$/.test(Phone)) errors.phone = "Phone number must be exactly 10 digits.";
  const existingPhone = await db.get()
    .collection(collections.BUILDER_COLLECTION)
    .findOne({ Phone });
  if (existingPhone) errors.phone = "This phone number is already registered.";

  // If there are validation errors, re-render the form
  if (Object.keys(errors).length > 0) {
    return res.render("builder/signup", {
      builder: true,
      layout: 'empty',
      errors,
      Companyname,
      Email,
      Phone,
      Address,
      City,
      Pincode,
      Password
    });
  }

  builderHelper.dosignup(req.body).then((response) => {
    if (!response) {
      req.session.signUpErr = "Invalid Admin Code";
      return res.redirect("/builder/signup");
    }

    // Extract the id properly, assuming it's part of an object (like MongoDB ObjectId)
    const id = response._id ? response._id.toString() : response.toString();

    // Ensure the images directory exists
    const imageDir = "./public/images/builder-images/";
    if (!fs.existsSync(imageDir)) {
      fs.mkdirSync(imageDir, { recursive: true });
    }

    // Handle image upload
    if (req.files && req.files.Image) {
      let image = req.files.Image;
      let imagePath = imageDir + id + ".png";  // Use the extracted id here

      console.log("Saving image to:", imagePath);  // Log the correct image path

      image.mv(imagePath, (err) => {
        if (!err) {
          // On successful image upload, redirect to pending approval
          req.session.signedInBuilder = true;
          req.session.builder = response;
          res.redirect("/builder/pending-approval");
        } else {
          console.log("Error saving image:", err);  // Log any errors
          res.status(500).send("Error uploading image");
        }
      });
    } else {
      // No image uploaded, proceed without it
      req.session.signedInBuilder = true;
      req.session.builder = response;
      res.redirect("/builder/pending-approval");
    }
  }).catch((err) => {
    console.log("Error during signup:", err);
    res.status(500).send("Error during signup");
  });
}),


  router.get("/signin", function (req, res) {
    if (req.session.signedInBuilder) {
      res.redirect("/builder");
    } else {
      res.render("builder/signin", {
        builder: true, layout: "empty",
        signInErr: req.session.signInErr,
      });
      req.session.signInErr = null;
    }
  });

router.post("/signin", function (req, res) {
  const { Email, Password } = req.body;

  // Validate Email and Password
  if (!Email || !Password) {
    req.session.signInErr = "Please fill all fields.";
    return res.redirect("/builder/signin");
  }

  builderHelper.doSignin(req.body)
    .then((response) => {
      if (response.status === true) {
        req.session.signedInBuilder = true;
        req.session.builder = response.builder;
        res.redirect("/builder");
      } else if (response.status === "pending") {
        req.session.signInErr = "This user is not approved by admin, please wait.";
        res.redirect("/builder/signin");
      } else if (response.status === "rejected") {
        req.session.signInErr = "This user is rejected by admin.";
        res.redirect("/builder/signin");
      } else {
        req.session.signInErr = "Invalid Email/Password";
        res.redirect("/builder/signin");
      }
    })
    .catch((error) => {
      console.error(error);
      req.session.signInErr = "An error occurred. Please try again.";
      res.redirect("/builder/signin");
    });
});




router.get("/signout", function (req, res) {
  req.session.signedInBuilder = false;
  req.session.builder = null;
  res.redirect("/builder");
});

router.get("/add-product", verifySignedIn, function (req, res) {
  let builder = req.session.builder;
  res.render("builder/add-product", { builder: true, layout: "layout", workspace });
});

router.post("/add-product", function (req, res) {
  builderHelper.addProduct(req.body, (id) => {
    let image = req.files.Image;
    image.mv("./public/images/product-images/" + id + ".png", (err, done) => {
      if (!err) {
        res.redirect("/builder/add-product");
      } else {
        console.log(err);
      }
    });
  });
});

router.get("/edit-product/:id", verifySignedIn, async function (req, res) {
  let builder = req.session.builder;
  let productId = req.params.id;
  let product = await builderHelper.getProductDetails(productId);
  console.log(product);
  res.render("builder/edit-product", { builder: true, layout: "layout", product, workspace });
});

router.post("/edit-product/:id", verifySignedIn, function (req, res) {
  let productId = req.params.id;
  builderHelper.updateProduct(productId, req.body).then(() => {
    if (req.files) {
      let image = req.files.Image;
      if (image) {
        image.mv("./public/images/product-images/" + productId + ".png");
      }
    }
    res.redirect("/builder/all-products");
  });
});

router.get("/delete-product/:id", verifySignedIn, function (req, res) {
  let productId = req.params.id;
  builderHelper.deleteProduct(productId).then((response) => {
    fs.unlinkSync("./public/images/product-images/" + productId + ".png");
    res.redirect("/builder/all-products");
  });
});

router.get("/delete-all-products", verifySignedIn, function (req, res) {
  builderHelper.deleteAllProducts().then(() => {
    res.redirect("/builder/all-products");
  });
});

router.get("/all-users", verifySignedIn, function (req, res) {
  let builder = req.session.builder;
  builderHelper.getAllUsers().then((users) => {
    res.render("builder/users/all-users", { builder: true, layout: "layout", workspace, users });
  });
});

router.get("/remove-user/:id", verifySignedIn, function (req, res) {
  let userId = req.params.id;
  builderHelper.removeUser(userId).then(() => {
    res.redirect("/builder/all-users");
  });
});

router.get("/remove-all-users", verifySignedIn, function (req, res) {
  builderHelper.removeAllUsers().then(() => {
    res.redirect("/builder/all-users");
  });
});

router.get("/all-orders", verifySignedIn, async function (req, res) {
  let builder = req.session.builder;

  // Ensure you have the builder's ID available
  let builderId = builder._id; // Adjust based on how builder ID is stored in session

  // Pass builderId to getAllOrders
  let orders = await builderHelper.getAllOrders(builderId);

  res.render("builder/all-orders", {
    builder: true,
    layout: "layout",
    orders,
    builder
  });
});

router.get(
  "/view-ordered-products/:id",
  verifySignedIn,
  async function (req, res) {
    let builder = req.session.builder;
    let orderId = req.params.id;
    let products = await userHelper.getOrderProducts(orderId);
    res.render("builder/order-products", {
      builder: true, layout: "layout",
      workspace,
      products,
    });
  }
);

router.get("/change-status/", verifySignedIn, function (req, res) {
  let status = req.query.status;
  let orderId = req.query.orderId;
  builderHelper.changeStatus(status, orderId).then(() => {
    res.redirect("/builder/all-orders");
  });
});

router.get("/cancel-order/:id", verifySignedIn, function (req, res) {
  let orderId = req.params.id;
  builderHelper.cancelOrder(orderId).then(() => {
    res.redirect("/builder/all-orders");
  });
});

router.get("/cancel-all-orders", verifySignedIn, function (req, res) {
  builderHelper.cancelAllOrders().then(() => {
    res.redirect("/builder/all-orders");
  });
});

router.post("/search", verifySignedIn, function (req, res) {
  let builder = req.session.builder;
  builderHelper.searchProduct(req.body).then((response) => {
    res.render("builder/search-result", { builder: true, layout: "layout", workspace, response });
  });
});


module.exports = router;
