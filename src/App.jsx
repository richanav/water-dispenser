import { FiBell, FiSearch, FiUser } from "react-icons/fi"

import { useEffect, useState } from "react"
import {
  collection,
  onSnapshot,
  query,
  where,
  getDocs,
  doc,
  setDoc,
  serverTimestamp,
} from "firebase/firestore"
import { db } from "./firebase"

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
  Legend,
} from "chart.js"

import { Bar } from "react-chartjs-2"

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend)

function App() {
  const [alertCounts, setAlertCounts] = useState([0, 0, 0, 0])
  const [tanks, setTanks] = useState([])
  const [alerts, setAlerts] = useState([])
  const [searchText, setSearchText] = useState("")
  const [notFound, setNotFound] = useState(false)
  const [activePage, setActivePage] = useState("dashboard")
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth())

  const [notifications, setNotifications] = useState([])
  const [showNotifications, setShowNotifications] = useState(false)

  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [phone, setPhone] = useState("")
  const [customerId, setCustomerId] = useState("")
  const [customerName, setCustomerName] = useState("")
  const [loginError, setLoginError] = useState("")

  const [showRegister, setShowRegister] = useState(false)
  const [registerName, setRegisterName] = useState("")
  const [registerPhone, setRegisterPhone] = useState("")
  const [deviceCount, setDeviceCount] = useState(1)

  const totalAlerts = alertCounts.reduce((sum, count) => sum + count, 0)
  const averageAlerts = (totalAlerts / 4).toFixed(1)

  const pageTitles = {
    dashboard: "Dashboard",
    tank: "My Tank",
    alerts: "Alerts",
    graph: "Graph",
    profile: "Profile",
  }

  const handleSearch = (e) => {
    if (e.key === "Enter") {
      const value = searchText.toLowerCase().trim()

      if (value.includes("dashboard")) {
        setActivePage("dashboard")
        setNotFound(false)
      } else if (value.includes("tank")) {
        setActivePage("tank")
        setNotFound(false)
      } else if (value.includes("alert")) {
        setActivePage("alerts")
        setNotFound(false)
      } else if (value.includes("graph")) {
        setActivePage("graph")
        setNotFound(false)
      } else if (value.includes("profile")) {
        setActivePage("profile")
        setNotFound(false)
      } else {
        setNotFound(true)
      }
    }
  }

  const loginCustomer = async () => {
    setLoginError("")

    const enteredPhone = phone.trim()

    const q = query(
      collection(db, "customers"),
      where("phone", "==", enteredPhone)
    )

    const snapshot = await getDocs(q)

    if (snapshot.empty) {
      setLoginError("Customer not found")
      return
    }

    const customer = snapshot.docs[0].data()

    setCustomerId(customer.customerId)
    setCustomerName(customer.name)
    setIsLoggedIn(true)
  }

  const registerCustomer = async () => {
    const name = registerName.trim()
    const phoneNumber = registerPhone.trim()
    const count = Number(deviceCount)

    if (!name || !phoneNumber || count <= 0) {
      alert("Please enter name, phone number, and valid device count")
      return
    }

    const customerId = "customer_" + Date.now()

    await setDoc(doc(db, "customers", customerId), {
      customerId: customerId,
      name: name,
      phone: phoneNumber,
    })

    const createdDevices = []

    for (let i = 1; i <= count; i++) {
      const deviceId = `water_device_${Date.now()}_${i}`

      await setDoc(doc(db, "devices", deviceId), {
        deviceId: deviceId,
        customerId: customerId,
        status: "offline",
        water_level: "high",
        timestamp: serverTimestamp(),
      })

      createdDevices.push(deviceId)
    }

    alert(
      `Registration successful!\n\nCustomer ID: ${customerId}\n\nDevice IDs:\n${createdDevices.join(
        "\n"
      )}\n\nUse this phone number to login.`
    )

    setShowRegister(false)
    setPhone(phoneNumber)
    setRegisterName("")
    setRegisterPhone("")
    setDeviceCount(1)
  }

  useEffect(() => {
  if (!customerId) return

  const unsubscribe = onSnapshot(collection(db, "alerts"), (snapshot) => {
    const weekCounts = [0, 0, 0, 0]

    snapshot.docs.forEach((doc) => {
      const data = doc.data()

      if (String(data.customerId).trim() !== String(customerId).trim()) return

      const date = data.createdAt?.toDate?.()

      if (date && date.getMonth() === selectedMonth) {
        const day = date.getDate()
        const week = Math.min(Math.ceil(day / 7), 4)
        weekCounts[week - 1]++
      }
    })

    setAlertCounts(weekCounts)
  })

  return () => unsubscribe()
}, [customerId, selectedMonth])

  useEffect(() => {
    if (!customerId) return

    const devicesQuery = query(
      collection(db, "devices"),
      where("customerId", "==", customerId)
    )

    const unsubscribe = onSnapshot(devicesQuery, (snapshot) => {
      const tankList = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }))

      setTanks(tankList)
    })

    return () => unsubscribe()
  }, [customerId])

  useEffect(() => {
  if (!customerId) return

  const unsubscribe = onSnapshot(collection(db, "alerts"), (snapshot) => {
    const alertList = snapshot.docs
      .map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }))
      .filter((alert) => {
        return String(alert.customerId).trim() === String(customerId).trim()
      })

    alertList.sort((a, b) => {
      const timeA = a.createdAt?.toDate?.()?.getTime() || 0
      const timeB = b.createdAt?.toDate?.()?.getTime() || 0
      return timeB - timeA
    })

    setAlerts(alertList)
  })

  return () => unsubscribe()
}, [customerId])

  useEffect(() => {
    if (!customerId) return

    const notificationsQuery = query(
      collection(db, "notifications"),
      where("customerId", "==", customerId)
    )

    const unsubscribe = onSnapshot(notificationsQuery, (snapshot) => {
      const list = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }))

      list.sort((a, b) => {
        const timeA = a.createdAt?.toDate?.()?.getTime() || 0
        const timeB = b.createdAt?.toDate?.()?.getTime() || 0
        return timeB - timeA
      })

      setNotifications(list)
    })

    return () => unsubscribe()
  }, [customerId])

  const lowWaterAlertData = {
    labels: ["Week 1", "Week 2", "Week 3", "Week 4"],
    datasets: [
      {
        label: "Low Water Alerts",
        data: alertCounts,
        backgroundColor: "#ef4444",
        borderRadius: 8,
      },
    ],
  }

  const requestDelivery = async () => {
    const firstDeviceId = tanks[0]?.deviceId || tanks[0]?.id

    if (!firstDeviceId) {
      alert("No device found for this customer")
      return
    }

    await fetch("http://192.168.1.39:3000/request-delivery", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        deviceId: firstDeviceId,
      }),
    })
  }

  if (showRegister) {
    return (
      <div className="min-h-screen bg-[#0b1120] text-white flex items-center justify-center">
        <div className="bg-[#1e293b] p-8 rounded-2xl w-[380px]">
          <h1 className="text-3xl font-bold text-blue-400 mb-6">
            Register Customer
          </h1>

          <input
            type="text"
            placeholder="Enter name"
            value={registerName}
            onChange={(e) => setRegisterName(e.target.value)}
            className="w-full px-4 py-3 rounded-xl bg-[#0f172a] outline-none mb-4"
          />

          <input
            type="text"
            placeholder="Enter phone number"
            value={registerPhone}
            onChange={(e) => setRegisterPhone(e.target.value)}
            className="w-full px-4 py-3 rounded-xl bg-[#0f172a] outline-none mb-4"
          />

          <input
            type="number"
            placeholder="Number of devices"
            value={deviceCount}
            min="1"
            onChange={(e) => setDeviceCount(e.target.value)}
            className="w-full px-4 py-3 rounded-xl bg-[#0f172a] outline-none mb-4"
          />

          <button
            onClick={registerCustomer}
            className="w-full bg-blue-600 hover:bg-blue-500 py-3 rounded-xl"
          >
            Register
          </button>

          <p className="text-gray-400 text-sm mt-4 text-center">
            Already registered?{" "}
            <span
              onClick={() => setShowRegister(false)}
              className="text-blue-400 cursor-pointer"
            >
              Login
            </span>
          </p>
        </div>
      </div>
    )
  }

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-[#0b1120] text-white flex items-center justify-center">
        <div className="bg-[#1e293b] p-8 rounded-2xl w-[350px]">
          <h1 className="text-3xl font-bold text-blue-400 mb-6">
            AquaAlert Login
          </h1>

          <input
            type="text"
            placeholder="Enter phone number"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="w-full px-4 py-3 rounded-xl bg-[#0f172a] outline-none mb-4"
          />

          {loginError && (
            <p className="text-red-400 text-sm mb-3">{loginError}</p>
          )}

          <button
            onClick={loginCustomer}
            className="w-full bg-blue-600 hover:bg-blue-500 py-3 rounded-xl"
          >
            Login
          </button>

          <p className="text-gray-400 text-sm mt-4 text-center">
            New user?{" "}
            <span
              onClick={() => setShowRegister(true)}
              className="text-blue-400 cursor-pointer"
            >
              Register now
            </span>
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0b1120] text-white">
      <div className="flex">
        <div className="w-[250px] min-h-screen bg-[#0f172a] border-r border-gray-800 p-6">
          <h1 className="text-3xl font-bold text-blue-400 mb-10">
            AquaAlert
          </h1>

          <div className="space-y-4">
            <MenuItem text="Dashboard" active={activePage === "dashboard"} onClick={() => setActivePage("dashboard")} />
            <MenuItem text="My Tank" active={activePage === "tank"} onClick={() => setActivePage("tank")} />
            <MenuItem text="Alerts" active={activePage === "alerts"} onClick={() => setActivePage("alerts")} />
            <MenuItem text="Graph" active={activePage === "graph"} onClick={() => setActivePage("graph")} />
            <MenuItem text="Profile" active={activePage === "profile"} onClick={() => setActivePage("profile")} />
          </div>
        </div>

        <div className="flex-1 p-6">
          <TopNavbar
            title={pageTitles[activePage]}
            searchText={searchText}
            setSearchText={setSearchText}
            handleSearch={handleSearch}
            notifications={notifications}
            showNotifications={showNotifications}
            setShowNotifications={setShowNotifications}
            setActivePage={setActivePage}
            customerName={customerName}
          />

          {notFound && (
            <div className="card mb-6 border border-red-800 bg-red-950/30">
              <h2 className="text-2xl font-bold text-red-400">
                Page Not Found
              </h2>
              <p className="text-gray-400 mt-2">
                No matching page found for "{searchText}".
              </p>
            </div>
          )}

          {activePage === "dashboard" && (
            <>
              <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 mb-6">
                <StatCard title="Tanks Monitored" value={tanks.length} sub="Active" badge="Online" />
                <StatCard title="Low Water Alerts" value={totalAlerts} sub="This Month" badge="Normal" />
                <StatCard title="Average Low Alerts" value={averageAlerts} sub="Per Week" badge="Avg" />
              </section>

              <section className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                <div className="xl:col-span-2 space-y-6">
                  <div className="card">
                    <div className="flex justify-between mb-4">
                      <h3 className="font-bold text-2xl">My Tank</h3>

                      <button
                        onClick={() => setActivePage("tank")}
                        className="text-blue-400 text-sm"
                      >
                        View Details
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                      {tanks.map((tank) => {
                        const status = String(tank.water_level).toLowerCase()
                        const isLow = status === "low"

                        return (
                          <TankCard
                            key={tank.id}
                            name={tank.deviceId || tank.id}
                            danger={isLow}
                          />
                        )
                      })}
                    </div>
                  </div>

                  <MonthlyGraph
                    selectedMonth={selectedMonth}
                    setSelectedMonth={setSelectedMonth}
                    lowWaterAlertData={lowWaterAlertData}
                  />
                </div>

                <div className="space-y-6">
                  <div className="card">
                    <h3 className="font-bold text-2xl mb-4">
                      Recent Activity
                    </h3>

                    <Activity priority="normal" text="Tank monitoring active" time="10:30 AM" />
                    <Activity priority="normal" text="Water level normal" time="10:35 AM" />
                    <Activity priority="warning" text="Low water detected" time="11:10 AM" />
                  </div>

                  <div className="bg-gradient-to-br from-blue-700 via-indigo-800 to-slate-900 rounded-2xl p-5 border border-blue-900 shadow-xl hover:-translate-y-1 transition">
                    <h3 className="font-bold text-2xl">Need Delivery?</h3>

                    <p className="text-sm text-gray-300 mt-2">
                      Request water can delivery instantly.
                    </p>

                    <button
                      className="mt-4 bg-blue-500 hover:bg-blue-400 px-4 py-2 rounded-xl text-sm transition"
                      onClick={requestDelivery}
                    >
                      Request Delivery
                    </button>
                  </div>
                </div>
              </section>
            </>
          )}

          {activePage === "tank" && (
            <div>
              <h1 className="text-4xl font-bold mb-6">My Tank Details</h1>

              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {tanks.map((tank) => {
                  const status = String(tank.water_level).toLowerCase()
                  const isLow = status === "low"

                  return (
                    <TankCard
                      key={tank.id}
                      name={tank.deviceId || tank.id}
                      danger={isLow}
                    />
                  )
                })}
              </div>
            </div>
          )}

          {activePage === "graph" && (
            <div>
              <MonthlyGraph
                selectedMonth={selectedMonth}
                setSelectedMonth={setSelectedMonth}
                lowWaterAlertData={lowWaterAlertData}
              />
            </div>
          )}

          {activePage === "alerts" && <AlertsPage alerts={alerts} />}
          {activePage === "profile" && (
  <ProfilePage
    customerName={customerName}
    phone={phone}
    tanks={tanks}
  />
)}
        </div>
      </div>
    </div>
  )
}

