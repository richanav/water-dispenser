const functions = require("firebase-functions");

const admin = require("firebase-admin");

admin.initializeApp();

exports.updateWaterLevel =
functions.https.onRequest(

  async (req, res) => {

    try {

      const data = req.body;

      const deviceId = data.device_id;

      const waterLevel = data.water_level;

      const battery = data.battery;

      await admin
        .firestore()
        .collection("devices")
        .doc(deviceId)
        .set({

          water_level: waterLevel,

          battery: battery,

          status: "online",

          timestamp: Date.now()

        });

      res.send("Data stored successfully");

    } catch (error) {

      console.error(error);

      res.status(500).send(error);

    }
});