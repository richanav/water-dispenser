const express = require("express");
const cors = require("cors");
const admin = require("firebase-admin");
const fs = require("fs");

const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
} = require("@whiskeysockets/baileys");

const qrcode = require("qrcode-terminal");
const QRCode = require("qrcode");

/* FIREBASE SETUP */

const serviceAccount = JSON.parse(
  fs.readFileSync("./water-dispenser-key.json", "utf8")
);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

/* EXPRESS SERVER */

const app = express();

app.use(cors());
app.use(express.json());

let sock;

const VENDOR_NUMBER = "918105730925@s.whatsapp.net";

/* HELPERS */

async function getDeviceAndCustomer(deviceId) {
  const deviceRef = db.collection("devices").doc(deviceId);
  const deviceDoc = await deviceRef.get();

  if (!deviceDoc.exists) {
    throw new Error("Device not registered");
  }

  const deviceData = deviceDoc.data();
  const customerId = deviceData.customerId;

  if (!customerId) {
    throw new Error("customerId missing in device document");
  }

  const customerRef = db.collection("customers").doc(customerId);
  const customerDoc = await customerRef.get();

  if (!customerDoc.exists) {
    throw new Error("Customer not found");
  }

  const customerData = customerDoc.data();

  return {
    deviceRef,
    deviceData,
    customerId,
    customerData,
  };
}

function getCustomerJid(phone) {
  const customerPhone = String(phone);

  return customerPhone.startsWith("91")
    ? customerPhone + "@s.whatsapp.net"
    : "91" + customerPhone + "@s.whatsapp.net";
}

function generateInvoice(order, customerData) {
  return `
WATER HAS BEEN REFILLED
🧾 PAYMENT INVOICE

Invoice No:
INV-${order.orderId}

Order ID:
${order.orderId}

Customer:
${customerData.name}

Device:
${order.deviceId}

Amount:
₹${order.amount}

Status:
Delivered`;
}

function generateUPILink(order) {
  const upiId = "acd@oksbi";
  const payeeName = "Water Vendor";

  return (
    `upi://pay?pa=${upiId}` +
    `&pn=${encodeURIComponent(payeeName)}` +
    `&am=${order.amount}` +
    `&cu=INR` +
    `&tn=${encodeURIComponent(order.orderId)}`
  );
}

async function sendInvoiceToCustomer(order) {
  const customerDoc = await db
    .collection("customers")
    .doc(order.customerId)
    .get();

  if (!customerDoc.exists) {
    throw new Error("Customer not found for invoice");
  }

  const customerData = customerDoc.data();

  const invoice = generateInvoice(order, customerData);
  const upiLink = generateUPILink(order);
  const qrBuffer = await QRCode.toBuffer(upiLink);

  const customerJid = getCustomerJid(customerData.phone);

  await sock.sendMessage(customerJid, {
    text: invoice,
  });

  await sock.sendMessage(customerJid, {
    image: qrBuffer,
    caption: `💳 Please pay ₹${order.amount}`,
  });
}

/* WHATSAPP CONNECTION */

async function connectToWhatsApp() {
  const { state, saveCreds } = await useMultiFileAuthState("auth_info_baileys");

  const { version } = await fetchLatestBaileysVersion();

  console.log(`Using WA v${version.join(".")}`);

  sock = makeWASocket({
    version,
    auth: state,
    printQRInTerminal: false,
  });

  sock.ev.on("connection.update", async (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      console.log("\nScan QR Below:\n");

      qrcode.generate(qr, {
        small: true,
      });
    }

    if (connection === "open") {
      console.log("\n✅ WhatsApp Connected\n");
    } else if (connection === "close") {
      const statusCode = lastDisconnect?.error?.output?.statusCode;

      const shouldReconnect = statusCode !== DisconnectReason.loggedOut;

      console.log("\n❌ WhatsApp Disconnected\n");

      if (shouldReconnect) {
        console.log("Reconnecting...\n");
        connectToWhatsApp();
      }
    }
  });

  sock.ev.on("creds.update", saveCreds);
}

connectToWhatsApp();

/* TEST ROUTE */

app.get("/", (req, res) => {
  res.send("Server Running");
});

/* DELIVERY REQUEST ROUTE */

