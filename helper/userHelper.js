var db = require("../config/connection");
var collections = require("../config/collections");
const bcrypt = require("bcrypt");
const objectId = require("mongodb").ObjectID;
const Razorpay = require("razorpay");
const ObjectId = require('mongodb').ObjectId; // Required to convert string to ObjectId


var instance = new Razorpay({
  key_id: "rzp_test_8NokNgt8cA3Hdv",
  key_secret: "xPzG53EXxT8PKr34qT7CTFm9",
});

// const statusMap = {
//   'form-submitted': 'Form Submitted',
//   'payment-pending': 'Payment Pending',
//   'payment-completed': 'Payment Completed',
//   'assistant-registrar-review': 'Assistant Registrar Review',
//   'assistant-registrar-approved': 'Assistant Registrar Approved',
//   'assistant-registrar-rejected': 'Assistant Registrar Rejected',
//   'deputy-registrar-review': 'Deputy Registrar Review',
//   'deputy-registrar-approved': 'Deputy Registrar Approved',
//   'deputy-registrar-rejected': 'Deputy Registrar Rejected',
//   'joint-registrar-review': 'Joint Registrar Review',
//   'joint-registrar-approved': 'Joint Registrar Approved',
//   'joint-registrar-rejected': 'Joint Registrar Rejected',
//   'completed': 'Registration Completed',
//   'rejected': 'Application Rejected'
// };


const statusMap = {
  'form-submitted': 'Application Submitted',
  'payment': 'Application Submitted',
  'assistant-registrar-review': 'Assistant Registrar Review',
  'deputy-registrar-review': 'Deputy Registrar Review',
  'joint-registrar-review': 'Joint Registrar Review',
  'completed': 'Registration Completed',
  'rejected': 'Application Rejected'
};
const stepsStatusMap = {
  'form-submitted': 'Form Submitted',
  'payment': 'Payment',
  'assistant-registrar-review': 'Assistant Registrar',
  'deputy-registrar-review': 'Deputy Registrar',
  'joint-registrar-review': 'Joint Registrar',
  'completed': 'Completed'
};
function transformRegistrations(registrations, manualUpdates = {}) {
  return registrations.map(reg => {
    let steps = [
      'form-submitted',
      'payment',
      'assistant-registrar-review',
      'deputy-registrar-review',
      'joint-registrar-review',
      'completed'
    ];

    // Apply manual status updates if available
    if (manualUpdates[reg._id]) {
      reg.status = manualUpdates[reg._id];
    }

    let transformedSteps = steps.map(step => ({
      name: step,
      status: "inactive",
      label: stepsStatusMap[step]
    }));

    let rejectionStepIndex = -1;
    const rejectionMapping = {
      "Assistant Registrar": "assistant-registrar-review",
      "Deputy Registrar": "deputy-registrar-review",
      "Joint Registrar": "joint-registrar-review"
    };

    // Find the rejection step based on user input
    if (reg.status === "rejected" && reg.rejectedBy) {
      let rejectedStepName = rejectionMapping[reg.rejectedBy]; // Map to step name
      rejectionStepIndex = transformedSteps.findIndex(step => step.name === rejectedStepName);
    }

    if (rejectionStepIndex !== -1) {
      // If rejection happened, mark all previous steps as completed
      transformedSteps.forEach((step, index) => {
        if (index < rejectionStepIndex) {
          step.status = "completed";
        }
      });

      // Set the rejected step
      transformedSteps[rejectionStepIndex].status = "rejected";

      // Ensure all steps after remain inactive
      transformedSteps.slice(rejectionStepIndex + 1).forEach(step => {
        step.status = "inactive";
      });
    } else {
      // Find current status index normally
      let currentIndex = steps.indexOf(reg.status);

      // Mark steps before the current status as completed
      transformedSteps.forEach((step, index) => {
        if (index < currentIndex) {
          step.status = "completed";
        }
      });

      // Mark the current step as active
      if (currentIndex !== -1) {
        transformedSteps[currentIndex].status = "active";
      }
    }

    return {
      _id: reg._id,
      status: reg.status,
      reason: reg.rejectReason || "",
      rejectedBy: reg.rejectedBy || "",
      finalReport: reg.finalReport || "",
      steps: transformedSteps,
      date: reg.date
    };
  });
}


