// frontend/src/App.jsx
import { useState } from "react";
import axios from "axios";

function App() {
  // We will track multiple stocks in this array
  const [portfolio, setPortfolio] = useState([]);
  const [tickerInput, setTickerInput] = useState("");
  const [loading, setLoading] = useState(false);

  const addStock = async (e) => {
    e.preventDefault();
    if (!tickerInput) return;
    
    setLoading(true);
    try {
      const response = await axios.get(`http://127.0.0.1:8000/api/stock/${tickerInput}`);
      
      // Add the new stock data to our portfolio array
      setPortfolio((prev) => [...prev, response.data]);
      setTickerInput(""); 
    } catch (error) {
      console.error("Error fetching stock:", error);
      alert("Could not find that stock ticker.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 p-8">
      <div className="max-w-5xl mx-auto">
        
        {/* Header Section */}
        <header className="flex items-center justify-between border-b border-neutral-800 pb-6 mb-8">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-white">FinSight</h1>
            <p className="text-neutral-400 mt-1">Market Dashboard & AI Tracker</p>
          </div>
          
          {/* Add Stock Form */}
          <form onSubmit={addStock} className="flex gap-2">
            <input
              type="text"
              placeholder="Enter Ticker (e.g. AAPL)"
              value={tickerInput}
              onChange={(e) => setTickerInput(e.target.value.toUpperCase())}
              className="px-4 py-2 bg-neutral-900 border border-neutral-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-white placeholder-neutral-500 uppercase"
            />
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-md transition-colors disabled:opacity-50"
            >
              {loading ? "Adding..." : "Add Asset"}
            </button>
          </form>
        </header>

        {/* Dashboard Grid */}
        <main>
          {portfolio.length === 0 ? (
            <div className="text-center py-20 border-2 border-dashed border-neutral-800 rounded-xl text-neutral-500">
              No assets tracked yet. Add a ticker symbol above!
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {portfolio.map((stock, index) => (
                <div key={index} className="bg-neutral-900 border border-neutral-800 p-6 rounded-xl shadow-sm hover:border-neutral-700 transition-colors">
                  <div className="flex justify-between items-start mb-4">
                    <h2 className="text-xl font-bold text-white">{stock.ticker}</h2>
                    <span className="px-2.5 py-1 bg-neutral-800 text-xs font-medium text-neutral-300 rounded-full">
                      Equity
                    </span>
                  </div>
                  <div className="mt-2">
                    <p className="text-sm text-neutral-400 mb-1">Current Price</p>
                    <p className="text-3xl font-light text-white">
                      ${stock.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                  </div>
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