function TopNavbar({
  title,
  searchText,
  setSearchText,
  handleSearch,
  notifications,
  showNotifications,
  setShowNotifications,
  setActivePage,
  customerName,
}) {
  return (
    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
      <div>
        <h2 className="text-5xl font-bold">{title}</h2>
        <p className="text-gray-400 text-lg">Welcome back 👋</p>
      </div>

      <div className="flex items-center gap-4">
        <div className="hidden sm:flex items-center bg-[#1e293b] px-4 py-2 rounded-xl border border-gray-800">
          <FiSearch className="text-gray-400 mr-2" />

          <input
            className="bg-transparent outline-none text-sm text-white placeholder-gray-500"
            placeholder="Search..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            onKeyDown={handleSearch}
          />
        </div>

        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative bg-[#1e293b] p-3 rounded-xl border border-gray-800"
          >
            <FiBell />

            {notifications.length > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs w-5 h-5 flex items-center justify-center rounded-full">
                {notifications.length}
              </span>
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-3 w-80 bg-[#111827] border border-gray-700 rounded-2xl shadow-2xl z-50">
              <div className="p-4 border-b border-gray-700">
                <h3 className="font-bold">Notifications</h3>
              </div>

              <div className="max-h-80 overflow-y-auto">
                {notifications.length === 0 ? (
                  <p className="p-4 text-gray-500">
                    No notifications
                  </p>
                ) : (
                  notifications.map((notification) => (
                    <div
                      key={notification.id}
                      className="p-4 border-b border-gray-800 hover:bg-[#1e293b] cursor-pointer"
                      onClick={() => {
                        setActivePage("alerts")
                        setShowNotifications(false)
                      }}
                    >
                      <p className="font-semibold">
                        {notification.title}
                      </p>

                      <p className="text-sm text-gray-400">
                        {notification.message}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 bg-[#1e293b] px-3 py-2 rounded-xl border border-gray-800">
          <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center">
            <FiUser />
          </div>

          <span className="text-sm">{customerName}</span>
        </div>
      </div>
    </div>
  )
}



function MenuItem({ text, active, onClick }) {
  return (
    <div
      onClick={onClick}
      className={`px-4 py-3 rounded-xl cursor-pointer transition ${
        active
          ? "bg-blue-600 text-white"
          : "text-gray-400 hover:bg-[#1e293b] hover:text-white"
      }`}
    >
      {text}
    </div>
  )
}

function StatCard({ title, value, sub, danger, badge, gradient }) {
  return (
    <div
      className={`rounded-2xl p-5 border border-gray-800 shadow-xl hover:-translate-y-1 transition ${
        gradient ? "bg-gradient-to-br from-blue-700 to-purple-900" : "bg-[#1e293b]"
      }`}
    >
      <div className="flex justify-between items-start">
        <p className="text-sm text-gray-400">{title}</p>

        <span
          className={`text-xs px-2 py-1 rounded-full ${
            danger ? "bg-red-900 text-red-300" : "bg-green-900 text-green-300"
          }`}
        >
          {badge}
        </span>
      </div>

      <h3 className={`text-4xl font-bold mt-3 ${danger ? "text-red-400" : "text-white"}`}>
        {value}
      </h3>

      <p className="text-xs text-gray-500 mt-1">{sub}</p>
    </div>
  )
}

function TankCard({ name, danger }) {
  return (
    <div
      className={`w-full max-w-md rounded-2xl p-4 border hover:-translate-y-1 transition ${
        danger ? "bg-[#2a1a1a] border-red-800" : "bg-[#111827] border-gray-800"
      }`}
    >
      <div className="flex justify-between items-center">
        <h4 className="font-semibold text-xl">{name}</h4>
      </div>

      <div className="mt-5 h-52 flex items-end justify-center">
        <div className="w-32 h-44 border-2 border-blue-400 rounded-b-2xl rounded-t-lg relative overflow-hidden bg-[#0f172a]">
          <div
            className={`absolute bottom-0 w-full transition-all duration-500 ${
              danger ? "bg-red-500 h-[25%]" : "bg-blue-500 h-[75%]"
            }`}
          ></div>
        </div>
      </div>

      <p className={`text-center font-bold text-3xl mt-4 ${danger ? "text-red-400" : "text-green-400"}`}>
        {danger ? "LOW WATER" : "SUFFICIENT"}
      </p>
    </div>
  )
}

function MonthlyGraph({ selectedMonth, setSelectedMonth, lowWaterAlertData }) {
  return (
    <div className="card">
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-bold text-2xl">Monthly Low Water Alerts</h3>

        <select
          value={selectedMonth}
          onChange={(e) => setSelectedMonth(Number(e.target.value))}
          className="bg-[#1e293b] border border-gray-700 rounded-lg px-3 py-2 text-sm"
        >
          <option value={0}>January</option>
          <option value={1}>February</option>
          <option value={2}>March</option>
          <option value={3}>April</option>
          <option value={4}>May</option>
          <option value={5}>June</option>
          <option value={6}>July</option>
          <option value={7}>August</option>
          <option value={8}>September</option>
          <option value={9}>October</option>
          <option value={10}>November</option>
          <option value={11}>December</option>
        </select>
      </div>

      <Bar data={lowWaterAlertData} options={chartOptions} />
    </div>
  )
}

function Activity({ text, time, priority }) {
  const color =
    priority === "critical"
      ? "bg-red-500"
      : priority === "warning"
      ? "bg-orange-400"
      : "bg-green-500"

  return (
    <div className="flex justify-between items-center border-b border-gray-700 py-4 text-sm">
      <div className="flex items-center gap-2">
        <span className={`w-2 h-2 rounded-full ${color}`}></span>
        <p className="text-gray-300">{text}</p>
      </div>

      <p className="text-gray-500">{time}</p>
    </div>
  )
}

function AlertsPage({ alerts }) {
  return (
    <div className="card">
      <h1 className="text-3xl font-bold">Alerts</h1>

      <p className="text-gray-400 mt-2 mb-6">
        Recent low water alerts from your monitored devices.
      </p>

      <div className="space-y-4">
        {alerts.length === 0 ? (
          <p className="text-gray-500">No alerts found.</p>
        ) : (
          alerts.map((alert) => {
            const dateObj = alert.createdAt?.toDate?.()
            const date = dateObj ? dateObj.toLocaleDateString() : "No date"
            const time = dateObj ? dateObj.toLocaleTimeString() : "No time"

            return (
              <div
                key={alert.id}
                className="bg-[#111827] border border-red-900/60 rounded-2xl p-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4"
              >
                <div>
                  <div className="flex items-center gap-3">
                    <span className="w-3 h-3 rounded-full bg-red-500"></span>

                    <h3 className="text-xl font-bold text-red-400">
                      Low Water Alert
                    </h3>
                  </div>

                  <p className="text-gray-400 mt-2">
                    Device:{" "}
                    <span className="text-white font-semibold">
                      {alert.deviceId}
                    </span>
                  </p>

                  <p className="text-gray-500 text-sm mt-1">
                    Water level: {alert.water_level}
                  </p>
                </div>

                <div className="text-right">
                  <p className="text-white font-semibold">{date}</p>
                  <p className="text-gray-400 text-sm">{time}</p>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}

function ProfilePage({ customerName, phone, tanks }) {
  return (
    <div className="card">
      <h1 className="text-3xl font-bold mb-6">User Profile</h1>

      <div className="space-y-3 mb-8">
        <p className="text-gray-400">
          Name: <span className="text-white font-semibold">{customerName}</span>
        </p>

        <p className="text-gray-400">
          Phone: <span className="text-white font-semibold">{phone}</span>
        </p>

        <p className="text-gray-400">
          Total Devices:{" "}
          <span className="text-white font-semibold">{tanks.length}</span>
        </p>
      </div>

      <h2 className="text-2xl font-bold mb-4">Devices</h2>

      <div className="space-y-3">
        {tanks.length === 0 ? (
          <p className="text-gray-500">No devices found.</p>
        ) : (
          tanks.map((tank) => (
            <div
              key={tank.id}
              className="bg-[#111827] border border-gray-800 rounded-xl p-4"
            >
              <p className="font-semibold">
                {tank.deviceId || tank.id}
              </p>

              <p className="text-sm text-gray-400">
                Water Level: {tank.water_level}
              </p>

              <p className="text-sm text-gray-400">
                Status: {tank.status}
              </p>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

const chartOptions = {
  responsive: true,

  plugins: {
    legend: {
      labels: {
        color: "#cbd5e1",
      },
    },
  },

  scales: {
    x: {
      ticks: {
        color: "#94a3b8",
      },

      grid: {
        color: "#1f2937",
      },
    },

    y: {
      ticks: {
        color: "#94a3b8",
      },

      grid: {
        color: "#1f2937",
      },
    },
  },
}

export default App