app.post("/request-delivery", async (req, res) => {
  try {
    const { deviceId } = req.body;

    if (!deviceId) {
      return res.status(400).json({
        success: false,
        message: "deviceId is required",
      });
    }

    const { customerId, customerData } = await getDeviceAndCustomer(deviceId);

    const orderId = "ORD-" + Date.now();

    const order = {
      orderId,
      customerId,
      deviceId,
      amount: 50,
      status: "PENDING",
      createdAt: new Date(),
    };

    await db.collection("orders").doc(orderId).set(order);

    await db.collection("notifications").add({
      customerId,
      deviceId,
      type: "delivery_request",
      title: "Delivery Request Sent",
      message: `${customerData.name} requested water delivery for ${deviceId}`,
      read: false,
      orderId,
      createdAt: new Date(),
    });

    const message = `🚚 DELIVERY REQUEST

Order ID:
${orderId}

Customer:
${customerData.name}

Phone:
${customerData.phone}

Device:
${deviceId}

Reply:

DONE ${orderId}`;

    await sock.sendMessage(VENDOR_NUMBER, {
      text: message,
    });

    res.json({
      success: true,
      orderId,
    });
  } catch (err) {
    console.error(err);

    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
});

/* MAIN ROUTE */

app.post("/update-water-level", async (req, res) => {
  console.log("\n🔥 API CALLED 🔥");

  try {
    const data = req.body;

    console.log("\nReceived Data:");
    console.log(data);

    const deviceId = data.device_id;
    const currentLevel = String(data.water_level).trim().toLowerCase();

    if (!deviceId) {
      return res.status(400).send("device_id is required");
    }

    const { deviceRef, deviceData, customerId, customerData } =
      await getDeviceAndCustomer(deviceId);

    const previousLevel = String(deviceData.water_level || "")
      .trim()
      .toLowerCase();

    console.log("Previous Level:", previousLevel);
    console.log("Current Level:", currentLevel);

    await deviceRef.set(
      {
        deviceId,
        customerId,
        water_level: currentLevel,
        status: "online",
        timestamp: new Date(),
      },
      { merge: true }
    );

    console.log("✅ Firebase Device Updated");

    if (currentLevel === "low") {
      await db.collection("alerts").add({
        customerId,
        deviceId,
        type: "low_water",
        water_level: currentLevel,
        createdAt: new Date(),
      });

      console.log("✅ Low water alert stored");

      await db.collection("notifications").add({
        customerId,
        deviceId,
        type: "low_water",
        title: "Low Water Alert Sent",
        message: `Low water alert sent for ${deviceId}`,
        read: false,
        createdAt: new Date(),
      });
    }

    console.log("previousLevel =", previousLevel);
    console.log("currentLevel =", currentLevel);

    if (previousLevel === "high" && currentLevel === "low") {
      console.log("🚨 HIGH -> LOW detected");

      const existingOrders = await db
        .collection("orders")
        .where("deviceId", "==", deviceId)
        .where("status", "==", "PENDING")
        .get();

      if (!existingOrders.empty) {
        console.log("Pending order already exists");

        return res.send("Pending order already exists");
      }

      const orderId = "ORD-" + Date.now();

      const order = {
        orderId,
        customerId,
        deviceId,
        amount: 100,
        status: "PENDING",
        createdAt: new Date(),
      };

      await db.collection("orders").doc(orderId).set(order);

      console.log("✅ Order Created");

      const vendorMessage = `🚚 NEW DELIVERY REQUEST

Order ID:
${orderId}

Customer:
${customerData.name}

Phone:
${customerData.phone}

Device:
${deviceId}`;

      await sock.sendMessage(VENDOR_NUMBER, {
        text: vendorMessage,
      });

      const customerJid = getCustomerJid(customerData.phone);

      await sock.sendMessage(customerJid, {
        text: "🚨 WATER LEVEL LOW, A DELIVERY REQUEST HAS BEEN SENT TO VENDOR.",
      });

      console.log("✅ Vendor and customer notified");

      await db.collection("notifications").add({
        customerId,
        deviceId,
        type: "auto_delivery",
        title: "Automatic Delivery Request Sent",
        message: `Low water detected. Delivery request sent for ${deviceId}`,
        read: false,
        orderId,
        createdAt: new Date(),
      });
    } else if (previousLevel === "low" && currentLevel === "high") {
      console.log("✅ LOW -> HIGH detected");

      const pendingOrders = await db
        .collection("orders")
        .where("deviceId", "==", deviceId)
        .where("status", "==", "PENDING")
        .limit(1)
        .get();

      if (pendingOrders.empty) {
        console.log("No pending orders found");
      } else {
        const orderDoc = pendingOrders.docs[0];
        const order = orderDoc.data();

        await orderDoc.ref.update({
          status: "DELIVERED",
          deliveredAt: new Date(),
        });

        console.log("✅ Order marked DELIVERED");

        await sendInvoiceToCustomer(order);

        console.log("✅ Invoice sent");

        await sock.sendMessage(VENDOR_NUMBER, {
          text: `✅ Order Completed

Order:
${order.orderId}

Invoice Sent To Customer`,
        });

        await db.collection("notifications").add({
          customerId: order.customerId,
          deviceId: order.deviceId,
          type: "delivered",
          title: "Order Delivered",
          message: `Order ${order.orderId} delivered and invoice sent`,
          read: false,
          orderId: order.orderId,
          createdAt: new Date(),
        });
      }
    } else {
      console.log("ℹ️ No state change. No alert sent.");
    }

    res.send("Data stored successfully");
  } catch (error) {
    console.error(error);

    res.status(500).send(error.message);
  }
});

/* START SERVER */

app.listen(3000, "0.0.0.0", () => {
  console.log("\n🚀 Server running on port 3000\n");
});