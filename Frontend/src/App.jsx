// frontend/src/App.jsx
import { useState, useEffect } from "react";
import axios from "axios";

function App() {
  const [user, setUser] = useState(null);
  const [isSignUp, setIsSignUp] = useState(false);
  
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState("");

  const [portfolio, setPortfolio] = useState([]);
  const [tickerInput, setTickerInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [initialFetchLoading, setInitialFetchLoading] = useState(false);

  // ---  Briefing State ---
  const [briefing, setBriefing] = useState("");
  const [isGeneratingBriefing, setIsGeneratingBriefing] = useState(false);
  const generateBriefing = async () => {
    setIsGeneratingBriefing(true);
    setBriefing("");
    try {
      const response = await axios.get("http://127.0.0.1:8000/api/portfolio/briefing", {
        headers: { Authorization: `Bearer ${user.token}` }
      });
      setBriefing(response.data.briefing);
    } catch (error) {
      alert(error.response?.data?.detail || "Could not generate briefing.");
    } finally {
      setIsGeneratingBriefing(false);
    }
  };

  // ---  Currency State ---
  const [currency, setCurrency] = useState("USD");
  const [exchangeRates, setExchangeRates] = useState({ USD: 1 });

  // 1. Check local storage on mount
  useEffect(() => {
    const savedUsername = localStorage.getItem("finsight_user");
    const token = localStorage.getItem("finsight_token");
    if (savedUsername && token) {
      setUser({ username: savedUsername, token });
    }

    // Fetch free exchange rates immediately on load
    axios.get("https://api.exchangerate-api.com/v4/latest/USD")
      .then(res => setExchangeRates(res.data.rates))
      .catch(err => console.error("Could not fetch exchange rates", err));
  }, []);

  // 2. Fetch Portfolio whenever `user` changes
  useEffect(() => {
    if (user) {
      fetchPortfolio();
    }
  }, [user]);

  const fetchPortfolio = async () => {
    setInitialFetchLoading(true);
    try {
      const response = await axios.get("http://127.0.0.1:8000/api/portfolio", {
        headers: { Authorization: `Bearer ${user.token}` }
      });
      setPortfolio(response.data);
    } catch (error) {
      if (error.response?.status === 401) handleLogout();
    } finally {
      setInitialFetchLoading(false);
    }
  };

  const handleAuth = async (e) => {
    e.preventDefault();
    setAuthError("");
    const endpoint = isSignUp ? "/api/auth/register" : "/api/auth/login";
    const payload = isSignUp ? { username, email, password } : { username, password };

    try {
      const response = await axios.post(`http://127.0.0.1:8000${endpoint}`, payload);
      const { token, username: returnedUsername } = response.data;
      
      localStorage.setItem("finsight_token", token);
      localStorage.setItem("finsight_user", returnedUsername);
      
      setUser({ username: returnedUsername, token });
      setUsername(""); setEmail(""); setPassword("");
    } catch (err) {
      setAuthError(err.response?.data?.detail || "An error occurred");
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("finsight_token");
    localStorage.removeItem("finsight_user");
    setUser(null);
    setPortfolio([]);
  };

  // Add stock function that updates the UI instantly without reloading the page
  const addStock = async (e) => {
    e.preventDefault();
    if (!tickerInput) return;
    setLoading(true);
    try {
      const response = await axios.post(
        "http://127.0.0.1:8000/api/portfolio",
        { ticker: tickerInput },
        { headers: { Authorization: `Bearer ${user.token}` } }
      );
      setPortfolio((prev) => [...prev, response.data]);
      setTickerInput("");
    } catch (error) {
      alert(error.response?.data?.detail || "Could not add stock.");
    } finally {
      setLoading(false);
    }
  };

  // Remove stock function that updates the UI instantly without reloading the page
  const removeStock = async (assetId) => {
    try {
      await axios.delete(`http://127.0.0.1:8000/api/portfolio/${assetId}`, {
        headers: { Authorization: `Bearer ${user.token}` }
      });
      // Instantly remove it from the UI without reloading the page
      setPortfolio(portfolio.filter(stock => stock.id !== assetId));
    } catch (error) {
      alert("Could not remove stock.");
    }
  };

  // --- Dynamic Price Formatter ---
  const formatPrice = (priceInUSD) => {
    const rate = exchangeRates[currency] || 1;
    const convertedPrice = priceInUSD * rate;
    
    // Intl.NumberFormat automatically handles correct symbols ($, €, £) based on currency code
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency
    }).format(convertedPrice);
  };

  // --- RENDER UNAUTHENTICATED ---
  if (!user) {
    return (
      <div className="min-h-screen bg-neutral-950 text-neutral-100 flex items-center justify-center p-4">
        <div className="bg-neutral-900 border border-neutral-800 p-8 rounded-xl max-w-md w-full shadow-2xl">
          <h1 className="text-3xl font-bold text-center text-white mb-2">FinSight</h1>
          <p className="text-neutral-400 text-center mb-6">
            {isSignUp ? "Create your account" : "Sign in to access your portfolio"}
          </p>
          {authError && <div className="bg-red-500/10 border border-red-500/50 text-red-400 text-sm p-3 rounded-md mb-4 text-center">{authError}</div>}
          <form onSubmit={handleAuth} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-1">Username</label>
              <input type="text" required value={username} onChange={(e) => setUsername(e.target.value)} className="w-full px-4 py-2 bg-neutral-950 border border-neutral-800 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-white" />
            </div>
            {isSignUp && (
              <div>
                <label className="block text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-1">Email</label>
                <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="w-full px-4 py-2 bg-neutral-950 border border-neutral-800 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-white" />
              </div>
            )}
            <div>
              <label className="block text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-1">Password</label>
              <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className="w-full px-4 py-2 bg-neutral-950 border border-neutral-800 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-white" />
            </div>
            <button type="submit" className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-md mt-2">
              {isSignUp ? "Sign Up" : "Log In"}
            </button>
          </form>
          <p className="text-center text-neutral-400 text-sm mt-6">
            {isSignUp ? "Already have an account?" : "Don't have an account?"}
            <button onClick={() => { setIsSignUp(!isSignUp); setAuthError(""); setUsername(""); setPassword(""); }} className="text-blue-400 hover:underline font-medium ml-1">
              {isSignUp ? "Log In" : "Sign Up"}
            </button>
          </p>
        </div>
      </div>
    );
  }

  // --- RENDER AUTHENTICATED ---
  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 p-8">
      <div className="max-w-5xl mx-auto">
        <header className="flex flex-col md:flex-row items-start md:items-center justify-between border-b border-neutral-800 pb-6 mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-white">FinSight</h1>
            <p className="text-neutral-400 mt-1">Logged in as <span className="text-blue-400">@{user.username}</span></p>
          </div>
          
          <div className="flex flex-wrap items-center gap-4">
            <form onSubmit={addStock} className="flex gap-2">
              <input type="text" placeholder="Ticker (e.g. AAPL)" value={tickerInput} onChange={(e) => setTickerInput(e.target.value.toUpperCase())} className="px-4 py-2 bg-neutral-900 border border-neutral-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-white uppercase w-40 md:w-auto" />
              <button type="submit" disabled={loading} className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-md disabled:opacity-50 whitespace-nowrap">
                {loading ? "Adding..." : "Add Asset"}
              </button>
            </form>

            {/* NEW: Currency Dropdown */}
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className="px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-white cursor-pointer"
            >
              <option value="USD">USD ($)</option>
              <option value="EUR">EUR (€)</option>
              <option value="GBP">GBP (£)</option>
              <option value="JPY">JPY (¥)</option>
            </select>

            <button onClick={handleLogout} className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-medium rounded-md">
              Log Out
            </button>
          </div>
        </header>

        <main>
          {/* AI Briefing Banner */}
          {portfolio.length > 0 && (
            <div className="mb-8 p-6 bg-gradient-to-r from-blue-900/20 to-purple-900/20 border border-blue-900/40 rounded-xl">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  ✨ AI Market Briefing
                </h2>
                <button 
                  onClick={generateBriefing}
                  disabled={isGeneratingBriefing}
                  className="px-4 py-2 bg-blue-600/30 text-blue-300 hover:bg-blue-600/50 hover:text-white font-medium rounded-md transition-colors disabled:opacity-50 cursor-pointer"
                >
                  {isGeneratingBriefing ? "Analyzing Market Data..." : "Generate Briefing"}
                </button>
              </div>
              
              {briefing && (
                <div className="text-neutral-300 leading-relaxed space-y-3 border-t border-neutral-800 pt-4">
                  {briefing.split('\n').map((paragraph, idx) => (
                    paragraph.trim() && <p key={idx}>{paragraph}</p>
                  ))}
                </div>
              )}
            </div>
          )}
          
          {initialFetchLoading ? (
            <div className="text-center py-20 text-neutral-400 animate-pulse">Loading your portfolio...</div>
          ) : portfolio.length === 0 ? (
            <div className="text-center py-20 border-2 border-dashed border-neutral-800 rounded-xl text-neutral-500">
              No assets tracked yet. Add a ticker symbol above!
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {portfolio.map((stock) => (
                <div key={stock.id} className="bg-neutral-900 border border-neutral-800 p-6 rounded-xl shadow-sm hover:border-neutral-700 transition-all group">
                  <div className="flex justify-between items-start mb-4">
                    <h2 className="text-xl font-bold text-white">{stock.ticker}</h2>
                    
                    {/* Updated Badges/Buttons container */}
                    <div className="flex items-center gap-3">
                      <span className="px-2.5 py-1 bg-neutral-800 text-xs font-medium text-neutral-300 rounded-full">
                        Equity
                      </span>
                      {/* NEW: Remove Button */}
                      <button 
                        onClick={() => removeStock(stock.id)}
                        className="text-neutral-600 hover:text-red-400 transition-colors px-1"
                        title="Remove asset"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                  
                  <p className="text-sm text-neutral-400 mb-1">Current Price</p>
                  <p className="text-3xl font-light text-white">
                    {formatPrice(stock.price)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

export default App;