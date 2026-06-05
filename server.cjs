const express = require("express");

const cors = require("cors");

const admin = require("firebase-admin");

const fs = require("fs");

const {
    default: makeWASocket,
    useMultiFileAuthState,
    DisconnectReason,
    fetchLatestBaileysVersion
} = require("@whiskeysockets/baileys");

const qrcode = require("qrcode-terminal");
const QRCode = require("qrcode");
/* FIREBASE SETUP */

const serviceAccount = JSON.parse(
    fs.readFileSync(
        "./water-dispenser-key.json",
        "utf8"
    )
);

admin.initializeApp({
    credential:
        admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

/* EXPRESS SERVER */

const app = express();

app.use(cors());

app.use(express.json());

let sock;


const VENDOR_NUMBER =
    "918105730925@s.whatsapp.net";

function generateInvoice(order) {

    return `
WATER HAS BEEN REFILLED
🧾 PAYMENT INVOICE

Invoice No:
INV-${order.orderId}

Order ID:
${order.orderId}

Customer:
${order.customerName}

Device:
${order.deviceId}

Amount:
₹${order.amount}

Status:
Delivered`
}

function generateUPILink(order) {

    const upiId = "acd@oksbi";

    const payeeName =
        "Water Vendor";

    return (
        `upi://pay?pa=${upiId}` +
        `&pn=${encodeURIComponent(payeeName)}` +
        `&am=${order.amount}` +
        `&cu=INR` +
        `&tn=${encodeURIComponent(order.orderId)}`
    );
}

async function sendInvoiceToCustomer(
    order
) {

    const invoice =
        generateInvoice(order);

    const upiLink =
        generateUPILink(order);

    const qrBuffer =
        await QRCode.toBuffer(
            upiLink
        );

    const customerPhone =
    String(order.customerPhone);

const customerJid =
    customerPhone.startsWith("91")
        ? customerPhone +
          "@s.whatsapp.net"
        : "91" +
          customerPhone +
          "@s.whatsapp.net";

    await sock.sendMessage(
    customerJid,
    {
        text: invoice
    }
    );

    await sock.sendMessage(
        customerJid,
        { 
            image: qrBuffer,

            caption:
`💳 Please pay ₹${order.amount}`
        }
    );
}
/* WHATSAPP CONNECTION */

async function connectToWhatsApp() {

    const { state, saveCreds } =
        await useMultiFileAuthState(
            "auth_info_baileys"
        );

    const { version } =
        await fetchLatestBaileysVersion();

    console.log(
        `Using WA v${version.join(".")}`
    );

    sock = makeWASocket({
        version,
        auth: state,
        printQRInTerminal: false
    });
   
    sock.ev.on(
        "connection.update",

        async (update) => {

            const {
                connection,
                lastDisconnect,
                qr
            } = update;

            /* SHOW QR */

            if (qr) {

                console.log(
                    "\nScan QR Below:\n"
                );

                qrcode.generate(qr, {
                    small: true
                });
            }

            /* CONNECTED */

            if (connection === "open") {

                console.log(
                    "\n✅ WhatsApp Connected\n"
                );
                

            } 
            /* DISCONNECTED */

            else if (
                connection === "close"
            ) {

                const statusCode =
                    lastDisconnect?.error
                        ?.output?.statusCode;

                const shouldReconnect =
                    statusCode !==
                    DisconnectReason.loggedOut;

                console.log(
                    "\n❌ WhatsApp Disconnected\n"
                );

                if (shouldReconnect) {

                    console.log(
                        "Reconnecting...\n"
                    );

                    connectToWhatsApp();
                }
            }
        }
    );

    sock.ev.on(
        "creds.update",
        saveCreds
    );
}

/* START WHATSAPP */

connectToWhatsApp();

/* TEST ROUTE */

app.get("/", (req, res) => {

    res.send(
        "Server Running"
    );
});
/* DELIVERY REQUEST ROUTE */

app.post(
    "/request-delivery",

    async (req, res) => {

        try {

            const {
                customerName,
                customerPhone,
                deviceId
            } = req.body;

            const orderId =
                "ORD-" +
                Date.now();

            await db
                .collection(
                    "orders"
                )
                .doc(orderId)
                .set({

                    orderId,

                    customerName,

                    customerPhone,

                    deviceId,

                    amount: 50,

                    status:
                        "PENDING",

                    createdAt:
                        Date.now()
                });

            const message =
`🚚 DELIVERY REQUEST

Order ID:
${orderId}

Customer:
${customerName}

Phone:
${customerPhone}

Device:
${deviceId}

Reply:

DONE ${orderId}`;

            await sock.sendMessage(
                VENDOR_NUMBER,
                {
                    text:
                        message
                }
            );

            res.json({

                success: true,

                orderId
            });

        } catch (err) {

            console.error(
                err
            );

            res.status(500)
                .json({

                success: false
            });
        }
    }
);


/* MAIN ROUTE */

app.post(
    "/update-water-level",

    async (req, res) => {

        console.log(
            "\n🔥 API CALLED 🔥"
        );

        try {

            const data = req.body;

            console.log("\nReceived Data:");
            console.log(data);

            const deviceRef = db
                .collection("devices")
                .doc(data.device_id);

            /* GET PREVIOUS DATA */

            const oldDoc =
                await deviceRef.get();

            const previousLevel =
                oldDoc.exists
                    ? String(
                        oldDoc.data()
                            .water_level || ""
                      )
                          .trim()
                          .toLowerCase()
                    : "";

            /* CURRENT LEVEL */

            const currentLevel =
                String(data.water_level)
                    .trim()
                    .toLowerCase();

            console.log(
                "Previous Level:",
                previousLevel
            );

            console.log(
                "Current Level:",
                currentLevel
            );

            /* STORE LATEST DATA */

            await deviceRef.set({

                water_level:
                    currentLevel,

                battery:
                    data.battery,

                status:
                    "online",

                timestamp:
                    Date.now()

            }, { merge: true });

            console.log(
                "✅ Firebase Updated"
            );


             /* STORE LOW WATER ALERT */

            if (currentLevel === "low") {

            await db
            .collection("low_water_alerts")
            .add({

            device_id:
                data.device_id,

            water_level:
                currentLevel,

            createdAt:
                new Date()

            });

            console.log(
              "✅ Low water alert stored"
            );
            }

            /* ==========================
               STATE CHANGE DETECTION
               ==========================

               HIGH -> LOW
               Send Payment QR

               LOW -> LOW
               Do Nothing

               LOW -> HIGH
               Send Refilled Message

               HIGH -> HIGH
               Do Nothing
            */
           console.log("previousLevel =", previousLevel);
           console.log("currentLevel =", currentLevel);
           if (
    previousLevel === "high" &&
    currentLevel === "low"
) {

    console.log(
        "🚨 HIGH -> LOW detected"
    );
    const existingOrders =
    await db
        .collection("orders")
        .where(
            "deviceId",
            "==",
            data.device_id
        )
        .where(
            "status",
            "==",
            "PENDING"
        )
        .get();

if (!existingOrders.empty) {

    console.log(
        "Pending order already exists"
    );

    return;
}
    try {

        const latestDeviceDoc =
            await deviceRef.get();

        const deviceData =
            latestDeviceDoc.data();
            console.log("Device Data:", deviceData);
        if (
            !deviceData.customerPhone
        ) {

            console.log(
                "❌ No customer phone found"
            );

            return;
        }
        console.log("Creating order...");
        const orderId =
            "ORD-" + Date.now();

        const order = {

            orderId,

            deviceId:
                data.device_id,

            customerName:
                deviceData.customerName,

            customerPhone:
                deviceData.customerPhone,
                

            amount: 100,

            status:
                "PENDING",

            createdAt:
                Date.now()
        };

        await db
            .collection("orders")
            .doc(orderId)
            .set(order);

        console.log(
            "✅ Order Created"
        );
        
        const vendorMessage =
`🚚 NEW DELIVERY REQUEST

Order ID:
${orderId}

Customer:
${order.customerName}

Phone:
${order.customerPhone}

Device:
${order.deviceId}`;

        await sock.sendMessage(
            VENDOR_NUMBER,
            {
                text:
                    vendorMessage
            }
        );
        const customerPhone = String(deviceData.customerPhone);

        const customerJid =
        customerPhone.startsWith("91")
        ? customerPhone + "@s.whatsapp.net"
        : "91" + customerPhone + "@s.whatsapp.net";
        await sock.sendMessage(
            customerJid,
            {
                text: `🚨 WATER LEVEL LOW,A DELIVERY REQUEST HAS BEEN SENT TO VENDOR.`
            }
        );
        console.log(
            "✅ Vendor notified"
        );

    } catch (err) {

        console.log(err);
    }
}
            

            else if (
    previousLevel === "low" &&
    currentLevel === "high"
)
{
    console.log(
        "✅ LOW -> HIGH detected"
    );

    try {

        const pendingOrders =
            await db
                .collection("orders")
                .where(
                    "deviceId",
                    "==",
                    data.device_id
                )
                .where(
                    "status",
                    "==",
                    "PENDING"
                )
                .limit(1)
                .get();

        if (
            pendingOrders.empty
        ) {

            console.log(
                "No pending orders found"
            );

        } else {

            const orderDoc =
                pendingOrders.docs[0];

            const order =
                orderDoc.data();

            await orderDoc.ref.update({

                status:
                    "DELIVERED",

                deliveredAt:
                    Date.now()
            });

            console.log(
                "✅ Order marked DELIVERED"
            );

            await sendInvoiceToCustomer(
                order
            );

            console.log(
                "✅ Invoice sent"
            );

            await sock.sendMessage(
                VENDOR_NUMBER,
                {
                    text:
`✅ Order Completed

Order:
${order.orderId}

Invoice Sent To Customer`
                }
            );
        }

    } catch (err) {

        console.log(err);
    }
}
            

            else {

                console.log(
                    "ℹ️ No state change. No alert sent."
                );
            }

            res.send(
                "Data stored successfully"
            );
        }catch (error) {

            console.error(error);

            res.status(500).send(error);
        } 
    }
);

/* START SERVER */

app.listen(3000, "0.0.0.0", () => {

    console.log(
        "\n🚀 Server running on port 3000\n"
    );
});