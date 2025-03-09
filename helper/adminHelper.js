var db = require("../config/connection");
var collections = require("../config/collections");
var bcrypt = require("bcrypt");
const objectId = require("mongodb").ObjectID;
const { ObjectId } = require('mongodb'); // Import ObjectId for MongoDB

module.exports = {

  ///////ADD officer/////////////////////                                         
  addnotification: (notification, callback) => {
    console.log(notification);

    // Convert userId to ObjectId if it's present
    if (notification.userId) {
      notification.userId = new objectId(notification.userId);
    }

    // Add createdAt field with the current timestamp
    notification.createdAt = new Date();

    db.get()
      .collection(collections.NOTIFICATIONS_COLLECTION)
      .insertOne(notification)
      .then((data) => {
        console.log(data);
        callback(data.ops[0]._id);
      })
      .catch((err) => {
        console.error("Error inserting notification:", err);
        callback(null);  // Handle error case by passing null
      });
  },


  ///////GET ALL Notifications/////////////////////                                            
  getAllnotifications: () => {
    return new Promise(async (resolve, reject) => {
      try {
        // Fetch all notifications and join with users collection to get Fname
        let notifications = await db
          .get()
          .collection(collections.NOTIFICATIONS_COLLECTION)
          .aggregate([
            {
              $lookup: {
                from: collections.USERS_COLLECTION,  // Name of the users collection
                localField: "userId",  // Field in notifications collection (userId)
                foreignField: "_id",  // Field in users collection (_id)
                as: "userDetails",  // Name of the array where user data will be stored
              },
            },
            {
              $unwind: {
                path: "$userDetails",  // Flatten the userDetails array
                preserveNullAndEmptyArrays: true,  // If user not found, keep notification
              },
            },
          ])
          .toArray();

        // Map over the notifications and add user first name (Fname)
        notifications = notifications.map(notification => ({
          ...notification,
          userFname: notification.userDetails ? notification.userDetails.Fname : 'Unknown',  // Fname of user or 'Unknown' if no user found
        }));

        resolve(notifications);
      } catch (err) {
        reject(err);
      }
    });
  },

  deletenotification: (notificationId) => {
    return new Promise((resolve, reject) => {
      db.get()
        .collection(collections.NOTIFICATIONS_COLLECTION)
        .removeOne({
          _id: objectId(notificationId)
        })
        .then((response) => {
          console.log(response);
          resolve(response);
        });
    });
  },

  ///////ADD officer/////////////////////                                         
  addofficer: (officer, callback) => {
    // Add createdAt field with the current timestamp
    officer.createdAt = new Date();

    console.log(officer);
    db.get()
      .collection(collections.OFFICERS_COLLECTION)
      .insertOne(officer)
      .then((data) => {
        console.log(data);
        callback(data.ops[0]._id); // For MongoDB driver < v4.0
      })
      .catch((err) => {
        console.error('Error inserting officer:', err);
      });
  },


  ///////GET ALL officer/////////////////////                                            
  getAllofficers: () => {
    return new Promise(async (resolve, reject) => {
      let officers = await db
        .get()
        .collection(collections.OFFICERS_COLLECTION)
        .find()
        .toArray();
      resolve(officers);
    });
  },

  ///////ADD officer DETAILS/////////////////////                                            
  getofficerDetails: (officerId) => {
    return new Promise((resolve, reject) => {
      db.get()
        .collection(collections.OFFICERS_COLLECTION)
        .findOne({
          _id: objectId(officerId)
        })
        .then((response) => {
          resolve(response);
        });
    });
  },

  ///////DELETE officer/////////////////////                                            
  deleteofficer: (officerId) => {
    return new Promise((resolve, reject) => {
      db.get()
        .collection(collections.OFFICERS_COLLECTION)
        .removeOne({
          _id: objectId(officerId)
        })
        .then((response) => {
          console.log(response);
          resolve(response);
        });
    });
  },

  ///////UPDATE officer/////////////////////                                            
  updateofficer: (officerId, officerDetails) => {
    return new Promise((resolve, reject) => {
      db.get()
        .collection(collections.OFFICERS_COLLECTION)
        .updateOne(
          {
            _id: objectId(officerId)
          },
          {
            $set: {
              officername: officerDetails.officername,
              type: officerDetails.type,
              email: officerDetails.email,
              phone: officerDetails.phone,
              address: officerDetails.address,
              username: officerDetails.username,
              password: officerDetails.password,

            },
          }
        )
        .then((response) => {
          resolve();
        });
    });
  },


  ///////DELETE ALL officer/////////////////////                                            
  deleteAllofficers: () => {
    return new Promise((resolve, reject) => {
      db.get()
        .collection(collections.OFFICERS_COLLECTION)
        .remove({})
        .then(() => {
          resolve();
        });
    });
  },





  ///////ADD ROOOOOMS/////////////////////                                         
  addroom: (room, callback) => {
    // Add createdAt field with the current timestamp
    room.createdAt = new Date();
    room.Price = parseInt(room.Price);

    console.log(room);
    db.get()
      .collection(collections.ROOM_COLLECTION)
      .insertOne(room)
      .then((data) => {
        console.log(data);
        callback(data.ops[0]._id); // For MongoDB driver < v4.0
      })
      .catch((err) => {
        console.error('Error inserting room:', err);
      });
  },


  ///////GET ALL room/////////////////////                                            
  getAllrooms: () => {
    return new Promise(async (resolve, reject) => {
      let rooms = await db
        .get()
        .collection(collections.ROOM_COLLECTION)
        .find()
        .toArray();
      resolve(rooms);
    });
  },

  ///////ADD room DETAILS/////////////////////                                            
  getroomDetails: (roomId) => {
    return new Promise((resolve, reject) => {
      db.get()
        .collection(collections.ROOM_COLLECTION)
        .findOne({
          _id: objectId(roomId)
        })
        .then((response) => {
          resolve(response);
        });
    });
  },

  ///////DELETE room/////////////////////                                            
  deleteroom: (roomId) => {
    return new Promise((resolve, reject) => {
      db.get()
        .collection(collections.ROOM_COLLECTION)
        .removeOne({
          _id: objectId(roomId)
        })
        .then((response) => {
          console.log(response);
          resolve(response);
        });
    });
  },

  ///////UPDATE room/////////////////////                                            
  updateroom: (roomId, roomDetails) => {
    return new Promise((resolve, reject) => {
      db.get()
        .collection(collections.ROOM_COLLECTION)
        .updateOne(
          {
            _id: objectId(roomId)
          },
          {
            $set: {
              Name: roomDetails.Name,
              Category: roomDetails.Category,
              Price: roomDetails.Price,
              Description: roomDetails.Description,
            },
          }
        )
        .then((response) => {
          resolve();
        });
    });
  },


  ///////DELETE ALL room/////////////////////                                            
  deleteAllrooms: () => {
    return new Promise((resolve, reject) => {
      db.get()
        .collection(collections.ROOM_COLLECTION)
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

  doSignup: (adminData) => {
    return new Promise(async (resolve, reject) => {
      if (adminData.Code == "admin123") {
        adminData.Password = await bcrypt.hash(adminData.Password, 10);
        db.get()
          .collection(collections.ADMIN_COLLECTION)
          .insertOne(adminData)
          .then((data) => {
            resolve(data.ops[0]);
          });
      } else {
        resolve({ status: false });
      }
    });
  },

  doSignin: (adminData) => {
    return new Promise(async (resolve, reject) => {
      let response = {};
      let admin = await db
        .get()
        .collection(collections.ADMIN_COLLECTION)
        .findOne({ Email: adminData.Email });
      if (admin) {
        bcrypt.compare(adminData.Password, admin.Password).then((status) => {
          if (status) {
            console.log("Login Success");
            response.admin = admin;
            response.status = true;
            resolve(response);
          } else {
            console.log("Login Failed");
            resolve({ status: false });
          }
        });
      } else {
        console.log("Login Failed");
        resolve({ status: false });
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
      try {
        const users = await db
          .get()
          .collection(collections.USERS_COLLECTION)
          .find()
          .sort({ createdAt: -1 })  // Sort by createdAt in descending order
          .toArray();

        resolve(users);
      } catch (err) {
        reject(err);  // Handle any error during fetching
      }
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

  blockUser: (userId) => {
    return new Promise((resolve, reject) => {
      try {
        // Convert the userId to ObjectId if it's not already
        const objectId = new ObjectId(userId);

        // Use updateOne to set isDisable to true
        db.get().collection(collections.USERS_COLLECTION).updateOne(
          { _id: objectId }, // Find user by ObjectId
          { $set: { isDisable: true } }, // Set the isDisable field to true
          (err, result) => {
            if (err) {
              reject(err); // Reject if there's an error
            } else {
              resolve(result); // Resolve if the update is successful
            }
          }
        );
      } catch (err) {
        reject(err); // Catch any error in case of an invalid ObjectId format
      }
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

  getAllOrders: (fromDate, toDate) => {
    return new Promise(async (resolve, reject) => {
      try {
        let query = {};

        // If fromDate and toDate are provided, filter orders by the date range
        if (fromDate && toDate) {
          // Add one day to toDate and set it to midnight
          const adjustedToDate = new Date(toDate);
          adjustedToDate.setDate(adjustedToDate.getDate() + 1);

          query = {
            date: {
              $gte: new Date(fromDate), // Orders from the start date
              $lt: adjustedToDate       // Orders up to the end of the toDate
            }
          };
        }

        let orders = await db.get()
          .collection(collections.ORDER_COLLECTION)
          .find(query)
          .toArray();

        resolve(orders);
      } catch (error) {
        reject(error);
      }
    });
  },


  getOrdersByDateRange: (fromDate, toDate) => {
    return new Promise(async (resolve, reject) => {
      try {
        const orders = await db.get()
          .collection(collections.ORDER_COLLECTION)
          .find({
            createdAt: {
              $gte: new Date(fromDate), // Greater than or equal to the fromDate
              $lte: new Date(toDate)    // Less than or equal to the toDate
            }
          })
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
              "orderObject.status": status,
            },
          }
        )
        .then(() => {
          resolve();
        });
    });
  },

  cancelOrder: (orderId) => {
    return new Promise((resolve, reject) => {
      db.get()
        .collection(collections.ORDER_COLLECTION)
        .removeOne({ _id: objectId(orderId) })
        .then(() => {
          resolve();
        });
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
};
