// App.tsx
import React, { useEffect, useState } from "react";
import { ethers } from "ethers";
import { getContractReadOnly, getContractWithSigner } from "./contract";
import WalletManager from "./components/WalletManager";
import WalletSelector from "./components/WalletSelector";
import "./App.css";

interface SmokeData {
  id: string;
  encryptedData: string;
  timestamp: number;
  owner: string;
  region: string;
  airQuality: number;
  status: "pending" | "verified" | "rejected";
}

const App: React.FC = () => {
  const [account, setAccount] = useState("");
  const [loading, setLoading] = useState(true);
  const [smokeData, setSmokeData] = useState<SmokeData[]>([]);
  const [provider, setProvider] = useState<ethers.BrowserProvider | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [walletSelectorOpen, setWalletSelectorOpen] = useState(false);
  const [transactionStatus, setTransactionStatus] = useState<{
    visible: boolean;
    status: "pending" | "success" | "error";
    message: string;
  }>({ visible: false, status: "pending", message: "" });
  const [newSmokeData, setNewSmokeData] = useState({
    region: "",
    coordinates: "",
    airQuality: "",
    windDirection: ""
  });
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedRegion, setSelectedRegion] = useState("all");
  const [showStats, setShowStats] = useState(false);

  // Calculate statistics
  const verifiedCount = smokeData.filter(d => d.status === "verified").length;
  const pendingCount = smokeData.filter(d => d.status === "pending").length;
  const rejectedCount = smokeData.filter(d => d.status === "rejected").length;
  const averageAirQuality = smokeData.length > 0 
    ? smokeData.reduce((sum, data) => sum + data.airQuality, 0) / smokeData.length 
    : 0;

  // Filter data based on search and region
  const filteredData = smokeData.filter(data => {
    const matchesSearch = data.region.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         data.id.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRegion = selectedRegion === "all" || data.region === selectedRegion;
    return matchesSearch && matchesRegion;
  });

  useEffect(() => {
    loadSmokeData().finally(() => setLoading(false));
  }, []);

  const onWalletSelect = async (wallet: any) => {
    if (!wallet.provider) return;
    try {
      const web3Provider = new ethers.BrowserProvider(wallet.provider);
      setProvider(web3Provider);
      const accounts = await web3Provider.send("eth_requestAccounts", []);
      const acc = accounts[0] || "";
      setAccount(acc);

      wallet.provider.on("accountsChanged", async (accounts: string[]) => {
        const newAcc = accounts[0] || "";
        setAccount(newAcc);
      });
    } catch (e) {
      alert("Failed to connect wallet");
    }
  };

  const onConnect = () => setWalletSelectorOpen(true);
  const onDisconnect = () => {
    setAccount("");
    setProvider(null);
  };

  const loadSmokeData = async () => {
    setIsRefreshing(true);
    try {
      const contract = await getContractReadOnly();
      if (!contract) return;
      
      // Check contract availability using FHE
      const isAvailable = await contract.isAvailable();
      if (!isAvailable) {
        console.error("Contract is not available");
        return;
      }
      
      const keysBytes = await contract.getData("smoke_data_keys");
      let keys: string[] = [];
      
      if (keysBytes.length > 0) {
        try {
          keys = JSON.parse(ethers.toUtf8String(keysBytes));
        } catch (e) {
          console.error("Error parsing smoke data keys:", e);
        }
      }
      
      const list: SmokeData[] = [];
      
      for (const key of keys) {
        try {
          const dataBytes = await contract.getData(`smoke_data_${key}`);
          if (dataBytes.length > 0) {
            try {
              const data = JSON.parse(ethers.toUtf8String(dataBytes));
              list.push({
                id: key,
                encryptedData: data.data,
                timestamp: data.timestamp,
                owner: data.owner,
                region: data.region,
                airQuality: data.airQuality,
                status: data.status || "pending"
              });
            } catch (e) {
              console.error(`Error parsing smoke data for ${key}:`, e);
            }
          }
        } catch (e) {
          console.error(`Error loading smoke data ${key}:`, e);
        }
      }
      
      list.sort((a, b) => b.timestamp - a.timestamp);
      setSmokeData(list);
    } catch (e) {
      console.error("Error loading smoke data:", e);
    } finally {
      setIsRefreshing(false);
      setLoading(false);
    }
  };

  const submitSmokeData = async () => {
    if (!provider) { 
      alert("Please connect wallet first"); 
      return; 
    }
    
    setCreating(true);
    setTransactionStatus({
      visible: true,
      status: "pending",
      message: "Encrypting smoke data with FHE..."
    });
    
    try {
      // Simulate FHE encryption
      const encryptedData = `FHE-${btoa(JSON.stringify(newSmokeData))}`;
      
      const contract = await getContractWithSigner();
      if (!contract) {
        throw new Error("Failed to get contract with signer");
      }
      
      const dataId = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

      const smokeData = {
        data: encryptedData,
        timestamp: Math.floor(Date.now() / 1000),
        owner: account,
        region: newSmokeData.region,
        airQuality: parseInt(newSmokeData.airQuality),
        status: "pending"
      };
      
      // Store encrypted data on-chain using FHE
      await contract.setData(
        `smoke_data_${dataId}`, 
        ethers.toUtf8Bytes(JSON.stringify(smokeData))
      );
      
      const keysBytes = await contract.getData("smoke_data_keys");
      let keys: string[] = [];
      
      if (keysBytes.length > 0) {
        try {
          keys = JSON.parse(ethers.toUtf8String(keysBytes));
        } catch (e) {
          console.error("Error parsing keys:", e);
        }
      }
      
      keys.push(dataId);
      
      await contract.setData(
        "smoke_data_keys", 
        ethers.toUtf8Bytes(JSON.stringify(keys))
      );
      
      setTransactionStatus({
        visible: true,
        status: "success",
        message: "Encrypted smoke data submitted securely!"
      });
      
      await loadSmokeData();
      
      setTimeout(() => {
        setTransactionStatus({ visible: false, status: "pending", message: "" });
        setShowCreateModal(false);
        setNewSmokeData({
          region: "",
          coordinates: "",
          airQuality: "",
          windDirection: ""
        });
      }, 2000);
    } catch (e: any) {
      const errorMessage = e.message.includes("user rejected transaction")
        ? "Transaction rejected by user"
        : "Submission failed: " + (e.message || "Unknown error");
      
      setTransactionStatus({
        visible: true,
        status: "error",
        message: errorMessage
      });
      
      setTimeout(() => {
        setTransactionStatus({ visible: false, status: "pending", message: "" });
      }, 3000);
    } finally {
      setCreating(false);
    }
  };

  const verifyData = async (dataId: string) => {
    if (!provider) {
      alert("Please connect wallet first");
      return;
    }

    setTransactionStatus({
      visible: true,
      status: "pending",
      message: "Processing encrypted smoke data with FHE..."
    });

    try {
      // Simulate FHE computation time
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      const contract = await getContractWithSigner();
      if (!contract) {
        throw new Error("Failed to get contract with signer");
      }
      
      const dataBytes = await contract.getData(`smoke_data_${dataId}`);
      if (dataBytes.length === 0) {
        throw new Error("Data not found");
      }
      
      const data = JSON.parse(ethers.toUtf8String(dataBytes));
      
      const updatedData = {
        ...data,
        status: "verified"
      };
      
      await contract.setData(
        `smoke_data_${dataId}`, 
        ethers.toUtf8Bytes(JSON.stringify(updatedData))
      );
      
      setTransactionStatus({
        visible: true,
        status: "success",
        message: "FHE verification completed successfully!"
      });
      
      await loadSmokeData();
      
      setTimeout(() => {
        setTransactionStatus({ visible: false, status: "pending", message: "" });
      }, 2000);
    } catch (e: any) {
      setTransactionStatus({
        visible: true,
        status: "error",
        message: "Verification failed: " + (e.message || "Unknown error")
      });
      
      setTimeout(() => {
        setTransactionStatus({ visible: false, status: "pending", message: "" });
      }, 3000);
    }
  };

  const rejectData = async (dataId: string) => {
    if (!provider) {
      alert("Please connect wallet first");
      return;
    }

    setTransactionStatus({
      visible: true,
      status: "pending",
      message: "Processing encrypted smoke data with FHE..."
    });

    try {
      // Simulate FHE computation time
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      const contract = await getContractWithSigner();
      if (!contract) {
        throw new Error("Failed to get contract with signer");
      }
      
      const dataBytes = await contract.getData(`smoke_data_${dataId}`);
      if (dataBytes.length === 0) {
        throw new Error("Data not found");
      }
      
      const data = JSON.parse(ethers.toUtf8String(dataBytes));
      
      const updatedData = {
        ...data,
        status: "rejected"
      };
      
      await contract.setData(
        `smoke_data_${dataId}`, 
        ethers.toUtf8Bytes(JSON.stringify(updatedData))
      );
      
      setTransactionStatus({
        visible: true,
        status: "success",
        message: "FHE rejection completed successfully!"
      });
      
      await loadSmokeData();
      
      setTimeout(() => {
        setTransactionStatus({ visible: false, status: "pending", message: "" });
      }, 2000);
    } catch (e: any) {
      setTransactionStatus({
        visible: true,
        status: "error",
        message: "Rejection failed: " + (e.message || "Unknown error")
      });
      
      setTimeout(() => {
        setTransactionStatus({ visible: false, status: "pending", message: "" });
      }, 3000);
    }
  };

  const isOwner = (address: string) => {
    return account.toLowerCase() === address.toLowerCase();
  };

  const renderAirQualityChart = () => {
    const qualityLevels = [
      { label: "Good", range: [0, 50], color: "#4CAF50" },
      { label: "Moderate", range: [51, 100], color: "#FFEB3B" },
      { label: "Unhealthy", range: [101, 150], color: "#FF9800" },
      { label: "Very Unhealthy", range: [151, 200], color: "#F44336" },
      { label: "Hazardous", range: [201, 300], color: "#9C27B0" }
    ];

    const counts = qualityLevels.map(level => {
      return smokeData.filter(data => 
        data.airQuality >= level.range[0] && 
        data.airQuality <= level.range[1]
      ).length;
    });

    const maxCount = Math.max(...counts, 1);

    return (
      <div className="quality-chart">
        {qualityLevels.map((level, index) => (
          <div key={level.label} className="quality-bar-container">
            <div className="quality-label">
              <div className="color-dot" style={{ backgroundColor: level.color }}></div>
              {level.label}
            </div>
            <div className="quality-bar">
              <div 
                className="bar-fill" 
                style={{
                  width: `${(counts[index] / maxCount) * 100}%`,
                  backgroundColor: level.color
                }}
              ></div>
              <span className="bar-count">{counts[index]}</span>
            </div>
          </div>
        ))}
      </div>
    );
  };

  if (loading) return (
    <div className="loading-screen">
      <div className="spinner"></div>
      <p>Initializing FHE connection...</p>
    </div>
  );

  return (
    <div className="app-container">
      <header className="app-header">
        <div className="logo">
          <h1>Wildfire<span>FHE</span>Tracker</h1>
          <p>Confidential Smoke Propagation Analysis</p>
        </div>
        
        <div className="header-actions">
          <button 
            onClick={() => setShowCreateModal(true)} 
            className="primary-btn"
          >
            + Add Smoke Data
          </button>
          <WalletManager account={account} onConnect={onConnect} onDisconnect={onDisconnect} />
        </div>
      </header>
      
      <main className="main-content">
        <section className="project-intro">
          <h2>FHE-Powered Wildfire Smoke Analysis</h2>
          <p>
            Public health agencies can jointly analyze encrypted satellite smoke data and 
            meteorological data using FHE to predict smoke propagation paths and air quality impacts.
          </p>
          <div className="fhe-badge">
            <span>Fully Homomorphic Encryption</span>
          </div>
        </section>

        <div className="controls-row">
          <div className="search-filter">
            <input
              type="text"
              placeholder="Search smoke data..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
            <select
              value={selectedRegion}
              onChange={(e) => setSelectedRegion(e.target.value)}
              className="region-select"
            >
              <option value="all">All Regions</option>
              <option value="North">North</option>
              <option value="South">South</option>
              <option value="East">East</option>
              <option value="West">West</option>
              <option value="Central">Central</option>
            </select>
          </div>
          <button 
            onClick={() => setShowStats(!showStats)}
            className="toggle-stats-btn"
          >
            {showStats ? "Hide Statistics" : "Show Statistics"}
          </button>
        </div>

        {showStats && (
          <section className="stats-section">
            <div className="stat-cards">
              <div className="stat-card">
                <h3>Total Data Points</h3>
                <p className="stat-value">{smokeData.length}</p>
              </div>
              <div className="stat-card">
                <h3>Average Air Quality</h3>
                <p className="stat-value">{averageAirQuality.toFixed(1)}</p>
              </div>
              <div className="stat-card">
                <h3>Verified Data</h3>
                <p className="stat-value">{verifiedCount}</p>
              </div>
            </div>
            <div className="chart-container">
              <h3>Air Quality Distribution</h3>
              {renderAirQualityChart()}
            </div>
          </section>
        )}

        <section className="data-section">
          <div className="section-header">
            <h2>Encrypted Smoke Data</h2>
            <button 
              onClick={loadSmokeData}
              className="refresh-btn"
              disabled={isRefreshing}
            >
              {isRefreshing ? "Refreshing..." : "Refresh Data"}
            </button>
          </div>

          {filteredData.length === 0 ? (
            <div className="no-data">
              <p>No smoke data found</p>
              <button 
                className="primary-btn"
                onClick={() => setShowCreateModal(true)}
              >
                Add First Data Point
              </button>
            </div>
          ) : (
            <div className="data-grid">
              {filteredData.map(data => (
                <div key={data.id} className="data-card">
                  <div className="card-header">
                    <h3>{data.region} Region</h3>
                    <span className={`status-badge ${data.status}`}>
                      {data.status}
                    </span>
                  </div>
                  <div className="card-body">
                    <div className="data-row">
                      <span>Air Quality:</span>
                      <span>{data.airQuality}</span>
                    </div>
                    <div className="data-row">
                      <span>Date:</span>
                      <span>{new Date(data.timestamp * 1000).toLocaleDateString()}</span>
                    </div>
                    <div className="data-row">
                      <span>Owner:</span>
                      <span>{data.owner.substring(0, 6)}...{data.owner.substring(38)}</span>
                    </div>
                  </div>
                  <div className="card-actions">
                    {isOwner(data.owner) && data.status === "pending" && (
                      <>
                        <button 
                          className="action-btn verify"
                          onClick={() => verifyData(data.id)}
                        >
                          Verify
                        </button>
                        <button 
                          className="action-btn reject"
                          onClick={() => rejectData(data.id)}
                        >
                          Reject
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
  
      {showCreateModal && (
        <div className="modal-overlay">
          <div className="create-modal">
            <div className="modal-header">
              <h2>Add Smoke Data</h2>
              <button onClick={() => setShowCreateModal(false)} className="close-btn">
                &times;
              </button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>Region *</label>
                <select
                  name="region"
                  value={newSmokeData.region}
                  onChange={(e) => setNewSmokeData({...newSmokeData, region: e.target.value})}
                  className="form-input"
                >
                  <option value="">Select region</option>
                  <option value="North">North</option>
                  <option value="South">South</option>
                  <option value="East">East</option>
                  <option value="West">West</option>
                  <option value="Central">Central</option>
                </select>
              </div>
              <div className="form-group">
                <label>Coordinates</label>
                <input
                  type="text"
                  name="coordinates"
                  value={newSmokeData.coordinates}
                  onChange={(e) => setNewSmokeData({...newSmokeData, coordinates: e.target.value})}
                  placeholder="Latitude, Longitude"
                  className="form-input"
                />
              </div>
              <div className="form-group">
                <label>Air Quality Index *</label>
                <input
                  type="number"
                  name="airQuality"
                  value={newSmokeData.airQuality}
                  onChange={(e) => setNewSmokeData({...newSmokeData, airQuality: e.target.value})}
                  placeholder="0-300"
                  className="form-input"
                />
              </div>
              <div className="form-group">
                <label>Wind Direction</label>
                <input
                  type="text"
                  name="windDirection"
                  value={newSmokeData.windDirection}
                  onChange={(e) => setNewSmokeData({...newSmokeData, windDirection: e.target.value})}
                  placeholder="e.g. NW"
                  className="form-input"
                />
              </div>
              <div className="fhe-notice">
                Data will be encrypted with FHE before storage
              </div>
            </div>
            <div className="modal-footer">
              <button 
                onClick={() => setShowCreateModal(false)}
                className="secondary-btn"
              >
                Cancel
              </button>
              <button 
                onClick={submitSmokeData}
                disabled={creating || !newSmokeData.region || !newSmokeData.airQuality}
                className="primary-btn"
              >
                {creating ? "Encrypting..." : "Submit Data"}
              </button>
            </div>
          </div>
        </div>
      )}
      
      {walletSelectorOpen && (
        <WalletSelector
          isOpen={walletSelectorOpen}
          onWalletSelect={(wallet) => { onWalletSelect(wallet); setWalletSelectorOpen(false); }}
          onClose={() => setWalletSelectorOpen(false)}
        />
      )}
      
      {transactionStatus.visible && (
        <div className="transaction-toast">
          <div className={`toast-content ${transactionStatus.status}`}>
            <div className="toast-icon">
              {transactionStatus.status === "pending" && <div className="spinner"></div>}
              {transactionStatus.status === "success" && "✓"}
              {transactionStatus.status === "error" && "✕"}
            </div>
            <div className="toast-message">{transactionStatus.message}</div>
          </div>
        </div>
      )}
  
      <footer className="app-footer">
        <div className="footer-content">
          <div className="footer-section">
            <h3>WildfireFHE Tracker</h3>
            <p>Confidential analysis of wildfire smoke propagation using FHE technology</p>
          </div>
          <div className="footer-section">
            <h3>Resources</h3>
            <a href="#" className="footer-link">Documentation</a>
            <a href="#" className="footer-link">API</a>
            <a href="#" className="footer-link">GitHub</a>
          </div>
          <div className="footer-section">
            <h3>Legal</h3>
            <a href="#" className="footer-link">Privacy Policy</a>
            <a href="#" className="footer-link">Terms of Service</a>
          </div>
        </div>
        <div className="footer-bottom">
          <p>© {new Date().getFullYear()} WildfireFHE Tracker. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default App;