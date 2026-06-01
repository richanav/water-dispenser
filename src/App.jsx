import {
  FiHome, FiDroplet, FiTruck, FiCreditCard, FiBell,
  FiSearch, FiUser, FiFileText, FiAlertTriangle
} from "react-icons/fi"

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Tooltip,
  Legend,
} from "chart.js"

import { Bar, Line } from "react-chartjs-2"

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Tooltip,
  Legend
)

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
    <div className="min-h-screen bg-[#0b1120] text-white flex">

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

        <TopNavbar />

        <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
          <StatCard title="Tanks Monitored" value="3" sub="All Active" badge="Online" />
          <StatCard title="Low Water Alerts" value="1" sub="Action Required" danger badge="Critical" />
          <StatCard title="Next Delivery" value="Today 2 PM" sub="Refill Pending" badge="Pending" gradient />
          <StatCard title="Wallet Balance" value="₹1250" sub="Available" badge="Active" />
        </section>

        <section className="grid grid-cols-1 xl:grid-cols-3 gap-6">

          <div className="xl:col-span-2 space-y-6">

            <div className="card">
              <div className="flex justify-between mb-4">
                <h3 className="font-bold">My Tanks</h3>
                <button className="text-blue-400 text-sm">View All</button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <TankCard name="Tank 1" level={72} status="Normal" />
                <TankCard name="Tank 2" level={16} status="Low Water" danger />
                <TankCard name="Tank 3" level={58} status="Normal" />
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <ChartCard title="Water Usage This Week">
                <Bar data={barData} options={chartOptions} />
              </ChartCard>

              <ChartCard title="Monthly Consumption">
                <Line data={lineData} options={chartOptions} />
              </ChartCard>
            </div>

            <div className="card">
              <h3 className="font-bold mb-5">Delivery Status</h3>

              <div className="grid grid-cols-4 text-center">
                <Step done text="Requested" />
                <Step done text="Confirmed" />
                <Step active text="Pending" />
                <Step text="Completed" />
              </div>
            </div>

          </div>

          <div className="space-y-6">

            <div className="card">
              <h3 className="font-bold mb-4">Recent Activity</h3>
              <Activity priority="critical" text="Low water alert" time="10:32 AM" />
              <Activity priority="normal" text="Delivery confirmed" time="11:05 AM" />
              <Activity priority="warning" text="Awaiting refill" time="11:10 AM" />
            </div>

            <div className="bg-gradient-to-br from-blue-700 via-indigo-800 to-slate-900 rounded-2xl p-5 border border-blue-900 shadow-xl hover:-translate-y-1 transition">
              <h3 className="font-bold">Need Delivery?</h3>
              <p className="text-sm text-gray-300 mt-2">
                Request water can delivery instantly.
              </p>

              <button className="mt-4 bg-blue-500 hover:bg-blue-400 px-4 py-2 rounded-xl text-sm transition">
                Request Delivery
              </button>
            </div>

            <div className="card">
              <h3 className="font-bold mb-4">Live Status</h3>
              <StatusBadge color="green" text="System Online" />
              <StatusBadge color="red" text="Tank 2 Low Water" />
              <StatusBadge color="orange" text="Refill Pending" />
            </div>

          </div>
        </section>
      </main>
    </div>


  );

}

