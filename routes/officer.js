var express = require("express");
var officerHelper = require("../helper/officerHelper");
var fs = require("fs");
const userHelper = require("../helper/userHelper");
const adminHelper = require("../helper/adminHelper");
const pdf = require('html-pdf');
const path = require('path');
const htmlPdf = require('html-pdf-node');

var router = express.Router();
var db = require("../config/connection");
var collections = require("../config/collections");
const ObjectId = require("mongodb").ObjectID;

const verifySignedIn = (req, res, next) => {
  if (req.session.signedInOfficer) {
    next();
  } else {
    res.redirect("/officer/signin");
  }
};

/* GET admins listing. */
router.get("/", verifySignedIn, async function (req, res, next) {
  let officer = req.session.officer;
  console.log(req.session.officer);
  try {
    const allRegistrations = await officerHelper.getAllregistrations();
    const userReviewStatus = officerHelper.getUserReviewStatus(
      req.session.officer.type
    );

    const registrations = allRegistrations?.filter(
      (item) => item.status === userReviewStatus
    );

    // Sorting and finding out which are Pending for the approval of this particular user

    res.render("officer/home", {
      officer: true,
      layout: "layout",
      officer,
      registrations,
      allRegistrations,
      statusMap: userHelper.statusMap,
    });
  } catch (error) {
    console.error("Error fetching registrations:", error);
    res.status(500).send("Something went wrong. Please try again.");
  }
});

