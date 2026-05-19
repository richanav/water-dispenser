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

  return (

    <div>

      <h1>Water Dashboard</h1>

      {devices.map(device => (

        <div
          key={device.id}
          style={{
            border: "1px solid black",
            margin: "10px",
            padding: "10px"
          }}
        >

          <h2>{device.id}</h2>

          <p>
            Water Level:
            {device.water_level}%
          </p>

          <p>
            Battery:
            {device.battery}%
          </p>

          <p>
            Status:
            {device.status}
          </p>

        </div>

      ))}

    </div>
  );
}

export default App;