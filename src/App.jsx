import { useEffect, useState } from "react";

import {
  collection,
  onSnapshot
} from "firebase/firestore";

import { db } from "./firebase";

function App() {

  const [devices, setDevices] = useState([]);

  useEffect(() => {

    const unsubscribe = onSnapshot(

      collection(db, "devices"),

      (snapshot) => {

        const data = snapshot.docs.map(doc => ({

          id: doc.id,

          ...doc.data()

        }));

        setDevices(data);

      }

    );

    return () => unsubscribe();

  }, []);

  const getWaterColor = (level) => {

    const value =
      String(level)
        .toLowerCase()
        .trim();

    if (value.includes("low")) {
      return "#ef4444";
    }

    return "#22c55e";
  };

  return (

    <div
      style={{

        minHeight: "100vh",

        backgroundColor: "#0f172a",

        padding: "30px",

        fontFamily: "Arial",

        color: "white"

      }}
    >

      <h1
        style={{

          fontSize: "42px",

          marginBottom: "30px"

        }}
      >

        Smart Water Dashboard

      </h1>

      <div
        style={{

          display: "grid",

          gridTemplateColumns:
            "repeat(auto-fit, minmax(320px, 1fr))",

          gap: "20px"

        }}
      >

        {devices.map(device => (

          <div
            key={device.id}
            style={{

              backgroundColor: "#1e293b",

              borderRadius: "20px",

              padding: "25px",

              boxShadow:
                "0 10px 25px rgba(0,0,0,0.3)"

            }}
          >

            <div
              style={{

                display: "flex",

                justifyContent: "space-between",

                alignItems: "center",

                marginBottom: "20px"

              }}
            >

              <div>

                <h2
                  style={{
                    margin: 0
                  }}
                >

                  {device.id}

                </h2>

                <p
                  style={{
                    color: "#94a3b8"
                  }}
                >

                  Water Dispenser

                </p>

              </div>

              <div
                style={{

                  width: "14px",

                  height: "14px",

                  borderRadius: "50%",

                  backgroundColor:
                    device.status === "online"
                      ? "#22c55e"
                      : "#ef4444"

                }}
              />

            </div>

            {/* WATER LEVEL */}

            <div
              style={{
                marginBottom: "20px"
              }}
            >

              <div
                style={{

                  display: "flex",

                  justifyContent: "space-between",

                  marginBottom: "8px"

                }}
              >

                <span>Water Level</span>

                <span
                  style={{

                    color:
                      getWaterColor(
                        device.water_level
                      ),

                    fontWeight: "bold"

                  }}
                >

                  {String(device.water_level)
                    .toUpperCase()}

                </span>

              </div>

              <div
                style={{

                  width: "100%",

                  height: "18px",

                  backgroundColor: "#334155",

                  borderRadius: "999px",

                  overflow: "hidden"

                }}
              >

                <div
                  style={{

                    width:
                      String(device.water_level)
                        .toLowerCase()
                        .includes("low")
                          ? "20%"
                          : "100%",

                    height: "100%",

                    backgroundColor:
                      getWaterColor(
                        device.water_level
                      )

                  }}
                />

              </div>

            </div>

            {/* BATTERY */}

            <div
              style={{
                marginBottom: "20px"
              }}
            >

              <div
                style={{

                  display: "flex",

                  justifyContent: "space-between",

                  marginBottom: "8px"

                }}
              >

                <span>Battery</span>

                <span>
                  {device.battery}%
                </span>

              </div>

              <div
                style={{

                  width: "100%",

                  height: "12px",

                  backgroundColor: "#334155",

                  borderRadius: "999px",

                  overflow: "hidden"

                }}
              >

                <div
                  style={{

                    width:
                      `${device.battery}%`,

                    height: "100%",

                    backgroundColor: "#3b82f6"

                  }}
                />

              </div>

            </div>

            {/* STATUS */}

            <div
              style={{

                borderTop:
                  "1px solid #334155",

                paddingTop: "15px"

              }}
            >

              <p>

                Status:

                <span
                  style={{

                    marginLeft: "10px",

                    color:
                      device.status === "online"
                        ? "#22c55e"
                        : "#ef4444"

                  }}
                >

                  {device.status}

                </span>

              </p>

            </div>

          </div>

        ))}

      </div>

    </div>

  );

}

export default App;