function transformbylawRegistrations(bylawregistrations, manualUpdates = {}) {
  return bylawregistrations.map(reg => {
    let steps = [
      'form-submitted',
      'payment',
      'assistant-registrar-review',
      'deputy-registrar-review',
      'joint-registrar-review',
      'completed'
    ];

    // Apply manual status updates if available
    if (manualUpdates[reg._id]) {
      reg.status = manualUpdates[reg._id];
    }

    let transformedSteps = steps.map(step => ({
      name: step,
      status: "inactive",
      label: stepsStatusMap[step]
    }));

    let rejectionStepIndex = -1;
    const rejectionMapping = {
      "Assistant Registrar": "assistant-registrar-review",
      "Deputy Registrar": "deputy-registrar-review",
      "Joint Registrar": "joint-registrar-review"
    };

    // Find the rejection step based on user input
    if (reg.status === "rejected" && reg.rejectedBy) {
      let rejectedStepName = rejectionMapping[reg.rejectedBy]; // Map to step name
      rejectionStepIndex = transformedSteps.findIndex(step => step.name === rejectedStepName);
    }

    if (rejectionStepIndex !== -1) {
      // If rejection happened, mark all previous steps as completed
      transformedSteps.forEach((step, index) => {
        if (index < rejectionStepIndex) {
          step.status = "completed";
        }
      });

      // Set the rejected step
      transformedSteps[rejectionStepIndex].status = "rejected";

      // Ensure all steps after remain inactive
      transformedSteps.slice(rejectionStepIndex + 1).forEach(step => {
        step.status = "inactive";
      });
    } else {
      // Find current status index normally
      let currentIndex = steps.indexOf(reg.status);

      // Mark steps before the current status as completed
      transformedSteps.forEach((step, index) => {
        if (index < currentIndex) {
          step.status = "completed";
        }
      });

      // Mark the current step as active
      if (currentIndex !== -1) {
        transformedSteps[currentIndex].status = "active";
      }
    }

    return {
      _id: reg._id,
      status: reg.status,
      reason: reg.rejectReason || "",
      rejectedBy: reg.rejectedBy || "",
      finalReport: reg.finalReport || "",
      steps: transformedSteps,
      date: reg.date
    };
  });
}

const auditStepsStatusMap = {
  'pending': 'Pending',
  'submitted': 'Submitted',
  'assistant-registrar-review': 'Assistant Registrar Review',
  'deputy-registrar-review': 'Deputy Registrar Review',
  'approved': 'Approved'
};

function transformAudits(audits) {
  return audits.map(audit => {
    let steps = [
      'pending',
      'submitted',
      'assistant-registrar-review',
      'deputy-registrar-review',
      'approved'
    ];


    let transformedSteps = steps.map(step => ({
      name: step,
      status: "inactive",
      label: auditStepsStatusMap[step]
    }));

    let rejectionStepIndex = -1;
    const rejectionMapping = {
      "Assistant Registrar": "assistant-registrar-review",
      "Deputy Registrar": "deputy-registrar-review"
    };

    if (rejectionStepIndex !== -1) {
      // If rejection happened, mark all previous steps as completed
      transformedSteps.forEach((step, index) => {
        if (index < rejectionStepIndex) {
          step.status = "completed";
        }
      });

      // Ensure all steps after remain inactive
      transformedSteps.slice(rejectionStepIndex + 1).forEach(step => {
        step.status = "inactive";
      });
    } else {
      // Find current status index normally
      let currentIndex = steps.indexOf(audit.status);

      // Mark steps before the current status as completed
      transformedSteps.forEach((step, index) => {
        if (index < currentIndex) {
          step.status = "completed";
        }
      });

      // Mark the current step as active
      if (currentIndex !== -1) {
        transformedSteps[currentIndex].status = "active";
      }
    }

    return {
      _id: audit._id,
      status: audit.status,
      steps: transformedSteps,
      userData: audit.userData,
      description: audit.description,
      ar_review: audit.ar_review,
      dr_review: audit.dr_review,
      date: audit.date
    };
  });
}

