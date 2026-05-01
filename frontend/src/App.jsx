import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import TokenRing from "./components/TokenRing";
import Replication from "./components/Replication";
import FailureSimulator from "./components/FailureSimulator";
import Partitionnement from "./components/Partitionnement";
import WritePath from "./components/WritePath";
import "./index.css"; // Assurez-vous d'importer le CSS

const API = "http://127.0.0.1:8000";

const TABS = [
  { id: "partitionnement", label: "1. Partitionnement" },
  { id: "ring", label: "2. Token Ring" },
  { id: "replication", label: "3. Réplication" },
  { id: "failure", label: "4. Pannes & Quorum" },
  { id: "writepath", label: "5. Parcours d'Écriture" },
];

export default function App() {
  const [tab, setTab] = useState("partitionnement");

  // Données cluster
  const [nodes, setNodes] = useState([]);
  const [nodesWithTokens, setNodesWithTokens] = useState([]);
  const [allData, setAllData] = useState([]);
  const [backendStatus, setBackendStatus] = useState("loading");

  // État Global : La "Donnée" fil conducteur
  const [selectedUser, setSelectedUser] = useState(null);
  
  // Paramètres Globaux du Cluster
  const [strategy, setStrategy] = useState("simple");
  const [rf, setRf] = useState(3);
  const [consistency, setConsistency] = useState("QUORUM");

  // Formulaire d'insertion (global)
  const [userId, setUserId] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [insertLoading, setInsertLoading] = useState(false);

  // État Global pour les Pannes et l'Animation
  const [downNodes, setDownNodes] = useState(new Set());
  const [autoPlayId, setAutoPlayId] = useState(0);

  // Polling du backend
  const fetchCluster = useCallback(async () => {
    try {
      const [nodesRes, tokensRes, dataRes] = await Promise.all([
        axios.get(`${API}/cluster/nodes`),
        axios.get(`${API}/cluster/tokens`),
        axios.get(`${API}/data/all`),
      ]);
      setNodes(nodesRes.data.nodes);
      setNodesWithTokens(tokensRes.data.nodes);
      
      const newAllData = dataRes.data.users;
      setAllData(newAllData);
      
      if (!selectedUser && newAllData.length > 0) {
        setSelectedUser(newAllData[newAllData.length - 1]);
      }

      setBackendStatus("ok");
    } catch (e) {
      setBackendStatus("error");
      setNodes([]);
      setNodesWithTokens([]);
    }
  }, [selectedUser]);

  useEffect(() => {
    fetchCluster();
    const interval = setInterval(fetchCluster, 10000);
    return () => clearInterval(interval);
  }, [fetchCluster]);

  // Réinitialiser les nœuds en panne si le nombre de nœuds change
  useEffect(() => {
    setDownNodes(new Set());
  }, [nodes.length]);

  const insertUser = async () => {
    if (!userId || !name) return; // Removed email from requirement as it's not strictly necessary for the demo, or we can provide a default
    const currentEmail = email || `${userId}@example.com`;
    setInsertLoading(true);
    try {
      const res = await axios.post(
        `${API}/data/insert?user_id=${userId}&name=${name}&email=${currentEmail}`
      );
      const newUser = {
        user_id: res.data.user_id,
        token: res.data.token,
        name, 
        email: currentEmail
      };
      setAllData(prev => [...prev.filter(d => d.user_id !== newUser.user_id), newUser]);
      setSelectedUser(newUser);
      setUserId(""); setName(""); setEmail("");
      
      // Auto-trigger animation
      setTab("writepath");
      setAutoPlayId(prev => prev + 1);
    } catch(e) {
      console.error("Erreur insertion", e);
    }
    setInsertLoading(false);
  };

  const statusBadge = {
    loading: { class: "badge-warning", text: "Connexion..." },
    ok: { class: "badge-success", text: `${nodes.length} Nœuds Actifs` },
    error: { class: "badge-error", text: "Hors ligne" }
  }[backendStatus];

  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column", overflow: "hidden" }}>

      {/* Header Premium */}
      <header style={{ 
        background: "var(--bg-surface)", 
        padding: "1rem 2rem", 
        borderBottom: "1px solid var(--border-light)",
        display: "flex", 
        justifyContent: "space-between", 
        alignItems: "center",
        boxShadow: "var(--shadow-sm)",
        zIndex: 20
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "1.5rem" }}>
          <h1 style={{ margin: 0, fontSize: "1.5rem", fontWeight: 700, color: "var(--text-primary)", letterSpacing: "-0.5px" }}>
            <span style={{ color: "var(--primary-color)" }}>Sim</span>Cassandra
          </h1>
          <div style={{ display: "flex", alignItems: "center", gap: "0.8rem" }}>
            <span className={`badge ${statusBadge.class}`}>{statusBadge.text}</span>
            <button className="btn btn-outline" style={{ padding: "0.25rem 0.75rem", fontSize: "12px" }} onClick={fetchCluster}>
              ↺ Refresh
            </button>
          </div>
        </div>

        {/* Global Settings */}
        <div style={{ display: "flex", gap: "1.5rem", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)" }}>Replication (RF)</label>
            <input 
              type="number" min={1} max={6} 
              value={rf} 
              onChange={e => setRf(Number(e.target.value))} 
              className="input-field"
              style={{ width: 60, padding: "0.4rem", textAlign: "center" }} 
            />
          </div>
          <div style={{ width: "1px", height: "24px", background: "var(--border-light)" }}></div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)" }}>Consistency</label>
            <select 
              value={consistency} 
              onChange={e => setConsistency(e.target.value)} 
              className="input-field"
              style={{ padding: "0.4rem 2rem 0.4rem 0.8rem", width: "auto", cursor: "pointer" }}
            >
              <option value="ONE">ONE</option>
              <option value="QUORUM">QUORUM</option>
              <option value="ALL">ALL</option>
            </select>
          </div>
        </div>
      </header>

      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
        {/* Sidebar : Données */}
        <aside style={{ 
          width: 320, 
          background: "var(--bg-sidebar)", 
          borderRight: "1px solid var(--border-light)", 
          display: "flex", 
          flexDirection: "column", 
          zIndex: 10
        }}>
          
          {/* Formulaire d'insertion */}
          <div style={{ padding: "1.5rem", borderBottom: "1px solid var(--border-light)", background: "var(--bg-app)" }}>
            <h3 style={{ margin: "0 0 1rem", fontSize: 14, fontWeight: 600, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.5px" }}>
              Injecter de la donnée
            </h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.8rem" }}>
              <input className="input-field" placeholder="Clé primaire (ex: user_123)" value={userId} onChange={e => setUserId(e.target.value)} />
              <input className="input-field" placeholder="Nom de l'utilisateur" value={name} onChange={e => setName(e.target.value)} />
              <button 
                className="btn btn-primary" 
                onClick={insertUser} 
                disabled={insertLoading || backendStatus !== "ok" || !userId || !name}
                style={{ marginTop: "0.5rem", width: "100%" }}
              >
                {insertLoading ? "Écriture..." : "Insérer dans Cassandra"}
              </button>
            </div>
          </div>

          {/* Liste des données */}
          <div style={{ padding: "1.5rem", flex: 1, overflowY: "auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
              <h3 style={{ margin: 0, fontSize: 14, fontWeight: 600, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                Base de données
              </h3>
              <span className="badge badge-neutral">{allData.length} lignes</span>
            </div>
            
            {allData.length === 0 ? (
              <div style={{ textAlign: "center", padding: "2rem 0", color: "var(--text-tertiary)" }}>
                <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>📭</div>
                <div style={{ fontSize: 13 }}>La table est vide</div>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                {allData.map(d => {
                  const isSelected = selectedUser?.user_id === d.user_id;
                  return (
                    <div 
                      key={d.user_id} 
                      onClick={() => setSelectedUser(d)} 
                      className="card card-interactive"
                      style={{
                        padding: "1rem", 
                        cursor: "pointer",
                        background: isSelected ? "var(--primary-light)" : "var(--bg-surface)",
                        borderColor: isSelected ? "var(--primary-color)" : "var(--border-light)",
                        boxShadow: isSelected ? "0 4px 12px rgba(59, 130, 246, 0.15)" : "var(--shadow-sm)",
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                        <div>
                          <div style={{ fontWeight: 600, color: isSelected ? "var(--primary-hover)" : "var(--text-primary)", fontSize: 14 }}>{d.user_id}</div>
                          <div style={{ fontSize: 13, color: "var(--text-secondary)", marginTop: 2 }}>{d.name}</div>
                        </div>
                        {isSelected && <span style={{ color: "var(--primary-color)", fontSize: 18 }}>•</span>}
                      </div>
                      <div style={{ fontSize: 11, color: "var(--text-tertiary)", marginTop: 8, fontFamily: "monospace", background: isSelected ? "rgba(255,255,255,0.6)" : "var(--bg-app)", padding: "4px 6px", borderRadius: 4, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        Token: {d.token}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </aside>

        {/* Main Content Area */}
        <main style={{ flex: 1, display: "flex", flexDirection: "column", overflowY: "auto", position: "relative" }}>
          
          {/* Tabs Navigation */}
          <div style={{ 
            display: "flex", gap: "0.5rem", padding: "1rem 2rem 0", 
            background: "var(--bg-surface)", borderBottom: "1px solid var(--border-light)", 
            position: "sticky", top: 0, zIndex: 10 
          }}>
            {TABS.map(t => (
              <button 
                key={t.id} 
                onClick={() => setTab(t.id)} 
                className={`tab-btn ${tab === t.id ? "active" : ""}`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div style={{ padding: "2rem", maxWidth: 1100, margin: "0 auto", width: "100%" }}>
            
            {!selectedUser ? (
              <div className="card" style={{ textAlign: "center", padding: "4rem 2rem", borderStyle: "dashed", borderColor: "var(--text-tertiary)" }}>
                <div style={{ fontSize: "3rem", marginBottom: "1.5rem" }}>👈</div>
                <h2 style={{ color: "var(--text-primary)", marginBottom: "0.5rem", fontSize: "1.5rem" }}>Sélectionne une donnée pour l'analyser</h2>
                <p style={{ color: "var(--text-secondary)", maxWidth: 500, margin: "0 auto", lineHeight: 1.6 }}>
                  SimCassandra trace le parcours complet d'une donnée. Choisis une clé primaire dans la barre latérale pour voir comment elle est hachée, répartie sur l'anneau, répliquée, et comment elle survit aux pannes.
                </p>
              </div>
            ) : (
              <>
                {/* Fil conducteur Info Banner */}
                <div className="card" style={{ 
                  background: "var(--primary-light)", 
                  borderColor: "rgba(59, 130, 246, 0.2)",
                  borderLeft: "4px solid var(--primary-color)", 
                  padding: "1rem 1.5rem", 
                  marginBottom: "2rem", 
                  display: "flex", 
                  justifyContent: "space-between", 
                  alignItems: "center",
                  borderRadius: "var(--radius-md)"
                }}>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: "var(--primary-hover)", textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>
                      Sujet d'analyse
                    </div>
                    <div style={{ fontSize: 16, color: "var(--text-primary)" }}>
                      Parcours de la clé : <strong style={{ color: "var(--primary-color)" }}>{selectedUser.user_id}</strong>
                    </div>
                  </div>
                  <div style={{ background: "var(--bg-surface)", padding: "0.5rem 1rem", borderRadius: "var(--radius-md)", fontSize: 12, border: "1px solid var(--border-light)", fontFamily: "monospace", color: "var(--text-secondary)", boxShadow: "var(--shadow-sm)" }}>
                    Token Murmur3 : <strong>{selectedUser.token}</strong>
                  </div>
                </div>

                {tab === "partitionnement" && (
                  <Partitionnement nodes={nodes} nodesWithTokens={nodesWithTokens} selectedUser={selectedUser} allData={allData} />
                )}

                {tab === "ring" && (
                  <div className="card" style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "3rem" }}>
                    <div style={{ width: "100%", maxWidth: 600 }}>
                      <h2 style={{ margin: "0 0 0.5rem", color: "var(--text-primary)", fontSize: "1.5rem" }}>Où atterrit le token ?</h2>
                      <p style={{ margin: "0 0 2rem", color: "var(--text-secondary)", fontSize: 15, lineHeight: 1.6 }}>
                        Cassandra utilise le hachage cohérent (Consistent Hashing). Le hash de la clé <strong>{selectedUser.user_id}</strong> a généré un token. Le nœud responsable est celui dont la plage englobe ce token.
                      </p>
                    </div>
                    <TokenRing nodes={nodes} nodesWithTokens={nodesWithTokens} highlightToken={selectedUser.token} />
                  </div>
                )}

                {tab === "replication" && (
                  <Replication nodes={nodes} nodesWithTokens={nodesWithTokens} selectedUser={selectedUser} rf={rf} strategy={strategy} />
                )}

                {tab === "failure" && (
                  <FailureSimulator 
                    nodes={nodes} 
                    nodesWithTokens={nodesWithTokens} 
                    selectedUser={selectedUser} 
                    rf={rf} 
                    strategy={strategy} 
                    consistency={consistency} 
                    downNodes={downNodes}
                    setDownNodes={setDownNodes}
                  />
                )}

                {tab === "writepath" && (
                  <WritePath 
                    selectedUser={selectedUser} 
                    nodes={nodes} 
                    nodesWithTokens={nodesWithTokens} 
                    rf={rf} 
                    consistency={consistency} 
                    autoPlayId={autoPlayId}
                    downNodes={downNodes}
                  />
                )}
              </>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}