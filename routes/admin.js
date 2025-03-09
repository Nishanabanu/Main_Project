var express = require("express");
var adminHelper = require("../helper/adminHelper");
var fs = require("fs");
const userHelper = require("../helper/userHelper");
var router = express.Router();
var db = require("../config/connection");
var collections = require("../config/collections");
const ObjectId = require("mongodb").ObjectID;
const path = require('path');


const verifySignedIn = (req, res, next) => {
  if (req.session.signedInAdmin) {
    next();
  } else {
    res.redirect("/admin/signin");
  }
};

/* GET admins listing. */
router.get("/", verifySignedIn, function (req, res, next) {
  let administator = req.session.admin;
  adminHelper.getAllProducts().then((products) => {
    res.render("admin/home", { admin: true, products, layout: "admin-layout", administator });
  });
});



router.get("/all-notifications", verifySignedIn, async function (req, res) {
  let administator = req.session.admin;
  let notifications = await adminHelper.getAllnotifications();
  res.render("admin/all-notifications", { admin: true, layout: "admin-layout", administator, notifications });
});

///////ADD reply/////////////////////                                         
router.get("/add-notification", verifySignedIn, async function (req, res) {
  let administator = req.session.admin;
  let users = await adminHelper.getAllUsers();
  res.render("admin/add-notification", { admin: true, layout: "admin-layout", administator, users });
});

///////ADD notification/////////////////////                                         
router.post("/add-notification", function (req, res) {
  adminHelper.addnotification(req.body, (id) => {
    res.redirect("/admin/all-notifications");
  });
});

router.get("/delete-notification/:id", verifySignedIn, function (req, res) {
  let notificationId = req.params.id;
  adminHelper.deletenotification(notificationId).then((response) => {
    res.redirect("/admin/all-notifications");
  });
});

///////ALL officer/////////////////////                                         
router.get("/all-officers", verifySignedIn, function (req, res) {
  let administator = req.session.admin;
  adminHelper.getAllofficers().then((officers) => {
    res.render("admin/officers/all-officers", { admin: true, layout: "admin-layout", officers, administator });
  });
});


router.post("/delete-officer/:id", verifySignedIn, async function (req, res) {
  await db.get().collection(collections.OFFICERS_COLLECTION).deleteOne({ _id: ObjectId(req.params.id) });
  res.redirect("/admin/officers/all-officers");
});

///////ADD officer/////////////////////                                         
router.get("/add-officer", verifySignedIn, function (req, res) {
  let administator = req.session.admin;
  res.render("admin/officers/add-officer", { admin: true, layout: "admin-layout", administator });
});

///////ADD officer/////////////////////                                         
router.post("/add-officer", function (req, res) {
  adminHelper.addofficer(req.body, (id) => {
    res.redirect("/admin/officers/all-officers");
  });
});

///////EDIT officer/////////////////////                                         
router.get("/edit-officer/:id", verifySignedIn, async function (req, res) {
  let administator = req.session.admin;
  let officerId = req.params.id;
  let officer = await adminHelper.getofficerDetails(officerId);
  console.log(officer);
  res.render("admin/officers/edit-officer", { admin: true, layout: "admin-layout", officer, administator });
});

///////EDIT officer/////////////////////                                         
router.post("/edit-officer/:id", verifySignedIn, function (req, res) {
  let officerId = req.params.id;
  adminHelper.updateofficer(officerId, req.body).then(() => {
    res.redirect("/admin/officers/all-officers");
  });
});

///////DELETE officer/////////////////////                                         
// router.get("/delete-officer/:id", verifySignedIn, function (req, res) {
//   let officerId = req.params.id;
//   adminHelper.deleteofficer(officerId).then((response) => {
//     res.redirect("/admin/all-officers");
//   });
// });

///////DELETE ALL officer/////////////////////                                         
router.get("/delete-all-officers", verifySignedIn, function (req, res) {
  adminHelper.deleteAllofficers().then(() => {
    res.redirect("/admin/officer/all-officers");
  });
});



router.get("/signup", function (req, res) {
  if (req.session.signedInAdmin) {
    res.redirect("/admin");
  } else {
    res.render("admin/signup", {
      admin: true, layout: "admin-empty",
      signUpErr: req.session.signUpErr,
    });
  }
});

router.post("/signup", function (req, res) {
  adminHelper.doSignup(req.body).then((response) => {
    console.log(response);
    if (response.status == false) {
      req.session.signUpErr = "Invalid Admin Code";
      res.redirect("/admin/signup");
    } else {
      req.session.signedInAdmin = true;
      req.session.admin = response;
      res.redirect("/admin");
    }
  });
});

router.get("/signin", function (req, res) {
  if (req.session.signedInAdmin) {
    res.redirect("/admin");
  } else {
    res.render("admin/signin", {
      admin: true, layout: "admin-empty",
      signInErr: req.session.signInErr,
    });
    req.session.signInErr = null;
  }
});

router.post("/signin", function (req, res) {
  adminHelper.doSignin(req.body).then((response) => {
    if (response.status) {
      req.session.signedInAdmin = true;
      req.session.admin = response.admin;
      res.redirect("/admin");
    } else {
      req.session.signInErr = "Invalid Email/Password";
      res.redirect("/admin/signin");
    }
  });
});

router.get("/signout", function (req, res) {
  req.session.signedInAdmin = false;
  req.session.admin = null;
  res.redirect("/admin");
});