function TopNavbar() {
  return (
    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
      <div>
        <h2 className="text-2xl font-bold">Dashboard</h2>
        <p className="text-gray-400">Welcome back 👋</p>
      </div>

      <div className="flex items-center gap-4">
        <div className="hidden sm:flex items-center bg-[#1e293b] px-4 py-2 rounded-xl border border-gray-800">
          <FiSearch className="text-gray-400 mr-2" />
          <input
            className="bg-transparent outline-none text-sm text-white placeholder-gray-500"
            placeholder="Search tank, delivery..."
          />
        </div>

        <button className="relative bg-[#1e293b] p-3 rounded-xl border border-gray-800 hover:bg-[#263449] transition">
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

function MenuItem({ text, icon, active }) {
  return (
    <div className={`flex items-center gap-3 px-4 py-3 rounded-xl cursor-pointer transition ${
      active ? "bg-blue-600 text-white" : "text-gray-400 hover:bg-[#1e293b] hover:text-white"
    }`}>
      {icon}
      {text}
    </div>
  )
}

function StatCard({ title, value, sub, danger, badge, gradient }) {
  return (
    <div className={`rounded-2xl p-5 border border-gray-800 shadow-xl hover:-translate-y-1 transition ${
      gradient ? "bg-gradient-to-br from-blue-700 to-purple-900" : "bg-[#1e293b]"
    }`}>
      <div className="flex justify-between items-start">
        <p className="text-sm text-gray-400">{title}</p>
        <span className={`text-xs px-2 py-1 rounded-full ${
          danger ? "bg-red-900 text-red-300" : "bg-green-900 text-green-300"
        }`}>
          {badge}
        </span>
      </div>

      <h3 className={`text-2xl font-bold mt-3 ${danger ? "text-red-400" : "text-white"}`}>
        {value}
      </h3>

      <p className="text-xs text-gray-500 mt-1">{sub}</p>
    </div>
  )
}

function TankCard({ name, level, status, danger }) {
  return (
    <div className={`rounded-2xl p-4 border hover:-translate-y-1 transition ${
      danger ? "bg-[#2a1a1a] border-red-800" : "bg-[#111827] border-gray-800"
    }`}>
      <div className="flex justify-between">
        <h4 className="font-semibold text-sm">{name}</h4>

        <span className={`text-xs px-2 py-1 rounded-full ${
          danger ? "bg-red-900 text-red-300" : "bg-green-900 text-green-300"
        }`}>
          {status}
        </span>
      </div>

      <div className="mt-5 h-24 flex items-end justify-center">
        <div className="w-20 h-24 border-2 border-blue-400 rounded-b-2xl rounded-t-lg relative overflow-hidden bg-[#0f172a]">
          <div
            className={`absolute bottom-0 w-full ${danger ? "bg-red-500" : "bg-blue-500"}`}
            style={{ height: `${level}%` }}
          ></div>
        </div>
      </div>

      <p className="text-center font-bold mt-3">{level}%</p>

      <div className="w-full bg-gray-700 h-2 rounded-full mt-3 overflow-hidden">
        <div
          className={`h-full rounded-full ${danger ? "bg-red-500" : "bg-blue-500"}`}
          style={{ width: `${level}%` }}
        ></div>
      </div>

      <button className="w-full mt-4 text-blue-400 text-sm">
        View Details
      </button>
    </div>
  )
}

function ChartCard({ title, children }) {
  return (
    <div className="card">
      <h3 className="font-bold mb-4">{title}</h3>
      {children}
    </div>
  )
}

function Step({ text, done, active }) {
  return (
    <div>
      <div className={`mx-auto w-8 h-8 rounded-full flex items-center justify-center ${
        done ? "bg-green-500" : active ? "bg-orange-400" : "bg-gray-700"
      }`}>
        ✓
      </div>
      <p className="mt-2 text-sm text-gray-400">{text}</p>
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
    <div className="flex justify-between items-center border-b border-gray-700 py-3 text-sm">
      <div className="flex items-center gap-2">
        <span className={`w-2 h-2 rounded-full ${color}`}></span>
        <p className="text-gray-300">{text}</p>
      </div>
      <p className="text-gray-500">{time}</p>
    </div>
  )
}

function StatusBadge({ text, color }) {
  const styles = {
    green: "bg-green-900 text-green-300",
    red: "bg-red-900 text-red-300",
    orange: "bg-orange-900 text-orange-300",
  }

  return (
    <div className={`mb-3 px-4 py-2 rounded-xl text-sm ${styles[color]}`}>
      {text}
    </div>
  )
}

const barData = {
  labels: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
  datasets: [
    {
      label: "Litres",
      data: [120, 180, 150, 220, 170, 240, 190],
      backgroundColor: "#3b82f6",
      borderRadius: 8,
    },
  ],
}

const lineData = {
  labels: ["Jan", "Feb", "Mar", "Apr", "May", "Jun"],
  datasets: [
    {
      label: "Consumption",
      data: [900, 1100, 950, 1300, 1250, 1450],
      borderColor: "#60a5fa",
      backgroundColor: "#60a5fa",
      tension: 0.4,
    },
  ],
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