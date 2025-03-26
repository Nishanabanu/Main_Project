var db = require("../config/connection");
var collections = require("../config/collections");
const { statusMap } = require("./userHelper");
const { ObjectId } = require("mongodb");
const objectId = require("mongodb").ObjectID;



module.exports = {
  getUserReviewStatus: (userType) => {
    switch (userType) {
      case "Assistant Registrar":
        return "payment";
      case "Deputy Registrar":
        return "assistant-registrar-review";
      case "Joint Registrar":
        return "deputy-registrar-review";
      default:
        return null;
    }
  },
  getAllregistrations: () => {
    return new Promise(async (resolve, reject) => {
      try {
        const validStatuses = ['form-submitted'];
        const registrations = await db
          .get()
          .collection(collections.REGISTRATION)
          .aggregate([
            { $match: { status: { $nin: validStatuses } } },
            { $lookup: { from: 'users', localField: 'userId', foreignField: '_id', as: 'userData' } },
            { $unwind: { path: '$userData', preserveNullAndEmptyArrays: true } }
          ])
          .toArray();
        resolve(registrations);
      } catch (error) {
        reject(error);
      }
    });
  },
  getRegistrationById: (registrationId) => {
    return new Promise(async (resolve, reject) => {
      try {
        const registration = await db
          .get()
          .collection(collections.REGISTRATION)
          .findOne({ _id: objectId(registrationId) });
        resolve(registration);
      } catch (error) {
        reject(error);
      }
    });
  },
  changeRegistrationStatus: (registrationId, action, reason = '', userType = '', signature = null, pdfUrl) => {
    return new Promise(async (resolve, reject) => {
      try {
        const registration = await db
          .get()
          .collection(collections.REGISTRATION)
          .findOne({ _id: new objectId(registrationId) });

        if (!registration) {
          reject("Registration not found");
        }

        let newStatus;
        const statusKeys = Object.keys(statusMap);
        const currentStatusIndex = statusKeys.indexOf(registration.status);

        if (action === 'accepted') {
          if (currentStatusIndex >= 0 && currentStatusIndex < statusKeys.length - 1) {
            newStatus = statusKeys[currentStatusIndex + 1];
          } else {
            reject("No further status available");
          }
        } else if (action === 'rejected') {
          newStatus = 'rejected';
        } else {
          reject("Invalid action");
        }

        // Prepare update data
        const updateData = { status: newStatus, rejectedBy: userType };
        if (action === 'rejected' && reason) {
          updateData.rejectReason = reason;
        }

        if (pdfUrl) {
          updateData.finalReport = pdfUrl
          updateData.status = 'completed'
        }

        // Update registration status
        const response = await db
          .get()
          .collection(collections.REGISTRATION)
          .updateOne({ _id: objectId(registrationId) }, { $set: updateData });

        resolve(response);
      } catch (error) {
        console.log(error)
        reject("Invalid action");

      }
    });
  },
  getAllBylawRegistrations: () => {
    return new Promise(async (resolve, reject) => {
      try {
        const validStatuses = ['form-submitted'];
        const registrations = await db
          .get()
          .collection(collections.BYLAWREGISTRATION)
          .aggregate([
            { $match: { status: { $nin: validStatuses } } },
            { $lookup: { from: 'users', localField: 'userId', foreignField: '_id', as: 'userData' } },
            { $unwind: { path: '$userData', preserveNullAndEmptyArrays: true } }
          ])
          .toArray();
        resolve(registrations);
      } catch (error) {
        reject(error);
      }
    });
  },
  getBylawRegistrationById: (registrationId) => {
    return new Promise(async (resolve, reject) => {
      try {
        const registration = await db
          .get()
          .collection(collections.BYLAWREGISTRATION)
          .findOne({ _id: objectId(registrationId) });
        resolve(registration);
      } catch (error) {
        reject(error);
      }
    });
  },
  changeBylawRegistrationStatus: (registrationId, action, reason = '', userType = '', signature = null, pdfUrl) => {
    return new Promise(async (resolve, reject) => {
      try {
        const registration = await db
          .get()
          .collection(collections.BYLAWREGISTRATION)
          .findOne({ _id: new objectId(registrationId) });

        if (!registration) {
          reject("Registration not found");
        }

        let newStatus;
        const statusKeys = Object.keys(statusMap);
        const currentStatusIndex = statusKeys.indexOf(registration.status);

        if (action === 'accepted') {
          if (currentStatusIndex >= 0 && currentStatusIndex < statusKeys.length - 1) {
            newStatus = statusKeys[currentStatusIndex + 1];
          } else {
            reject("No further status available");
          }
        } else if (action === 'rejected') {
          newStatus = 'rejected';
        } else {
          reject("Invalid action");
        }

        // Prepare update data
        const updateData = { status: newStatus, rejectedBy: userType };
        if (action === 'rejected' && reason) {
          updateData.rejectReason = reason;
        }

        if (pdfUrl) {
          updateData.finalReport = pdfUrl
          updateData.status = 'completed'
        }

        // Update registration status
        const response = await db
          .get()
          .collection(collections.BYLAWREGISTRATION)
          .updateOne({ _id: objectId(registrationId) }, { $set: updateData });

        resolve(response);
      } catch (error) {
        console.log(error)
        reject("Invalid action");

      }
    });
  },
  ///////ADD notification/////////////////////                                         
  addnotification: (notification, callback) => {
    // Convert officerId and userId to objectId if they are provided in the notification
    if (notification.officerId) {
      notification.officerId = objectId(notification.officerId); // Convert officerId to objectId
    }

    if (notification.userId) {
      notification.userId = objectId(notification.userId); // Convert userId to objectId
    }

    notification.createdAt = new Date(); // Set createdAt as the current date and time

    console.log(notification);  // Log notification to check the changes

    db.get()
      .collection(collections.NOTIFICATIONS_COLLECTION)
      .insertOne(notification)
      .then((data) => {
        console.log(data);  // Log the inserted data for debugging
        callback(data.ops[0]._id);  // Return the _id of the inserted notification
      })
      .catch((err) => {
        console.error("Error inserting notification:", err);
        callback(null, err);  // Pass error back to callback
      });
  },

  ///////GET ALL notification/////////////////////   

  getAllnotifications: (officerId) => {
    return new Promise(async (resolve, reject) => {
      try {
        // Fetch notifications by officerId and populate user details
        let notifications = await db
          .get()
          .collection(collections.NOTIFICATIONS_COLLECTION)
          .aggregate([
            // Match notifications by officerId
            {
              $match: { "officerId": objectId(officerId) }
            },
            // Lookup user details based on userId
            {
              $lookup: {
                from: collections.USERS_COLLECTION, // Assuming your users collection is named 'USERS_COLLECTION'
                localField: "userId", // Field in notifications collection
                foreignField: "_id", // Field in users collection
                as: "userDetails" // Name of the array where the user details will be stored
              }
            },
            // Unwind the userDetails array to get a single document (since $lookup returns an array)
            {
              $unwind: { path: "$userDetails", preserveNullAndEmptyArrays: true }
            }
          ])
          .toArray();

        resolve(notifications);
      } catch (error) {
        reject(error);
      }
    });
  },


  ///////ADD notification DETAILS/////////////////////                                            
  getnotificationDetails: (notificationId) => {
    return new Promise((resolve, reject) => {
      db.get()
        .collection(collections.NOTIFICATION_COLLECTION)
        .findOne({
          _id: objectId(notificationId)
        })
        .then((response) => {
          resolve(response);
        });
    });
  },

  ///////DELETE notification/////////////////////                                            
  deletenotification: (notificationId) => {
    return new Promise((resolve, reject) => {
      db.get()
        .collection(collections.NOTIFICATION_COLLECTION)
        .removeOne({
          _id: objectId(notificationId)
        })
        .then((response) => {
          console.log(response);
          resolve(response);
        });
    });
  },

  ///////UPDATE notification/////////////////////                                            
  updatenotification: (notificationId, notificationDetails) => {
    return new Promise((resolve, reject) => {
      db.get()
        .collection(collections.NOTIFICATIONS_COLLECTION)
        .updateOne(
          {
            _id: objectId(notificationId)
          },
          {
            $set: {
              Name: notificationDetails.Name,
              Category: notificationDetails.Category,
              Price: notificationDetails.Price,
              Description: notificationDetails.Description,
            },
          }
        )
        .then((response) => {
          resolve();
        });
    });
  },


  ///////DELETE ALL notification/////////////////////                                            
  deleteAllnotifications: () => {
    return new Promise((resolve, reject) => {
      db.get()
        .collection(collections.NOTIFICATION_COLLECTION)
        .remove({})
        .then(() => {
          resolve();
        });
    });
  },



  getFeedbackByOfficerId: (officerId) => {
    return new Promise(async (resolve, reject) => {
      try {
        const feedbacks = await db.get()
          .collection(collections.FEEDBACK_COLLECTION)
          .find({ officerId: objectId(officerId) }) // Convert officerId to objectId
          .toArray();
        resolve(feedbacks);
      } catch (error) {
        reject(error);
      }
    });
  },

  ///////ADD workspace/////////////////////                                         
  addworkspace: (workspace, officerId, callback) => {
    if (!officerId || !objectId.isValid(officerId)) {
      return callback(null, new Error("Invalid or missing officerId"));
    }

    workspace.Price = parseInt(workspace.Price);
    workspace.officerId = objectId(officerId); // Associate workspace with the officer

    db.get()
      .collection(collections.WORKSPACE_COLLECTION)
      .insertOne(workspace)
      .then((data) => {
        callback(data.ops[0]._id); // Return the inserted workspace ID
      })
      .catch((error) => {
        callback(null, error);
      });
  },


  ///////GET ALL workspace/////////////////////                                            
  getAllworkspaces: (officerId) => {
    return new Promise(async (resolve, reject) => {
      let workspaces = await db
        .get()
        .collection(collections.WORKSPACE_COLLECTION)
        .find({ officerId: objectId(officerId) }) // Filter by officerId
        .toArray();
      resolve(workspaces);
    });
  },

  ///////ADD workspace DETAILS/////////////////////                                            
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

  ///////DELETE workspace/////////////////////                                            
  deleteworkspace: (workspaceId) => {
    return new Promise((resolve, reject) => {
      db.get()
        .collection(collections.WORKSPACE_COLLECTION)
        .removeOne({
          _id: objectId(workspaceId)
        })
        .then((response) => {
          console.log(response);
          resolve(response);
        });
    });
  },

  ///////UPDATE workspace/////////////////////                                            
  updateworkspace: (workspaceId, workspaceDetails) => {
    return new Promise((resolve, reject) => {
      db.get()
        .collection(collections.WORKSPACE_COLLECTION)
        .updateOne(
          {
            _id: objectId(workspaceId)
          },
          {
            $set: {
              wname: workspaceDetails.wname,
              seat: workspaceDetails.seat,
              Price: workspaceDetails.Price,
              format: workspaceDetails.format,
              desc: workspaceDetails.desc,
              baddress: workspaceDetails.baddress,

            },
          }
        )
        .then((response) => {
          resolve();
        });
    });
  },


  ///////DELETE ALL workspace/////////////////////                                            
  deleteAllworkspaces: () => {
    return new Promise((resolve, reject) => {
      db.get()
        .collection(collections.WORKSPACE_COLLECTION)
        .remove({})
        .then(() => {
          resolve();
        });
    });
  },


  addProduct: (product, callback) => {
    console.log(product);
    product.Price = parseInt(product.Price);
    db.get()
      .collection(collections.PRODUCTS_COLLECTION)
      .insertOne(product)
      .then((data) => {
        console.log(data);
        callback(data.ops[0]._id);
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

  dosignup: (officerData) => {
    return new Promise(async (resolve, reject) => {
      try {
        officerData.Password = await bcrypt.hash(officerData.Password, 10);
        officerData.approved = false; // Set approved to false initially
        const data = await db.get().collection(collections.OFFICERS_COLLECTION).insertOne(officerData);
        resolve(data.ops[0]);
      } catch (error) {
        reject(error);
      }
    });
  },


  doSignin: (officerData) => {
    return new Promise(async (resolve, reject) => {
      let response = {};

      // Find officer by email
      let officer = await db
        .get()
        .collection(collections.OFFICERS_COLLECTION)
        .findOne({ username: officerData.username });

      // If officer exists, check if the account is disabled
      if (officer) {
        if (officer.isDisable) {
          // If the account is disabled, return the msg from the officer collection
          response.status = false;
          response.msg = officer.msg || "Your account has been disabled.";
          return resolve(response);
        }

        // Compare passwords
        // Plain text comparison
        if (officerData.password === officer.password) {
          console.log("Login Success");
          response.officer = officer;
          response.status = true;
          resolve(response); // Successful login
        } else {
          console.log("Login Failed - Invalid Password");
          resolve({ status: false }); // Invalid password
        }
      } else {
        console.log("Login Failed");
        resolve({ status: false });  // Officer not found
      }
    });
  },


  getProductDetails: (productId) => {
    return new Promise((resolve, reject) => {
      db.get()
        .collection(collections.PRODUCTS_COLLECTION)
        .findOne({ _id: objectId(productId) })
        .then((response) => {
          resolve(response);
        });
    });
  },

  deleteProduct: (productId) => {
    return new Promise((resolve, reject) => {
      db.get()
        .collection(collections.PRODUCTS_COLLECTION)
        .removeOne({ _id: objectId(productId) })
        .then((response) => {
          console.log(response);
          resolve(response);
        });
    });
  },

  updateProduct: (productId, productDetails) => {
    return new Promise((resolve, reject) => {
      db.get()
        .collection(collections.PRODUCTS_COLLECTION)
        .updateOne(
          { _id: objectId(productId) },
          {
            $set: {
              Name: productDetails.Name,
              Category: productDetails.Category,
              Price: productDetails.Price,
              Description: productDetails.Description,
            },
          }
        )
        .then((response) => {
          resolve();
        });
    });
  },

  deleteAllProducts: () => {
    return new Promise((resolve, reject) => {
      db.get()
        .collection(collections.PRODUCTS_COLLECTION)
        .remove({})
        .then(() => {
          resolve();
        });
    });
  },

  getAllUsers: () => {
    return new Promise(async (resolve, reject) => {
      let users = await db
        .get()
        .collection(collections.USERS_COLLECTION)
        .find()
        .toArray();
      resolve(users);
    });
  },

  removeUser: (userId) => {
    return new Promise((resolve, reject) => {
      db.get()
        .collection(collections.USERS_COLLECTION)
        .removeOne({ _id: objectId(userId) })
        .then(() => {
          resolve();
        });
    });
  },

  removeAllUsers: () => {
    return new Promise((resolve, reject) => {
      db.get()
        .collection(collections.USERS_COLLECTION)
        .remove({})
        .then(() => {
          resolve();
        });
    });
  },

  getAllOrders: (officerId) => {
    return new Promise(async (resolve, reject) => {
      try {
        let orders = await db
          .get()
          .collection(collections.ORDER_COLLECTION)
          .find({ "officerId": objectId(officerId) }) // Filter by officer ID
          .sort({ createdAt: -1 })  // Sort by createdAt in descending order
          .toArray();
        resolve(orders);
      } catch (error) {
        reject(error);
      }
    });
  },

  changeStatus: (status, orderId) => {
    return new Promise((resolve, reject) => {
      db.get()
        .collection(collections.ORDER_COLLECTION)
        .updateOne(
          { _id: objectId(orderId) },
          {
            $set: {
              "status": status,
            },
          }
        )
        .then(() => {
          resolve();
        });
    });
  },

  cancelOrder: async (orderId) => {
    return new Promise(async (resolve, reject) => {
      try {
        // Fetch the order to get the associated workspace ID
        const order = await db.get()
          .collection(collections.ORDER_COLLECTION)
          .findOne({ _id: objectId(orderId) });

        if (!order) {
          return reject(new Error("Order not found."));
        }

        const workspaceId = order.workspace._id; // Get the workspace ID from the order

        // Remove the order from the database
        await db.get()
          .collection(collections.ORDER_COLLECTION)
          .deleteOne({ _id: objectId(orderId) });

        // Get the current seat count from the workspace
        const workspaceDoc = await db.get()
          .collection(collections.WORKSPACE_COLLECTION)
          .findOne({ _id: objectId(workspaceId) });

        // Check if the seat field exists and is a string
        if (workspaceDoc && workspaceDoc.seat) {
          let seatCount = Number(workspaceDoc.seat); // Convert seat count from string to number

          // Check if the seatCount is a valid number
          if (!isNaN(seatCount)) {
            seatCount += 1; // Increment the seat count

            // Convert back to string and update the workspace seat count
            await db.get()
              .collection(collections.WORKSPACE_COLLECTION)
              .updateOne(
                { _id: objectId(workspaceId) },
                { $set: { seat: seatCount.toString() } } // Convert number back to string
              );

            resolve(); // Successfully updated the seat count
          } else {
            return reject(new Error("Seat count is not a valid number."));
          }
        } else {
          return reject(new Error("Workspace not found or seat field is missing."));
        }
      } catch (error) {
        console.error("Error canceling order:", error);
        reject(error);
      }
    });
  },


  cancelAllOrders: () => {
    return new Promise((resolve, reject) => {
      db.get()
        .collection(collections.ORDER_COLLECTION)
        .remove({})
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

  createNotification: (officerId, message) => {
    return new Promise(async (resolve, reject) => {
      try {
        const notification = {
          officerId: objectId(officerId),
          message,
          isRead: false,
          timestamp: new Date()
        };
        const result = await db.get().collection(collections.NOTIFICATIONS_COLLECTION).insertOne(notification);
        resolve(result.ops[0]);
      } catch (error) {
        reject(error);
      }
    });
  },

  getNotifications: (officerId) => {
    return new Promise(async (resolve, reject) => {
      try {
        const notifications = await db.get().collection(collections.NOTIFICATIONS_COLLECTION)
          .find({ officerId: objectId(officerId),isRead: false })
          .sort({ timestamp: -1 })
          .toArray();
        resolve(notifications);
      } catch (error) {
        reject(error);
      }
    });
  },

  markNotificationAsRead: (notificationId) => {
    return new Promise(async (resolve, reject) => {
      try {
        await db.get().collection(collections.NOTIFICATIONS_COLLECTION)
          .updateOne({ _id: objectId(notificationId) }, { $set: { isRead: true } });
        resolve();
      } catch (error) {
        reject(error);
      }
    });
  },

  getUnreadNotificationCount: (officerId) => {
    return new Promise(async (resolve, reject) => {
      try {
        const count = await db.get().collection(collections.NOTIFICATIONS_COLLECTION)
          .countDocuments({ officerId: objectId(officerId), isRead: false });
        resolve(count);
      } catch (error) {
        reject(error);
      }
    });
  },

  getOfficersByType: (type) => {
    return new Promise(async (resolve, reject) => {
      try {
        const officers = await db.get().collection(collections.OFFICERS_COLLECTION)
          .find({ type })
          .toArray();
        resolve(officers);
      } catch (error) {
        reject(error);
      }
    });
  },

  // Register a complaint
  registerComplaint: (userId, complaintText) => {
    return new Promise(async (resolve, reject) => {
      try {
        const complaint = {
          userId: ObjectId(userId),
          text: complaintText,
          status: 'pending', // pending, resolved, forwarded
          assignedTo: 'Assistant Registrar', // Default assignment
          resolutionMessage: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        const result = await db.get().collection(collections.COMPLAINTS_COLLECTION).insertOne(complaint);
        resolve(result.ops[0]);
      } catch (error) {
        reject(error);
      }
    });
  },

  // Get complaints assigned to an officer
  getComplaintsByRole: (role) => {
    return new Promise(async (resolve, reject) => {
      try {
        const complaints = await db.get().collection(collections.COMPLAINTS_COLLECTION)
          .find({ assignedTo: role ,status:{$ne:'resolved'}})
          .sort({ createdAt: -1 })
          .toArray();
        resolve(complaints);
      } catch (error) {
        reject(error);
      }
    });
  },

  // Update complaint status
  updateComplaintStatus: (complaintId, status, resolutionMessage, assignedTo = null) => {
    return new Promise(async (resolve, reject) => {
      try {
        const updateData = {
          status,
          resolutionMessage,
          updatedAt: new Date(),
        };
        if (assignedTo) {
          updateData.assignedTo = assignedTo;
        }
        await db.get().collection(collections.COMPLAINTS_COLLECTION)
          .updateOne({ _id: ObjectId(complaintId) }, { $set: updateData });
        resolve();
      } catch (error) {
        reject(error);
      }
    });
  },

  // Get complaints for a user
  getUserComplaints: (userId) => {
    return new Promise(async (resolve, reject) => {
      try {
        const complaints = await db.get().collection(collections.COMPLAINTS_COLLECTION)
          .find({ userId: ObjectId(userId) })
          .sort({ createdAt: -1 })
          .toArray();
        resolve(complaints);
      } catch (error) {
        reject(error);
      }
    });
  },
};