router.get("/all-rooms", verifySignedIn, function (req, res) {
  let administator = req.session.admin;
  adminHelper.getAllrooms().then((rooms) => {
    res.render("admin/rooms/all-rooms", { admin: true, layout: "admin-layout", rooms, administator });
  });
});

router.get("/add-room", verifySignedIn, function (req, res) {
  let administator = req.session.admin;
  res.render("admin/rooms/add-room", { admin: true, layout: "admin-layout", administator });
});

router.post("/add-room", (req, res) => {
  // Check if files are uploaded
  if (!req.files) {
    return res.status(400).send("No files were uploaded.");
  }

  // Generate a unique ID for the room
  adminHelper.addroom(req.body, (id) => {
    const files = req.files; // Access all uploaded files
    const fileKeys = Object.keys(files); // Get keys like 'Image1', 'Image2', etc.

    // Loop through the files and save each one
    let savePromises = fileKeys.map((key, index) => {
      const image = files[key]; // Access the file
      const uploadPath = path.join(
        __dirname,
        "../public/images/room-images/",
        `${id}-${index + 1}.png` // Save as <id>-1.png, <id>-2.png, etc.
      );

      // Move the file to the destination folder
      return new Promise((resolve, reject) => {
        image.mv(uploadPath, (err) => {
          if (err) {
            reject(err);
          } else {
            resolve();
          }
        });
      });
    });

    // Wait for all files to be saved
    Promise.all(savePromises)
      .then(() => {
        res.redirect("/admin/rooms/all-rooms");
      })
      .catch((err) => {
        console.error("Error saving images:", err);
        res.status(500).send("Failed to upload images.");
      });
  });
});

router.get("/edit-room/:id", verifySignedIn, async function (req, res) {
  let administator = req.session.admin;
  let roomId = req.params.id;
  let room = await adminHelper.getroomDetails(roomId);
  console.log(room);
  res.render("admin/rooms/edit-room", { admin: true, layout: "admin-layout", room, administator });
});

router.post("/edit-room/:id", verifySignedIn, function (req, res) {
  let roomId = req.params.id;
  adminHelper.updateroom(roomId, req.body).then(() => {
    if (req.files) {
      let image = req.files.Image;
      if (image) {
        image.mv("./public/images/room-images/" + roomId + ".png");
      }
    }
    res.redirect("/admin/rooms/all-rooms");
  });
});

router.post("/delete-room/:id", verifySignedIn, async function (req, res) {
  await db.get().collection(collections.ROOM_COLLECTION).deleteOne({ _id: ObjectId(req.params.id) });
  res.redirect("/admin/rooms/all-rooms");
});




router.get("/all-users", verifySignedIn, function (req, res) {
  let administator = req.session.admin;
  adminHelper.getAllUsers().then((users) => {
    res.render("admin/users/all-users", { admin: true, layout: "admin-layout", administator, users });
  });
});

router.post("/block-user/:id", (req, res) => {
  const userId = req.params.id;
  const { reason } = req.body;

  // Update the user in the database to set isDisable to true and add the reason
  db.get()
    .collection(collections.USERS_COLLECTION)
    .updateOne(
      { _id: new ObjectId(userId) },
      { $set: { isDisable: true, blockReason: reason } }
    )
    .then(() => res.json({ success: true }))
    .catch(err => {
      console.error('Error blocking user:', err);
      res.json({ success: false });
    });
});



router.get("/remove-all-users", verifySignedIn, function (req, res) {
  adminHelper.removeAllUsers().then(() => {
    res.redirect("/admin/all-users");
  });
});

router.get("/all-orders", verifySignedIn, async function (req, res) {
  let administator = req.session.admin;
  let { fromDate, toDate } = req.query; // Get fromDate and toDate from the query parameters

  try {
    let orders = await adminHelper.getAllOrders(fromDate, toDate); // Pass the date range to the function

    res.render("admin/finance", {
      admin: true,
      layout: "admin-layout",
      administator,
      orders,     // Render the filtered orders
      fromDate,   // Pass back toDate and fromDate to display on the form
      toDate
    });
  } catch (error) {
    console.error("Error fetching orders:", error);
    res.status(500).send("Server Error");
  }
});


router.get(
  "/view-ordered-products/:id",
  verifySignedIn,
  async function (req, res) {
    let administator = req.session.admin;
    let orderId = req.params.id;
    let products = await userHelper.getOrderProducts(orderId);
    res.render("admin/order-products", {
      admin: true, layout: "admin-layout",
      administator,
      products,
    });
  }
);

router.get("/change-status/", verifySignedIn, function (req, res) {
  let status = req.query.status;
  let orderId = req.query.orderId;
  adminHelper.changeStatus(status, orderId).then(() => {
    res.redirect("/admin/all-orders");
  });
});

router.get("/cancel-order/:id", verifySignedIn, function (req, res) {
  let orderId = req.params.id;
  adminHelper.cancelOrder(orderId).then(() => {
    res.redirect("/admin/all-orders");
  });
});

router.get("/cancel-all-orders", verifySignedIn, function (req, res) {
  adminHelper.cancelAllOrders().then(() => {
    res.redirect("/admin/all-orders");
  });
});

router.post("/search", verifySignedIn, function (req, res) {
  let administator = req.session.admin;
  adminHelper.searchProduct(req.body).then((response) => {
    res.render("admin/search-result", { admin: true, layout: "admin-layout", administator, response });
  });
});


module.exports = router;
