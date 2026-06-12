import admin from "firebase-admin"

if (!admin.apps.length) {
  const serviceAccount = JSON.parse(process.env.FIREBASE_KEY)

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  })
}

const db = admin.firestore()

export default async function handler(req, res) {
  if (req.method === "GET") {
    return res.status(200).send("AquaAlert API working")
  }

  if (req.method !== "POST") {
    return res.status(405).send("Method not allowed")
  }

  try {
    const data = req.body

    const deviceId = data.device_id
    const waterLevel = String(data.water_level).toLowerCase()
    const battery = data.battery || "0"

    if (!deviceId) {
      return res.status(400).send("device_id is required")
    }

    const deviceRef = db.collection("devices").doc(deviceId)
    const deviceDoc = await deviceRef.get()

    if (!deviceDoc.exists) {
      return res.status(404).send("Device not registered in Firebase")
    }

    const deviceData = deviceDoc.data()
    const customerId = deviceData.customerId

    if (!customerId) {
      return res.status(400).send("customerId missing in device document")
    }

    await deviceRef.set(
      {
        deviceId: deviceId,
        customerId: customerId,
        water_level: waterLevel,
        battery: battery,
        status: "online",
        timestamp: new Date(),
      },
      { merge: true }
    )

    if (waterLevel === "low") {
      await db.collection("alerts").add({
        deviceId: deviceId,
        customerId: customerId,
        type: "low_water",
        water_level: waterLevel,
        createdAt: new Date(),
      })

      await db.collection("notifications").add({
        customerId: customerId,
        deviceId: deviceId,
        title: "Low Water Alert",
        message: `Low water detected in ${deviceId}`,
        read: false,
        createdAt: new Date(),
      })
    }

    return res.status(200).send("Data stored successfully")
  } catch (error) {
    console.error(error)
    return res.status(500).send(error.message)
  }
}