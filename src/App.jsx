import { FiBell, FiSearch, FiUser } from "react-icons/fi"

import { useEffect, useState } from "react"
import { collection, onSnapshot } from "firebase/firestore"
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

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
  Legend
)

function App() {
  const [alertCounts, setAlertCounts] = useState([0, 0, 0, 0])
  const [tanks, setTanks] = useState([])
  const [activePage, setActivePage] = useState("dashboard")

  const totalAlerts = alertCounts.reduce((sum, count) => sum + count, 0)
  const averageAlerts = (totalAlerts / 4).toFixed(1)

  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, "low_water_alerts"),
      (snapshot) => {
        const weekCounts = [0, 0, 0, 0]

        snapshot.docs.forEach((doc) => {
          const data = doc.data()
          const date = data.createdAt?.toDate?.()

          if (date) {
            const day = date.getDate()
            const week = Math.min(Math.ceil(day / 7), 4)
            weekCounts[week - 1]++
          }
        })

        setAlertCounts(weekCounts)
      }
    )

    return () => unsubscribe()
  }, [])

  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, "devices"),
      (snapshot) => {
        const tankList = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }))

        setTanks(tankList)
      }
    )

    return () => unsubscribe()
  }, [])

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
            <MenuItem text="Deliveries" active={activePage === "deliveries"} onClick={() => setActivePage("deliveries")} />
            <MenuItem text="Wallet & Payments" active={activePage === "wallet"} onClick={() => setActivePage("wallet")} />
            <MenuItem text="Transactions" active={activePage === "transactions"} onClick={() => setActivePage("transactions")} />
            <MenuItem text="Invoices" active={activePage === "invoices"} onClick={() => setActivePage("invoices")} />
            <MenuItem text="Alerts" active={activePage === "alerts"} onClick={() => setActivePage("alerts")} />
            <MenuItem text="Reports" active={activePage === "reports"} onClick={() => setActivePage("reports")} />
          </div>
        </div>

        <div className="flex-1 p-6">

          {activePage === "dashboard" && (
            <>
              <TopNavbar />

              <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
                <StatCard
                  title="Tanks Monitored"
                  value={tanks.length}
                  sub="Active"
                  badge="Online"
                />

                <StatCard
                  title="Low Water Alerts"
                  value={totalAlerts}
                  sub="This Month"
                  badge="Normal"
                />

                <StatCard
                  title="Average Low Alerts"
                  value={averageAlerts}
                  sub="Per Week"
                  badge="Avg"
                />

                <StatCard
                  title="Next Delivery"
                  value="Today 2 PM"
                  sub="Refill Pending"
                  badge="Pending"
                  gradient
                />
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
                            name={tank.device_id || tank.id}
                            status={isLow ? "LOW WATER" : "SUFFICIENT"}
                            danger={isLow}
                          />
                        )
                      })}
                    </div>
                  </div>

                  <ChartCard title="Monthly Low Water Alerts">
                    <Bar data={lowWaterAlertData} options={chartOptions} />
                  </ChartCard>
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

                    <button className="mt-4 bg-blue-500 hover:bg-blue-400 px-4 py-2 rounded-xl text-sm transition">
                      Request Delivery
                    </button>
                  </div>
                </div>
              </section>
            </>
          )}

          {activePage === "tank" && (
            <div>
              <h1 className="text-4xl font-bold mb-6">
                My Tank Details
              </h1>

              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {tanks.map((tank) => {
                  const status = String(tank.water_level).toLowerCase()
                  const isLow = status === "low"

                  return (
                    <TankCard
                      key={tank.id}
                      name={tank.device_id || tank.id}
                      status={isLow ? "LOW WATER" : "SUFFICIENT"}
                      danger={isLow}
                    />
                  )
                })}
              </div>
            </div>
          )}

          {activePage === "deliveries" && <Page title="Deliveries" />}
          {activePage === "wallet" && <Page title="Wallet & Payments" />}
          {activePage === "transactions" && <Page title="Transactions" />}
          {activePage === "invoices" && <Page title="Invoices" />}
          {activePage === "alerts" && <Page title="Alerts" />}
          {activePage === "reports" && <Page title="Reports" />}

        </div>
      </div>
    </div>
  )
}

function TopNavbar() {
  return (
    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
      <div>
        <h2 className="text-5xl font-bold">Dashboard</h2>
        <p className="text-gray-400 text-lg">Welcome back 👋</p>
      </div>

      <div className="flex items-center gap-4">
        <div className="hidden sm:flex items-center bg-[#1e293b] px-4 py-2 rounded-xl border border-gray-800">
          <FiSearch className="text-gray-400 mr-2" />
          <input
            className="bg-transparent outline-none text-sm text-white placeholder-gray-500"
            placeholder="Search..."
          />
        </div>

        <button className="relative bg-[#1e293b] p-3 rounded-xl border border-gray-800">
          <FiBell />
          <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full"></span>
        </button>

        <div className="flex items-center gap-2 bg-[#1e293b] px-3 py-2 rounded-xl border border-gray-800">
          <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center">
            <FiUser />
          </div>

          <span className="text-sm">Admin</span>
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
        gradient
          ? "bg-gradient-to-br from-blue-700 to-purple-900"
          : "bg-[#1e293b]"
      }`}
    >
      <div className="flex justify-between items-start">
        <p className="text-sm text-gray-400">{title}</p>

        <span
          className={`text-xs px-2 py-1 rounded-full ${
            danger
              ? "bg-red-900 text-red-300"
              : "bg-green-900 text-green-300"
          }`}
        >
          {badge}
        </span>
      </div>

      <h3
        className={`text-4xl font-bold mt-3 ${
          danger ? "text-red-400" : "text-white"
        }`}
      >
        {value}
      </h3>

      <p className="text-xs text-gray-500 mt-1">{sub}</p>
    </div>
  )
}

function TankCard({ name, status, danger }) {
  return (
    <div
      className={`w-full max-w-md rounded-2xl p-4 border hover:-translate-y-1 transition ${
        danger
          ? "bg-[#2a1a1a] border-red-800"
          : "bg-[#111827] border-gray-800"
      }`}
    >
      <div className="flex justify-between items-center gap-3">
        <h4 className="font-semibold text-xl">{name}</h4>

        <span
          className={`text-xs px-3 py-2 rounded-full ${
            danger
              ? "bg-red-900 text-red-300"
              : "bg-green-900 text-green-300"
          }`}
        >
          {danger ? "LOW" : "SUFFICIENT"}
        </span>
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

      <p
        className={`text-center font-bold text-3xl mt-4 ${
          danger ? "text-red-400" : "text-blue-400"
        }`}
      >
        {danger ? "LOW WATER" : "SUFFICIENT"}
      </p>

      <p className="text-center text-gray-400 text-sm mt-2">
        Water Status
      </p>
    </div>
  )
}

function ChartCard({ title, children }) {
  return (
    <div className="card">
      <h3 className="font-bold text-2xl mb-4">{title}</h3>
      {children}
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

function Page({ title }) {
  return (
    <div className="card">
      <h1 className="text-3xl font-bold">{title}</h1>
      <p className="text-gray-400 mt-4">
        This page can be updated with details later.
      </p>
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