const getAuditsByUserId = (userId) => {
  return new Promise(async (resolve, reject) => {
    try {
      let audits = await db.get()
        .collection(collections.AUDIT_COLLECTION)
        .find({ userId: userId })
        .toArray();
      resolve(audits);
    } catch (error) {
      reject(error);
    }
  });
};

const submitAuditDocuments = (auditId, documents) => {
  return new Promise(async (resolve, reject) => {
    try {
      await db.get().collection(collections.AUDIT_COLLECTION).updateOne(
        { _id: ObjectId(auditId) },
        { $set: { documents, status: 'submitted' } }
      );
      resolve();
    } catch (error) {
      reject(error);
    }
  });
};

module.exports = {
  statusMap,
  transformRegistrations,
  transformAudits,
  getAllregistrations: (userId) => {
    return new Promise(async (resolve, reject) => {
      let registrations = await db
        .get()
        .collection(collections.REGISTRATION)
        .find({ userId: new ObjectId(userId) }).sort({ _id: -1 })
        .toArray();
      resolve(registrations);
    });
  },
  getAllregistrationsForAdmin: () => {
    return new Promise(async (resolve, reject) => {
      let registrations = await db
        .get()
        .collection(collections.REGISTRATION)
        .find()
        .toArray();
      resolve(registrations);
    });
  },




  statusMap,
  transformbylawRegistrations,
  getAllbylawregistrations: (userId) => {
    return new Promise(async (resolve, reject) => {
      let bylawregistrations = await db
        .get()
        .collection(collections.BYLAWREGISTRATION)
        .find({ userId: new ObjectId(userId) }).sort({ _id: -1 })
        .toArray();
      resolve(bylawregistrations);
    });
  },
  getAllbylawregistrationsForAdmin: (userId) => {
    return new Promise(async (resolve, reject) => {
      let bylawregistrations = await db
        .get()
        .collection(collections.BYLAWREGISTRATION)
        .find()
        .toArray();
      resolve(bylawregistrations);
    });
  },
  getnotificationById: (userId) => {
    return new Promise(async (resolve, reject) => {
      try {
        // Fetch notifications based on userId (converted to ObjectId)
        const notifications = await db.get()
          .collection(collections.NOTIFICATIONS_COLLECTION)
          .find({ userId: ObjectId(userId) }).sort({ _id: -1 }) // Filter by logged-in userId
          .toArray();

        resolve(notifications);
      } catch (error) {
        reject(error);
      }
    });
  },



  registration: (registrationData, callback) => {
    // Add createdAt field with the current timestamp
    if (registrationData.userId) {
      registrationData.userId = new ObjectId(registrationData.userId);
    }

    console.log(registrationData);
    db.get()
      .collection(collections.REGISTRATION)
      .insertOne(registrationData)
      .then((data) => {
        console.log(data);
        callback(data.ops[0]._id); // For MongoDB driver < v4.0
      })
      .catch((err) => {
        console.error('Error inserting room:', err);
      });
  },



  addFeedback: (feedback) => {
    return new Promise(async (resolve, reject) => {
      try {
        await db.get()
          .collection(collections.FEEDBACK_COLLECTION)
          .insertOne(feedback);
        resolve(); // Resolve the promise on success
      } catch (error) {
        reject(error); // Reject the promise on error
      }
    });
  },




  getFeedbackByWorkspaceId: (workspaceId) => {
    return new Promise(async (resolve, reject) => {
      try {
        const feedbacks = await db.get()
          .collection(collections.FEEDBACK_COLLECTION)
          .find({ workspaceId: ObjectId(workspaceId) }) // Convert workspaceId to ObjectId
          .toArray();

        resolve(feedbacks);
      } catch (error) {
        reject(error);
      }
    });
  },


  getBuilderById: (builderId) => {
    return new Promise(async (resolve, reject) => {
      try {
        const builder = await db.get()
          .collection(collections.BUILDER_COLLECTION)
          .findOne({ _id: ObjectId(builderId) });
        resolve(builder);
      } catch (error) {
        reject(error);
      }
    });
  },








  ///////GET ALL workspace/////////////////////     

  getAllworkspaces: () => {
    return new Promise(async (resolve, reject) => {
      let workspaces = await db
        .get()
        .collection(collections.WORKSPACE_COLLECTION)
        .find()
        .toArray();
      resolve(workspaces);
    });
  },

  getWorkspaceById: (workspaceId) => {
    return new Promise(async (resolve, reject) => {
      try {
        const workspace = await db.get()
          .collection(collections.WORKSPACE_COLLECTION)
          .findOne({ _id: ObjectId(workspaceId) }); // Convert workspaceId to ObjectId
        resolve(workspace);
      } catch (error) {
        reject(error);
      }
    });
  },

  // getAllworkspaces: (builderId) => {
  //   return new Promise(async (resolve, reject) => {
  //     let workspaces = await db
  //       .get()
  //       .collection(collections.WORKSPACE_COLLECTION)
  //       .find({ builderId: objectId(builderId) }) // Filter by builderId
  //       .toArray();
  //     resolve(workspaces);
  //   });
  // },

  /////// workspace DETAILS/////////////////////                                            
  getworkspaceDetails: (workspaceId) => {
    return new Promise((resolve, reject) => {
      db.get()
        .collection(collections.WORKSPACE_COLLECTION)
        .findOne({
          _id: objectId(workspaceId)
        })
        .then((response) => {
          resolve(response);
        });
    });
  },

  getAllProducts: () => {
    return new Promise(async (resolve, reject) => {
      let products = await db
        .get()
        .collection(collections.PRODUCTS_COLLECTION)
        .find()
        .toArray();
      resolve(products);
    });
  },

  doSignup: (userData) => {
    return new Promise(async (resolve, reject) => {
      try {
        // Hash the password
        userData.Password = await bcrypt.hash(userData.Password, 10);

        // Set default values
        userData.isDisable = false;  // User is not disabled by default
        userData.createdAt = new Date();  // Set createdAt to the current date and time

        // Insert the user into the database
        db.get()
          .collection(collections.USERS_COLLECTION)
          .insertOne(userData)
          .then((data) => {
            // Resolve with the inserted user data
            resolve(data.ops[0]);
          })
          .catch((err) => {
            // Reject with any error during insertion
            reject(err);
          });
      } catch (err) {
        reject(err);  // Reject in case of any error during password hashing
      }
    });
  },

  doSignin: (userData) => {
    return new Promise(async (resolve, reject) => {
      let response = {};

      // Find user by email
      let user = await db
        .get()
        .collection(collections.USERS_COLLECTION)
        .findOne({ Email: userData.Email });

      // If user exists, check if the account is disabled
      if (user) {
        if (user.isDisable) {
          // If the account is disabled, return the msg from the user collection
          response.status = false;
          response.msg = user.msg || "Your account has been disabled.";
          return resolve(response);
        }

        // Compare passwords
        bcrypt.compare(userData.Password, user.Password).then((status) => {
          if (status) {
            console.log("Login Success");
            response.user = user;
            response.status = true;
            resolve(response);  // Successful login
          } else {
            console.log("Login Failed");
            resolve({ status: false });  // Invalid password
          }
        });
      } else {
        console.log("Login Failed");
        resolve({ status: false });  // User not found
      }
    });
  },

  getUserDetails: (userId) => {
    return new Promise((resolve, reject) => {
      db.get()
        .collection(collections.USERS_COLLECTION)
        .findOne({ _id: objectId(userId) })
        .then((user) => {
          resolve(user);
        })
        .catch((err) => {
          reject(err);
        });
    });
  },

  updateUserProfile: (userId, userDetails) => {
    return new Promise((resolve, reject) => {
      db.get()
        .collection(collections.USERS_COLLECTION)
        .updateOne(
          { _id: objectId(userId) },
          {
            $set: {
              Fname: userDetails.Fname,
              Lname: userDetails.Lname,
              Email: userDetails.Email,
              Phone: userDetails.Phone,
              Address: userDetails.Address,
              District: userDetails.District,
              Pincode: userDetails.Pincode,
            },
          }
        )
        .then((response) => {
          resolve();
        })
        .catch((err) => {
          reject(err);
        });
    });
  },


  getTotalAmount: (userId) => {
    return new Promise(async (resolve, reject) => {
      let total = await db
        .get()
        .collection(collections.CART_COLLECTION)
        .aggregate([
          {
            $match: { user: objectId(userId) },
          },
          {
            $unwind: "$products",
          },
          {
            $project: {
              item: "$products.item",
              quantity: "$products.quantity",
            },
          },
          {
            $lookup: {
              from: collections.PRODUCTS_COLLECTION,
              localField: "item",
              foreignField: "_id",
              as: "product",
            },
          },
          {
            $project: {
              item: 1,
              quantity: 1,
              product: { $arrayElemAt: ["$product", 0] },
            },
          },
          {
            $group: {
              _id: null,
              total: { $sum: { $multiply: ["$quantity", "$product.Price"] } },
            },
          },
        ])
        .toArray();
      console.log(total[0].total);
      resolve(total[0].total);
    });
  },




  getWorkspaceDetails: (workspaceId) => {
    return new Promise((resolve, reject) => {
      if (!ObjectId.isValid(workspaceId)) {
        reject(new Error('Invalid workspace ID format'));
        return;
      }

      db.get()
        .collection(collections.WORKSPACE_COLLECTION)
        .findOne({ _id: ObjectId(workspaceId) })
        .then((workspace) => {
          if (!workspace) {
            reject(new Error('Workspace not found'));
          } else {
            // Assuming the workspace has a builderId field
            resolve(workspace);
          }
        })
        .catch((err) => {
          reject(err);
        });
    });
  },




  placeOrder: (order, workspace, total, user) => {
    return new Promise(async (resolve, reject) => {
      try {
        console.log(order, workspace, total);
        let status = order["payment-method"] === "COD" ? "placed" : "pending";

        // Get the workspace document to check the current seat value
        const workspaceDoc = await db.get()
          .collection(collections.WORKSPACE_COLLECTION)
          .findOne({ _id: objectId(workspace._id) });

        // Check if the workspace exists and the seat field is present
        if (!workspaceDoc || !workspaceDoc.seat) {
          return reject(new Error("Workspace not found or seat field is missing."));
        }

        // Convert seat from string to number and check availability
        let seatCount = Number(workspaceDoc.seat);
        if (isNaN(seatCount) || seatCount <= 0) {
          return reject(new Error("Seat is not available."));
        }

        // Create the order object
        let orderObject = {
          deliveryDetails: {
            Fname: order.Fname,
            Lname: order.Lname,
            Email: order.Email,
            Phone: order.Phone,
            Address: order.Address,
            District: order.District,
            State: order.State,
            Pincode: order.Pincode,
            selecteddate: order.selecteddate,
          },
          userId: objectId(order.userId),
          user: user,
          paymentMethod: order["payment-method"],
          workspace: workspace,
          totalAmount: total,
          status: status,
          date: new Date(),
          builderId: workspace.builderId, // Store the builder's ID
        };

        // Insert the order into the database
        const response = await db.get()
          .collection(collections.ORDER_COLLECTION)
          .insertOne(orderObject);

        // Decrement the seat count
        seatCount -= 1; // Decrement the seat count

        // Convert back to string and update the workspace seat count
        await db.get()
          .collection(collections.WORKSPACE_COLLECTION)
          .updateOne(
            { _id: objectId(workspace._id) },
            { $set: { seat: seatCount.toString() } } // Convert number back to string
          );

        resolve(response.ops[0]._id);
      } catch (error) {
        console.error("Error placing order:", error);
        reject(error);
      }
    });
  },


  getUserOrder: (userId) => {
    return new Promise(async (resolve, reject) => {
      try {
        let orders = await db
          .get()
          .collection(collections.ORDER_COLLECTION)
          .find({ userId: ObjectId(userId) }) // Use 'userId' directly, not inside 'orderObject'
          .toArray();

        resolve(orders);
      } catch (error) {
        reject(error);
      }
    });
  },

  getOrderWorkspaces: (orderId) => {
    return new Promise(async (resolve, reject) => {
      try {
        let workspaces = await db
          .get()
          .collection(collections.ORDER_COLLECTION)
          .aggregate([
            {
              $match: { _id: objectId(orderId) }, // Match the order by its ID
            },
            {
              $project: {
                // Include workspace, user, and other relevant fields
                workspace: 1,
                user: 1,
                paymentMethod: 1,
                totalAmount: 1,
                status: 1,
                date: 1,
                deliveryDetails: 1, // Add deliveryDetails to the projection

              },
            },
          ])
          .toArray();

        resolve(workspaces[0]); // Fetch the first (and likely only) order matching this ID
      } catch (error) {
        reject(error);
      }
    });
  },

  generateRazorpay: (orderId, totalPrice) => {
    return new Promise((resolve, reject) => {
      var options = {
        amount: totalPrice * 100, // amount in the smallest currency unit
        currency: "INR",
        receipt: "" + orderId,
      };
      instance.orders.create(options, function (err, order) {
        console.log("New Order : ", order);
        resolve(order);
      });
    });
  },

  verifyPayment: (details) => {
    return new Promise((resolve, reject) => {
      const crypto = require("crypto");
      let hmac = crypto.createHmac("sha256", "xPzG53EXxT8PKr34qT7CTFm9");

      hmac.update(
        details.payment.razorpay_order_id +
        "|" +
        details.payment.razorpay_payment_id
      );
      hmac = hmac.digest("hex");

      if (hmac == details.payment.razorpay_signature) {
        resolve();
      } else {
        reject();
      }
    });
  },

  changePaymentStatus: (orderId) => {
    return new Promise((resolve, reject) => {
      db.get()
        .collection(collections.ORDER_COLLECTION)
        .updateOne(
          { _id: objectId(orderId) },
          {
            $set: {
              "orderObject.status": "placed",
            },
          }
        )
        .then(() => {
          resolve();
        });
    });
  },

  cancelOrder: (orderId) => {
    return new Promise(async (resolve, reject) => {
      db.get()
        .collection(collections.ORDER_COLLECTION)
        .removeOne({ _id: objectId(orderId) })
        .then(() => {
          resolve();
        });
    });
  },

  searchProduct: (details) => {
    console.log(details);
    return new Promise(async (resolve, reject) => {
      db.get()
        .collection(collections.PRODUCTS_COLLECTION)
        .createIndex({ Name: "text" }).then(async () => {
          let result = await db
            .get()
            .collection(collections.PRODUCTS_COLLECTION)
            .find({
              $text: {
                $search: details.search,
              },
            })
            .toArray();
          resolve(result);
        })

    });
  },

  changeRegistrationStatus: (registrationId, status) => {
    return new Promise((resolve, reject) => {
      db.get()
        .collection(collections.REGISTRATION)
        .updateOne(
          { _id: ObjectId(registrationId) },
          { $set: { status: status } }
        )
        .then(() => {
          resolve();
        })
        .catch((err) => {
          reject(err);
        });
    });
  },



  changebylawRegistrationStatus: (bylawregistrationId, status) => {
    return new Promise((resolve, reject) => {
      db.get()
        .collection(collections.BYLAWREGISTRATION)
        .updateOne(
          { _id: ObjectId(bylawregistrationId) },
          { $set: { status: status } }
        )
        .then(() => {
          resolve();
        })
        .catch((err) => {
          reject(err);
        });
    });
  },








  bylawregistration: (bylawregistrationData, callback) => {
    // Add createdAt field with the current timestamp
    if (bylawregistrationData.userId) {
      bylawregistrationData.userId = new ObjectId(bylawregistrationData.userId);
    }

    console.log(bylawregistrationData);
    db.get()
      .collection(collections.BYLAWREGISTRATION)
      .insertOne(bylawregistrationData)
      .then((data) => {
        console.log(data);
        callback(data.ops[0]._id); // For MongoDB driver < v4.0
      })
      .catch((err) => {
        console.error('Error inserting room:', err);
      });
  },

  getAllUsers: () => {
    return new Promise(async (resolve, reject) => {
      try {
        const users = await db.get().collection(collections.USERS_COLLECTION).find().toArray();
        resolve(users);
      } catch (error) {
        reject(error);
      }
    });
  },

  getAllAudits: () => {
    return new Promise(async (resolve, reject) => {
      try {

        const audits = await db.get().collection(collections.AUDIT_COLLECTION).aggregate([
          {
            $lookup: {
              from: collections.USERS_COLLECTION,
              let: { userId: { $toObjectId: "$userId" } },
              pipeline: [
                { $match: { $expr: { $eq: ["$_id", "$$userId"] } } }
              ],
              as: "userData"
            }
          },
          {
            $unwind: "$userData"
          }
        ]).toArray();
        resolve(audits);
      } catch (error) {
        reject(error);
      }
    });
  },

  createAudit: (auditData) => {
    return new Promise(async (resolve, reject) => {
      try {
        await db.get().collection(collections.AUDIT_COLLECTION).insertOne(auditData);
        resolve();
      } catch (error) {
        reject(error);
      }
    });
  },

  submitAuditDocuments: (auditId, documents) => {
    return new Promise(async (resolve, reject) => {
      try {
        await db.get().collection(collections.AUDIT_COLLECTION).updateOne(
          { _id: ObjectId(auditId) },
          { $set: { documents, status: 'submitted' } }
        );
        resolve();
      } catch (error) {
        reject(error);
      }
    });
  },

  forwardAudit: (auditId, status, review) => {
    return new Promise(async (resolve, reject) => {
      try {
        await db.get().collection(collections.AUDIT_COLLECTION).updateOne(
          { _id: ObjectId(auditId) },
          { $set: { status, review } }
        );
        resolve();
      } catch (error) {
        reject(error);
      }
    });
  },

  getAuditsByUserId,
  submitAuditDocuments,

  completeTrainingMaterial: (userId, trainingMaterialId) => {
    return new Promise(async (resolve, reject) => {
      try {
        await db.get().collection(collections.USERS_COLLECTION).updateOne(
          { _id: ObjectId(userId) },
          { $addToSet: { completedTrainingMaterials: ObjectId(trainingMaterialId) } }
        );
        resolve();
      } catch (error) {
        reject(error);
      }
    });
  },

  getAllCompletedMeterials: (userId) => {
    return new Promise(async (resolve, reject) => {
      try {
        const user = await db.get().collection(collections.USERS_COLLECTION).findOne({ _id: ObjectId(userId) });
        const completedMeerials = db.get().collection(collections.MATERIALS_COLLECTION).find({ _id: { $in: user.completedTrainingMaterials ?? [] } }).toArray();
        resolve(completedMeerials);
      } catch (error) {
        reject(error);
      }
    });
  },

  saveChatMessage: (userId, message, sender) => {
    return new Promise(async (resolve, reject) => {
      try {
        const chatMessage = {
          userId: ObjectId(userId),
          message,
          sender,
          timestamp: new Date()
        };
        await db.get().collection(collections.CHAT_MESSAGES_COLLECTION).insertOne(chatMessage);
        resolve();
      } catch (error) {
        reject(error);
      }
    });
  },

  getChatMessages: (userId) => {
    return new Promise(async (resolve, reject) => {
      try {
        const messages = await db.get().collection(collections.CHAT_MESSAGES_COLLECTION)
          .find({ userId: ObjectId(userId) })
          .sort({ timestamp: 1 })
          .toArray();
        resolve(messages);
      } catch (error) {
        reject(error);
      }
    });
  }
};