router.post("/accept/:id", verifySignedIn, async function (req, res) {
  const registrationId = req.params.id;
  const signature = req.body.signature;
  const previewBase64 = req.body.preview;

  try {
    if (req.session.officer.type === 'Joint Registrar') {
      // Convert base64 to HTML
      const previewHtml = decodeURIComponent(escape(atob(previewBase64)));

      // Add proper styling and doctype to HTML
      const fullHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <title>Registration Certificate</title>
          <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/css/bootstrap.min.css" rel="stylesheet">
          <style>
            body {
              font-family: 'Times New Roman', Times, serif;
              padding: 40px;
              color: #000;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 20px;
            }
            th, td {
              border: 1px solid #000;
              padding: 8px;
            }
            .header {
              text-align: center;
              margin-bottom: 30px;
            }
            .signature-section {
              margin-top: 50px;
              position: relative;
            }
            .seal {
              float: left;
              width: 150px;
              height: 150px;
              border: 2px dashed #666;
              display: flex;
              align-items: center;
              justify-content: center;
            }
            .signature {
              float: right;
              text-align: right;
            }
            @page {
              size: A4;
              margin: 0;
            }
          </style>
        </head>
        <body>
          ${previewHtml}
        </body>
      </html>
    `;

      // PDF generation options
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

      // Create file
      const pdfPath = path.join(__dirname, `../public/reports/${registrationId}.pdf`);

      // Generate PDF
      const file = { content: fullHtml };
      const pdfBuffer = await htmlPdf.generatePdf(file, options);

      // Save PDF file
      fs.writeFileSync(pdfPath, pdfBuffer);

      // Save the PDF URL in the database
      const pdfUrl = `/reports/${registrationId}.pdf`;
      await officerHelper.changeRegistrationStatus(registrationId, "accepted", '', '', signature, pdfUrl);
    } else {
      await officerHelper.changeRegistrationStatus(registrationId, "accepted",);

    }


    res.json({ success: true });

  } catch (error) {
    console.error("Error in PDF generation:", error);
    res.json({ success: false, error: "Failed to generate PDF" });
  }
});

router.post("/reject/:id", verifySignedIn, function (req, res) {
  const registrationId = req.params.id;
  const reason = req.body.reason || null;
  const userType = req.session.officer.type;
  officerHelper
    .changeRegistrationStatus(registrationId, "rejected", reason, userType)
    .then(() => {
      res.json({ success: true });
    })
    .catch((error) => {
      console.error("Error rejecting registration:", error);
      res.json({ success: false, error: "Failed to reject registration" });
    });
});

router.get("/view/:id", verifySignedIn, async function (req, res) {
  const registrationId = req.params.id;
  let officer = req.session.officer;

  try {
    const registration = await officerHelper.getRegistrationById(
      registrationId
    );
    res.render("officer/view", {
      officer: true,
      layout: "layout",
      officer,
      registration,
      statusMap: userHelper.statusMap,
    });
  } catch (error) {
    console.error("Error fetching registration:", error);
    res.status(500).send("Something went wrong. Please try again.");
  }
});


router.get("/progress/:id", verifySignedIn, async function (req, res) {
  const registrationId = req.params.id;
  let officer = req.session.officer;

  try {
    const registration = await officerHelper.getRegistrationById(
      registrationId
    );
    const transformedRegistrations = userHelper.transformRegistrations([registration]);

    res.render("officer/progress", {
      officer: true,
      layout: "layout",
      officer,
      registrations: transformedRegistrations,
      statusMap: userHelper.statusMap,
    });
  } catch (error) {
    console.error("Error fetching registration:", error);
    res.status(500).send("Something went wrong. Please try again.");
  }
});

router.get("/getRegistrations", verifySignedIn, async function (req, res) {
  try {
    const allRegistrations = await officerHelper.getAllregistrations();
    const userReviewStatus = officerHelper.getUserReviewStatus(
      req.session.officer.type
    );
    const registrations = allRegistrations.filter(
      (item) => item.status === userReviewStatus
    );
    res.json({ registrations, allRegistrations });
  } catch (error) {
    console.error("Error fetching registrations:", error);
    res.status(500).send("Something went wrong. Please try again.");
  }
});

///////ALL notification/////////////////////
router.get("/all-notifications", verifySignedIn, async function (req, res) {
  let officer = req.session.officer;

  // Ensure you have the officer's ID available
  let officerId = officer._id; // Adjust based on how officer ID is stored in session

  // Pass officerId to getAllOrders
  let orders = await officerHelper.getAllOrders(officerId);
  let notifications = await officerHelper.getAllnotifications(officerId);
  res.render("officer/all-notifications", {
    officer: true,
    layout: "layout",
    notifications,
    officer,
    orders,
  });
});

///////ADD notification/////////////////////
router.get("/add-notification", verifySignedIn, function (req, res) {
  let officer = req.session.officer;
  res.render("officer/all-notifications", {
    officer: true,
    layout: "layout",
    officer,
  });
});

///////ADD notification/////////////////////
router.post("/add-notification", function (req, res) {
  officerHelper.addnotification(req.body, (id) => {
    res.redirect("/officer/all-notifications");
  });
});

router.get("/delete-notification/:id", verifySignedIn, function (req, res) {
  let notificationId = req.params.id;
  adminHelper.deletenotification(notificationId).then((response) => {
    res.redirect("/officer/all-notifications");
  });
});

///////EDIT notification/////////////////////
router.get("/edit-notification/:id", verifySignedIn, async function (req, res) {
  let officer = req.session.officer;
  let notificationId = req.params.id;
  let notification = await officerHelper.getnotificationDetails(notificationId);
  console.log(notification);
  res.render("officer/edit-notification", {
    officer: true,
    layout: "layout",
    notification,
    officer,
  });
});

///////EDIT notification/////////////////////
router.post("/edit-notification/:id", verifySignedIn, function (req, res) {
  let notificationId = req.params.id;
  officerHelper.updatenotification(notificationId, req.body).then(() => {
    if (req.files) {
      let image = req.files.Image;
      if (image) {
        image.mv(
          "./public/images/notification-images/" + notificationId + ".png"
        );
      }
    }
    res.redirect("/officer/all-notifications");
  });
});

///////DELETE notification/////////////////////
router.get("/delete-notification/:id", verifySignedIn, function (req, res) {
  let notificationId = req.params.id;
  officerHelper.deletenotification(notificationId).then((response) => {
    res.redirect("/officer/all-notifications");
  });
});

///////DELETE ALL notification/////////////////////
router.get("/delete-all-notifications", verifySignedIn, function (req, res) {
  officerHelper.deleteAllnotifications().then(() => {
    res.redirect("/officer/all-notifications");
  });
});

////////////////////PROFILE////////////////////////////////////
router.get("/profile", async function (req, res, next) {
  let officer = req.session.officer;
  res.render("officer/profile", { officer: true, layout: "layout", officer });
});

///////ALL workspace/////////////////////
// router.get("/all-feedbacks", verifySignedIn, async function (req, res) {
//   let officer = req.session.officer;

//   const workspaceId = req.params.id;

//   console.log('workspace')

//   try {
//     const workspace = await userHelper.getWorkspaceById(workspaceId);
//     const feedbacks = await userHelper.getFeedbackByWorkspaceId(workspaceId); // Fetch feedbacks for the specific workspace
//     console.log('feedbacks', feedbacks)
//     res.render("officer/all-feedbacks", { officer: true, layout: "layout", workspace, feedbacks, officer });
//   } catch (error) {
//     console.error("Error fetching workspace:", error);
//     res.status(500).send("Server Error");
//   }

// });

router.get("/officer-feedback", async function (req, res) {
  let officer = req.session.officer; // Get the officer from session

  if (!officer) {
    return res.status(403).send("Officer not logged in");
  }

  try {
    // Fetch feedback for this officer
    const feedbacks = await officerHelper.getFeedbackByOfficerId(officer._id);

    // Fetch workspace details for each feedback
    const feedbacksWithWorkspaces = await Promise.all(
      feedbacks.map(async (feedback) => {
        const workspace = await userHelper.getWorkspaceById(
          ObjectId(feedback.workspaceId)
        ); // Convert workspaceId to ObjectId
        if (workspace) {
          feedback.workspaceName = workspace.name; // Attach workspace name to feedback
        }
        return feedback;
      })
    );

    // Render the feedback page with officer, feedbacks, and workspace data
    res.render("officer/all-feedbacks", {
      officer, // Officer details
      feedbacks: feedbacksWithWorkspaces, // Feedback with workspace details
    });
  } catch (error) {
    console.error("Error fetching feedback and workspaces:", error);
    res.status(500).send("Server Error");
  }
});

///////ALL workspace/////////////////////
router.get("/all-workspaces", verifySignedIn, function (req, res) {
  let officer = req.session.officer;
  officerHelper.getAllworkspaces(req.session.officer._id).then((workspaces) => {
    res.render("officer/all-workspaces", {
      officer: true,
      layout: "layout",
      workspaces,
      officer,
    });
  });
});

///////ADD workspace/////////////////////
router.get("/add-workspace", verifySignedIn, function (req, res) {
  let officer = req.session.officer;
  res.render("officer/add-workspace", {
    officer: true,
    layout: "layout",
    officer,
  });
});

///////ADD workspace/////////////////////
router.post("/add-workspace", function (req, res) {
  // Ensure the officer is signed in and their ID is available
  if (
    req.session.signedInOfficer &&
    req.session.officer &&
    req.session.officer._id
  ) {
    const officerId = req.session.officer._id; // Get the officer's ID from the session

    // Pass the officerId to the addworkspace function
    officerHelper.addworkspace(req.body, officerId, (workspaceId, error) => {
      if (error) {
        console.log("Error adding workspace:", error);
        res.status(500).send("Failed to add workspace");
      } else {
        let image = req.files.Image;
        image.mv(
          "./public/images/workspace-images/" + workspaceId + ".png",
          (err) => {
            if (!err) {
              res.redirect("/officer/all-workspaces");
            } else {
              console.log("Error saving workspace image:", err);
              res.status(500).send("Failed to save workspace image");
            }
          }
        );
      }
    });
  } else {
    // If the officer is not signed in, redirect to the sign-in page
    res.redirect("/officer/signin");
  }
});

///////EDIT workspace/////////////////////
router.get("/edit-workspace/:id", verifySignedIn, async function (req, res) {
  let officer = req.session.officer;
  let workspaceId = req.params.id;
  let workspace = await officerHelper.getworkspaceDetails(workspaceId);
  console.log(workspace);
  res.render("officer/edit-workspace", {
    officer: true,
    layout: "layout",
    workspace,
    officer,
  });
});

///////EDIT workspace/////////////////////
router.post("/edit-workspace/:id", verifySignedIn, function (req, res) {
  let workspaceId = req.params.id;
  officerHelper.updateworkspace(workspaceId, req.body).then(() => {
    if (req.files) {
      let image = req.files.Image;
      if (image) {
        image.mv("./public/images/workspace-images/" + workspaceId + ".png");
      }
    }
    res.redirect("/officer/all-workspaces");
  });
});

///////DELETE workspace/////////////////////
router.get("/delete-workspace/:id", verifySignedIn, function (req, res) {
  let workspaceId = req.params.id;
  officerHelper.deleteworkspace(workspaceId).then((response) => {
    fs.unlinkSync("./public/images/workspace-images/" + workspaceId + ".png");
    res.redirect("/officer/all-workspaces");
  });
});

///////DELETE ALL workspace/////////////////////
router.get("/delete-all-workspaces", verifySignedIn, function (req, res) {
  officerHelper.deleteAllworkspaces().then(() => {
    res.redirect("/officer/all-workspaces");
  });
});

router.get("/all-users", verifySignedIn, async function (req, res) {
  let officer = req.session.officer;

  // Ensure you have the officer's ID available
  let officerId = officer._id; // Adjust based on how officer ID is stored in session

  // Pass officerId to getAllOrders
  let orders = await officerHelper.getAllOrders(officerId);

  res.render("officer/all-users", {
    officer: true,
    layout: "layout",
    orders,
    officer,
  });
});

router.get("/all-transactions", verifySignedIn, async function (req, res) {
  let officer = req.session.officer;

  // Ensure you have the officer's ID available
  let officerId = officer._id; // Adjust based on how officer ID is stored in session

  // Pass officerId to getAllOrders
  let orders = await officerHelper.getAllOrders(officerId);

  res.render("officer/all-transactions", {
    officer: true,
    layout: "layout",
    orders,
    officer,
  });
});

router.get("/pending-approval", function (req, res) {
  if (!req.session.signedInOfficer || req.session.officer.approved) {
    res.redirect("/officer");
  } else {
    res.render("officer/pending-approval", {
      officer: true,
      layout: "empty",
    });
  }
});

router.get("/signup", function (req, res) {
  if (req.session.signedInOfficer) {
    res.redirect("/officer");
  } else {
    res.render("officer/signup", {
      officer: true,
      layout: "empty",
      signUpErr: req.session.signUpErr,
    });
  }
});

router.post("/signup", async function (req, res) {
  const { Companyname, Email, Phone, Address, City, Pincode, Password } =
    req.body;
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
  const existingEmail = await db
    .get()
    .collection(collections.OFFICER_COLLECTION)
    .findOne({ Email });
  if (existingEmail) errors.email = "This email is already registered.";

  const existingCompanyname = await db
    .get()
    .collection(collections.OFFICER_COLLECTION)
    .findOne({ Companyname });
  if (existingCompanyname)
    errors.Companyname = "This company name is already registered.";

  // Validate Pincode and Phone
  if (!/^\d{6}$/.test(Pincode))
    errors.pincode = "Pincode must be exactly 6 digits.";
  if (!/^\d{10}$/.test(Phone))
    errors.phone = "Phone number must be exactly 10 digits.";
  const existingPhone = await db
    .get()
    .collection(collections.OFFICER_COLLECTION)
    .findOne({ Phone });
  if (existingPhone) errors.phone = "This phone number is already registered.";

  // If there are validation errors, re-render the form
  if (Object.keys(errors).length > 0) {
    return res.render("officer/signup", {
      officer: true,
      layout: "empty",
      errors,
      Companyname,
      Email,
      Phone,
      Address,
      City,
      Pincode,
      Password,
    });
  }

  officerHelper
    .dosignup(req.body)
    .then((response) => {
      if (!response) {
        req.session.signUpErr = "Invalid Admin Code";
        return res.redirect("/officer/signup");
      }

      // Extract the id properly, assuming it's part of an object (like MongoDB ObjectId)
      const id = response._id ? response._id.toString() : response.toString();

      // Ensure the images directory exists
      const imageDir = "./public/images/officer-images/";
      if (!fs.existsSync(imageDir)) {
        fs.mkdirSync(imageDir, { recursive: true });
      }

      // Handle image upload
      if (req.files && req.files.Image) {
        let image = req.files.Image;
        let imagePath = imageDir + id + ".png"; // Use the extracted id here

        console.log("Saving image to:", imagePath); // Log the correct image path

        image.mv(imagePath, (err) => {
          if (!err) {
            // On successful image upload, redirect to pending approval
            req.session.signedInOfficer = true;
            req.session.officer = response;
            res.redirect("/officer/pending-approval");
          } else {
            console.log("Error saving image:", err); // Log any errors
            res.status(500).send("Error uploading image");
          }
        });
      } else {
        // No image uploaded, proceed without it
        req.session.signedInOfficer = true;
        req.session.officer = response;
        res.redirect("/officer/pending-approval");
      }
    })
    .catch((err) => {
      console.log("Error during signup:", err);
      res.status(500).send("Error during signup");
    });
}),
  router.get("/signin", function (req, res) {
    if (req.session.signedInOfficer) {
      res.redirect("/officer");
    } else {
      res.render("officer/signin", {
        officer: true,
        layout: "empty",
        signInErr: req.session.signInErr,
      });
      req.session.signInErr = null;
    }
  });

router.post("/signin", function (req, res) {
  const { username, password } = req.body;

  // Validate Email and password
  if (!username || !password) {
    req.session.signInErr = "Please fill all fields.";
    return res.redirect("/officer/signin");
  }

  officerHelper
    .doSignin(req.body)
    .then((response) => {
      if (response.status === true) {
        req.session.signedInOfficer = true;
        req.session.officer = response.officer;
        res.redirect("/officer");
      } else {
        req.session.signInErr = "Invalid Username/Password";
        res.redirect("/officer/signin");
      }
    })
    .catch((error) => {
      console.error(error);
      req.session.signInErr = "An error occurred. Please try again.";
      res.redirect("/officer/signin");
    });
});

router.get("/signout", function (req, res) {
  req.session.signedInOfficer = false;
  req.session.officer = null;
  res.redirect("/officer");
});

router.get("/add-product", verifySignedIn, function (req, res) {
  let officer = req.session.officer;
  res.render("officer/add-product", {
    officer: true,
    layout: "layout",
    workspace,
  });
});

router.post("/add-product", function (req, res) {
  officerHelper.addProduct(req.body, (id) => {
    let image = req.files.Image;
    image.mv("./public/images/product-images/" + id + ".png", (err, done) => {
      if (!err) {
        res.redirect("/officer/add-product");
      } else {
        console.log(err);
      }
    });
  });
});

router.get("/edit-product/:id", verifySignedIn, async function (req, res) {
  let officer = req.session.officer;
  let productId = req.params.id;
  let product = await officerHelper.getProductDetails(productId);
  console.log(product);
  res.render("officer/edit-product", {
    officer: true,
    layout: "layout",
    product,
    workspace,
  });
});

router.post("/edit-product/:id", verifySignedIn, function (req, res) {
  let productId = req.params.id;
  officerHelper.updateProduct(productId, req.body).then(() => {
    if (req.files) {
      let image = req.files.Image;
      if (image) {
        image.mv("./public/images/product-images/" + productId + ".png");
      }
    }
    res.redirect("/officer/all-products");
  });
});

router.get("/delete-product/:id", verifySignedIn, function (req, res) {
  let productId = req.params.id;
  officerHelper.deleteProduct(productId).then((response) => {
    fs.unlinkSync("./public/images/product-images/" + productId + ".png");
    res.redirect("/officer/all-products");
  });
});

router.get("/delete-all-products", verifySignedIn, function (req, res) {
  officerHelper.deleteAllProducts().then(() => {
    res.redirect("/officer/all-products");
  });
});

router.get("/all-users", verifySignedIn, function (req, res) {
  let officer = req.session.officer;
  officerHelper.getAllUsers().then((users) => {
    res.render("officer/users/all-users", {
      officer: true,
      layout: "layout",
      workspace,
      users,
    });
  });
});

router.get("/remove-user/:id", verifySignedIn, function (req, res) {
  let userId = req.params.id;
  officerHelper.removeUser(userId).then(() => {
    res.redirect("/officer/all-users");
  });
});

router.get("/remove-all-users", verifySignedIn, function (req, res) {
  officerHelper.removeAllUsers().then(() => {
    res.redirect("/officer/all-users");
  });
});

router.get("/all-orders", verifySignedIn, async function (req, res) {
  let officer = req.session.officer;

  // Ensure you have the officer's ID available
  let officerId = officer._id; // Adjust based on how officer ID is stored in session

  // Pass officerId to getAllOrders
  let orders = await officerHelper.getAllOrders(officerId);

  res.render("officer/all-orders", {
    officer: true,
    layout: "layout",
    orders,
    officer,
  });
});

router.get(
  "/view-ordered-products/:id",
  verifySignedIn,
  async function (req, res) {
    let officer = req.session.officer;
    let orderId = req.params.id;
    let products = await userHelper.getOrderProducts(orderId);
    res.render("officer/order-products", {
      officer: true,
      layout: "layout",
      workspace,
      products,
    });
  }
);

router.get("/change-status/", verifySignedIn, function (req, res) {
  let status = req.query.status;
  let orderId = req.query.orderId;
  officerHelper.changeStatus(status, orderId).then(() => {
    res.redirect("/officer/all-orders");
  });
});

router.get("/cancel-order/:id", verifySignedIn, function (req, res) {
  let orderId = req.params.id;
  officerHelper.cancelOrder(orderId).then(() => {
    res.redirect("/officer/all-orders");
  });
});

router.get("/cancel-all-orders", verifySignedIn, function (req, res) {
  officerHelper.cancelAllOrders().then(() => {
    res.redirect("/officer/all-orders");
  });
});

router.post("/search", verifySignedIn, function (req, res) {
  let officer = req.session.officer;
  officerHelper.searchProduct(req.body).then((response) => {
    res.render("officer/search-result", {
      officer: true,
      layout: "layout",
      workspace,
      response,
    });
  });
});

module.exports = router;
