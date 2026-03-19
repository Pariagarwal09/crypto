import React, { useEffect, useState } from "react";
import axios from "axios";
import emailjs from "emailjs-com";
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  LineElement,
  CategoryScale,
  LinearScale,
  PointElement,
  Legend,
  Tooltip,
} from "chart.js";
import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap-icons/font/bootstrap-icons.css";

// Firebase imports
import { initializeApp } from "firebase/app";
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from "firebase/auth";

ChartJS.register(
  LineElement,
  CategoryScale,
  LinearScale,
  PointElement,
  Legend,
  Tooltip
);

// Replace these with your actual Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyCw7EIk59jJoBBOzUUarg8Z-MGYB04DKWY",
  authDomain: "crypto-tracker-7b16f.firebaseapp.com",
  projectId: "crypto-tracker-7b16f",
  storageBucket: "crypto-tracker-7b16f.appspot.com",
  messagingSenderId: "41473312346",
  appId: "1:41473312346:web:2b3441a378f67eaaae3a63",
  measurementId: "G-K41F8XSB0G",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

function App() {
  // States
  const [coins, setCoins] = useState([]);
  const [allCoins, setAllCoins] = useState([]);
  const [search, setSearch] = useState("");
  const [wishlist, setWishlist] = useState([]);
  const [loggedIn, setLoggedIn] = useState(false);
  const [username, setUsername] = useState("");
  const [showToast, setShowToast] = useState(false);
  const [toastMsg, setToastMsg] = useState("");
  const [view, setView] = useState("home"); // views: home, wishlist, compare, coinDetails
  const [selectedCoin, setSelectedCoin] = useState(null);
  const [compareList, setCompareList] = useState([]);
  const [showSignUp, setShowSignUp] = useState(false);

  // Load wishlist from localStorage on mount
  useEffect(() => {
    const storedWishlist = localStorage.getItem("wishlist");
    if (storedWishlist) {
      setWishlist(JSON.parse(storedWishlist));
    }
  }, []);

  // Save wishlist to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem("wishlist", JSON.stringify(wishlist));
  }, [wishlist]);

  // Listen for Firebase Auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setLoggedIn(true);
        setUsername(user.email);
        setView("home");
      } else {
        setLoggedIn(false);
        setUsername("");
      }
    });
    return () => unsubscribe();
  }, []);

  // Fetch coins data
  useEffect(() => {
    axios
      .get("https://api.coingecko.com/api/v3/coins/markets", {
        params: {
          vs_currency: "usd",
          order: "market_cap_desc",
          per_page: 50,
          page: 1,
          sparkline: false,
        },
      })
      .then((res) => setCoins(res.data))
      .catch((err) => console.error("Error fetching coins:", err));

    axios
      .get("https://api.coingecko.com/api/v3/coins/markets", {
        params: {
          vs_currency: "usd",
          order: "market_cap_desc",
          per_page: 100,
          page: 1,
          sparkline: false,
        },
      })
      .then((res) => setAllCoins(res.data))
      .catch((err) => console.error("Error fetching all coins:", err));
  }, []);

  // Login handler
  const handleLogin = (e) => {
    e.preventDefault();
    const user = e.target.email.value;
    const pass = e.target.password.value;
    signInWithEmailAndPassword(auth, user, pass).catch((error) => {
      showToastMessage("Login failed: " + error.message);
    });
  };

  // Signup handler
  const handleSignUp = (e) => {
    e.preventDefault();
    const user = e.target.email.value;
    const pass = e.target.password.value;
    createUserWithEmailAndPassword(auth, user, pass)
      .then(() => {
        showToastMessage("Sign up successful! You can now log in.");
        setShowSignUp(false);
      })
      .catch((error) => {
        showToastMessage("Sign up failed: " + error.message);
      });
  };

  // Logout handler
  const handleLogout = () => {
    signOut(auth)
      .then(() => setView("home"))
      .catch((error) => {
        showToastMessage("Logout failed: " + error.message);
      });
  };

  // Toast message helper
  const showToastMessage = (msg) => {
    setToastMsg(msg);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 4000);
  };

  // Add coin to wishlist
  const handleAddToWishlist = (coin) => {
    if (!wishlist.some((item) => item.id === coin.id)) {
      setWishlist([...wishlist, coin]);
      showToastMessage(`${coin.name} added to wishlist!`);
    } else {
      showToastMessage(`${coin.name} is already in wishlist.`);
    }
  };

  // Add coin to compare list (max 2)
  const handleCompare = (coin) => {
    if (compareList.some((c) => c.id === coin.id)) {
      showToastMessage(`${coin.name} already added to compare.`);
      return;
    }
    if (compareList.length < 2) {
      setCompareList([...compareList, coin]);
      showToastMessage(
        compareList.length === 0
          ? "1st coin added to compare."
          : "2nd coin added to compare."
      );
    } else {
      showToastMessage("Only 2 coins can be compared at once.");
    }
  };

  // Reset compare list
  const resetCompare = () => {
    setCompareList([]);
    showToastMessage("Compare list reset.");
  };

  // Send email with coin details via EmailJS
  const handleSendEmail = () => {
    if (!selectedCoin) return;
    const templateParams = {
      to_name: username,
      coin_name: selectedCoin.name,
      coin_price: selectedCoin.current_price,
      market_cap: selectedCoin.market_cap,
      volume: selectedCoin.total_volume,
      coin_symbol: selectedCoin.symbol,
    };

    emailjs
      .send(
        "your_service_id", // replace with your EmailJS service ID
        "your_template_id", // replace with your EmailJS template ID
        templateParams,
        "your_public_key" // replace with your EmailJS public key
      )
      .then(() => {
        showToastMessage("Email sent successfully!");
      })
      .catch((error) => {
        console.error("Email sending failed:", error);
        showToastMessage("Failed to send email.");
      });
  };

  // Filter coins based on search input
  const filteredCoins = coins.filter((coin) =>
    coin.name.toLowerCase().includes(search.toLowerCase())
  );

  // Chart data for coin details
  const coinDetailsChartData = selectedCoin
    ? {
        labels: ["Current Price", "Market Cap", "Total Volume"],
        datasets: [
          {
            label: selectedCoin.name,
            data: [
              selectedCoin.current_price,
              selectedCoin.market_cap,
              selectedCoin.total_volume,
            ],
            borderColor: "rgba(75,192,192,1)",
            backgroundColor: "rgba(75,192,192,0.2)",
            fill: true,
            tension: 0.3,
          },
        ],
      }
    : null;

  // Chart data for compare view
  const compareChartData = {
    labels: ["Price", "Market Cap", "24h Change (%)"],
    datasets: compareList.map((coin, idx) => ({
      label: coin.name,
      data: [
        coin.current_price,
        coin.market_cap,
        coin.price_change_percentage_24h,
      ],
      borderColor: idx === 0 ? "rgba(255,99,132,1)" : "rgba(54,162,235,1)",
      backgroundColor:
        idx === 0 ? "rgba(255,99,132,0.2)" : "rgba(54,162,235,0.2)",
      fill: true,
      tension: 0.3,
    })),
  };

  // Show login/signup screen if not logged in
  if (!loggedIn) {
    return (
      <div className="container mt-5">
        {!showSignUp ? (
          <>
            <h2 className="text-center mb-4 text-primary">Login to CryptoTracker</h2>
            <form
              onSubmit={handleLogin}
              className="w-50 mx-auto border p-4 shadow-sm rounded"
            >
              <div className="mb-3">
                <label className="form-label">Email</label>
                <input
                  type="email"
                  name="email"
                  className="form-control"
                  placeholder="Enter email"
                  required
                />
              </div>
              <div className="mb-3">
                <label className="form-label">Password</label>
                <input
                  type="password"
                  name="password"
                  className="form-control"
                  placeholder="Enter password"
                  required
                />
              </div>
              <button type="submit" className="btn btn-primary w-100">
                Login
              </button>
              <p className="mt-3 text-center">
                Don't have an account?{" "}
                <button
                  type="button"
                  className="btn btn-link"
                  onClick={() => setShowSignUp(true)}
                >
                  Sign Up
                </button>
              </p>
            </form>
          </>
        ) : (
          <>
            <h2 className="text-center mb-4 text-success">Sign Up for CryptoTracker</h2>
            <form
              onSubmit={handleSignUp}
              className="w-50 mx-auto border p-4 shadow-sm rounded"
            >
              <div className="mb-3">
                <label className="form-label">Email</label>
                <input
                  type="email"
                  name="email"
                  className="form-control"
                  placeholder="Enter email"
                  required
                />
              </div>
              <div className="mb-3">
                <label className="form-label">Password</label>
                <input
                  type="password"
                  name="password"
                  className="form-control"
                  placeholder="Enter password"
                  required
                  minLength={6}
                />
              </div>
              <button type="submit" className="btn btn-success w-100">
                Sign Up
              </button>
              <p className="mt-3 text-center">
                Already have an account?{" "}
                <button
                  type="button"
                  className="btn btn-link"
                  onClick={() => setShowSignUp(false)}
                >
                  Login
                </button>
              </p>
            </form>
          </>
        )}

        {showToast && (
          <div
            className="toast-container position-fixed bottom-0 end-0 p-3"
            style={{ zIndex: 1055 }}
          >
            <div
              className="toast show align-items-center text-white bg-danger border-0"
              role="alert"
            >
              <div className="d-flex">
                <div className="toast-body">{toastMsg}</div>
                <button
                  type="button"
                  className="btn-close btn-close-white me-2 m-auto"
                  onClick={() => setShowToast(false)}
                ></button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Logged in UI starts here
  return (
    <div className="container my-4">
      {/* Header */}
    
  <div className="container my-4">
    <nav className="navbar navbar-expand-lg navbar-light bg-light rounded">
      <div className="container-fluid">
        {/* Brand */}
<span className="navbar-brand text-primary fw-bold d-flex align-items-center gap-3">
  <i className="bi bi-graph-up" style={{ fontSize: "2.5rem" }}></i>
  <span style={{ fontSize: "2.2rem", letterSpacing: "2px" }}>CryptoTracker</span>
</span>
        {/* Toggler */}
        <button
          className="navbar-toggler"
          type="button"
          data-bs-toggle="collapse"
          data-bs-target="#navbarNavAltMarkup"
          aria-controls="navbarNavAltMarkup"
          aria-expanded="false"
          aria-label="Toggle navigation"
        >
          <span className="navbar-toggler-icon"></span>
        </button>

        {/* Collapsible Content */}
        <div className="collapse navbar-collapse" id="navbarNavAltMarkup">
          <div className="navbar-nav ms-auto d-flex align-items-center">
            <button
              className={`btn btn-outline-primary me-2 mb-2 mb-lg-0 ${
                view === "home" ? "active" : ""
              }`}
              onClick={() => setView("home")}
            >
              All Coins
            </button>
            <button
              className={`btn btn-outline-success me-2 mb-2 mb-lg-0 ${
                view === "wishlist" ? "active" : ""
              }`}
              onClick={() => setView("wishlist")}
            >
              Wishlist ({wishlist.length})
            </button>
            <button
              className={`btn btn-outline-warning me-2 mb-2 mb-lg-0 ${
                view === "compare" ? "active" : ""
              }`}
              onClick={() => setView("compare")}
            >
              Compare ({compareList.length})
            </button>
            <div className="dropdown ms-2">
  <button
    className="btn btn-light rounded-circle p-1 border-0"
    id="profileDropdown"
    data-bs-toggle="dropdown"
    aria-expanded="false"
    title="Profile"
    style={{
      width: 36,
      height: 36,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: "#e0e0e0"
    }}
  >
    <i className="bi bi-person-circle text-secondary" style={{ fontSize: "1.5rem" }}></i>
  </button>
  <ul className="dropdown-menu dropdown-menu-end" aria-labelledby="profileDropdown">
    <li className="px-3 py-2">
      <div className="fw-bold">{username || "User"}</div>
      <div className="text-muted" style={{ fontSize: "0.9rem" }}>{username ? username : "No ID"}</div>
      <hr className="my-2" />
      <button
        className="btn btn-outline-danger w-100"
        onClick={handleLogout}
      >
        <i className="bi bi-box-arrow-right me-2"></i>Logout
      </button>
    </li>
  </ul>
</div>
          </div>
        </div>
      </div>
    </nav>
  </div>

      {/* Toast Notification */}
      {showToast && (
        <div
          className="toast-container position-fixed bottom-0 end-0 p-3"
          style={{ zIndex: 1055 }}
        >
          <div
            className="toast show align-items-center text-white bg-success border-0"
            role="alert"
          >
            <div className="d-flex">
              <div className="toast-body">{toastMsg}</div>
              <button
                type="button"
                className="btn-close btn-close-white me-2 m-auto"
                onClick={() => setShowToast(false)}
              ></button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      {view === "home" && (
        <>

         <div className="mb-3">
  <div className="input-group">
    <span className="input-group-text bg-white">
      <i className="bi bi-search "></i>
    </span>
    <input
      type="text"
      className="form-control"
      placeholder="Search coins by name..."
      value={search}
      onChange={(e) => setSearch(e.target.value)}
    />
  </div>
</div>

          <div className="row row-cols-1 row-cols-md-3 g-3">
            {filteredCoins.length === 0 && (
              <p className="text-center">No coins found for "{search}"</p>
            )}
            {filteredCoins.map((coin) => (
              <div key={coin.id} className="col">
                <div className="card h-100 shadow-sm">
                  <img
                    src={coin.image}
                    className="card-img-top p-3 mx-auto d-block"
                    alt={coin.name}
                    style={{ maxHeight: "100px", objectFit: "contain" }}
                  />
                  <div className="card-body">
                    <h5 className="card-title text-capitalize">{coin.name}</h5>
                    <p className="card-text">
                      Price: ${coin.current_price.toLocaleString()}
                      <br />
                      Market Cap: ${coin.market_cap.toLocaleString()}
                      <br />
                      24h Change:{" "}
                      <span
                        className={
                          coin.price_change_percentage_24h >= 0
                            ? "text-success"
                            : "text-danger"
                        }
                      >
                        {coin.price_change_percentage_24h.toFixed(2)}%
                      </span>
                    </p>
                  </div>
                  <div className="card-footer d-flex justify-content-between">
                    <button
                      className="btn btn-sm btn-primary"
                      onClick={() => {
                        setSelectedCoin(coin);
                        setView("coinDetails");
                      }}
                    >
                      Details
                    </button>
                    <button
                      className="btn btn-sm btn-success"
                      onClick={() => handleAddToWishlist(coin)}
                    >
                      Add Wishlist
                    </button>
                    <button
                      className="btn btn-sm btn-warning"
                      onClick={() => handleCompare(coin)}
                    >
                      Compare
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {view === "wishlist" && (
        <>
          <h2 className="mb-3">Your Wishlist</h2>
          {wishlist.length === 0 ? (
            <p>You have no coins in your wishlist.</p>
          ) : (
            <div className="row row-cols-1 row-cols-md-3 g-3">
              {wishlist.map((coin) => (
                <div key={coin.id} className="col">
                  <div className="card h-100 shadow-sm">
                    <img
                      src={coin.image}
                      className="card-img-top"
                      alt={coin.name}
                      style={{ maxHeight: "150px", objectFit: "contain" }}
                    />
                    <div className="card-body">
                      <h5 className="card-title text-capitalize">{coin.name}</h5>
                      <p className="card-text">
                        Price: ${coin.current_price.toLocaleString()}
                        <br />
                        Market Cap: ${coin.market_cap.toLocaleString()}
                      </p>
                    </div>
                    <div className="card-footer">
                      <button
                        className="btn btn-sm btn-danger"
                        onClick={() =>
                          setWishlist(wishlist.filter((c) => c.id !== coin.id))
                        }
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {view === "compare" && (
        <>
          <h2 className="mb-3">Compare Coins</h2>
          {compareList.length === 0 ? (
            <p>Add coins to compare (max 2) from the All Coins page.</p>
          ) : (
            <>
              <div className="mb-3 d-flex gap-3 flex-wrap">
                {compareList.map((coin) => (
                  <div
                    key={coin.id}
                    className="border rounded p-2 text-center"
                    style={{ minWidth: "150px" }}
                  >
                    <img
                      src={coin.image}
                      alt={coin.name}
                      style={{ height: "50px", objectFit: "contain" }}
                    />
                    <h5 className="text-capitalize">{coin.name}</h5>
                    <p>
                      Price: ${coin.current_price.toLocaleString()}
                      <br />
                      Market Cap: ${coin.market_cap.toLocaleString()}
                      <br />
                      24h Change:{" "}
                      <span
                        className={
                          coin.price_change_percentage_24h >= 0
                            ? "text-success"
                            : "text-danger"
                        }
                      >
                        {coin.price_change_percentage_24h.toFixed(2)}%
                      </span>
                    </p>
                    <button
                      className="btn btn-sm btn-outline-danger"
                      onClick={() =>
                        setCompareList(compareList.filter((c) => c.id !== coin.id))
                      }
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
              <div style={{ maxWidth: "600px", margin: "auto" }}>
                <Line data={compareChartData} />
              </div>
              <div className="mt-3 text-center">
                <button className="btn btn-danger" onClick={resetCompare}>
                  Reset Compare
                </button>
              </div>
            </>
          )}
        </>
      )}

      {view === "coinDetails" && selectedCoin && (
        <>
          <button
            className="btn btn-secondary mb-3"
            onClick={() => setView("home")}
          >
            ← Back to All Coins
          </button>
          <div className="card shadow-sm p-3">
            <div className="d-flex align-items-center gap-4">
              <img
                src={selectedCoin.image}
                alt={selectedCoin.name}
                style={{ height: "80px", objectFit: "contain" }}
              />
              <h2 className="text-capitalize">{selectedCoin.name}</h2>
            </div>
            <p>
              Symbol: {selectedCoin.symbol.toUpperCase()} <br />
              Current Price: ${selectedCoin.current_price.toLocaleString()} <br />
              Market Cap: ${selectedCoin.market_cap.toLocaleString()} <br />
              Total Volume: ${selectedCoin.total_volume.toLocaleString()} <br />
              24h Price Change:{" "}
              <span
                className={
                  selectedCoin.price_change_percentage_24h >= 0
                    ? "text-success"
                    : "text-danger"
                }
              >
                {selectedCoin.price_change_percentage_24h.toFixed(2)}%
              </span>
            </p>
            <div style={{ maxWidth: "600px", margin: "auto" }}>
              <Line data={coinDetailsChartData} />
            </div>
            <div className="mt-3 text-center">
              <button className="btn btn-primary" onClick={handleSendEmail}>
                Send Details via Email
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default App;