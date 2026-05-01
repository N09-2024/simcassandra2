import { useState, useEffect } from "react";

export default function FailureSimulator({ nodes, nodesWithTokens, selectedUser, rf, strategy, consistency, downNodes, setDownNodes }) {
  const totalNodes = nodes.length;

  let primaryNodeIdx = 0;
  if (selectedUser && nodesWithTokens.length > 0) {
    const allTokens = [];
    nodesWithTokens.forEach((node, nodeIdx) => {
      (node.tokens || []).forEach(tok => {
        allTokens.push({ token: tok, nodeIdx });
      });
    });
    allTokens.sort((a, b) => {
      const ta = BigInt(a.token), tb = BigInt(b.token);
      return ta < tb ? -1 : ta > tb ? 1 : 0;
    });

    const ht = BigInt(selectedUser.token);
    for (let i = 0; i < allTokens.length; i++) {
      if (ht <= BigInt(allTokens[i].token)) {
        primaryNodeIdx = allTokens[i].nodeIdx;
        break;
      }
    }
    if (primaryNodeIdx === 0 && allTokens.length > 0 && ht > BigInt(allTokens[allTokens.length - 1].token)) {
      primaryNodeIdx = allTokens[0].nodeIdx;
    }
  }

  const actualRf = Math.min(rf, totalNodes || 1);
  const replicaIdxs = [];
  if (strategy === "simple" && totalNodes > 1) {
    for (let i = 1; i < actualRf; i++) {
      replicaIdxs.push((primaryNodeIdx + i) % totalNodes);
    }
  }
  const nodesHoldingData = [primaryNodeIdx, ...replicaIdxs];

  let replicasUp = 0;
  nodesHoldingData.forEach(idx => {
    const n = nodes[idx];
    const isSimDown = downNodes.has(n.address);
    const isReallyDown = !n.is_up;
    if (!isSimDown && !isReallyDown) {
      replicasUp++;
    }
  });

  const needed = consistency === "ONE" ? 1 : consistency === "ALL" ? actualRf : Math.floor(actualRf / 2) + 1;
  const canRespond = replicasUp >= needed;

  const toggle = (id) => {
    const s = new Set(downNodes);
    s.has(id) ? s.delete(id) : s.add(id);
    setDownNodes(s);
  };

  return (
    <div>
      <div className="card" style={{ marginBottom: "2rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.5rem" }}>
          <div>
            <h2 style={{ margin: "0 0 0.5rem", color: "var(--text-primary)", fontSize: "1.5rem" }}>Simulation de Pannes</h2>
            <p style={{ margin: 0, color: "var(--text-secondary)", fontSize: "15px", lineHeight: 1.6, maxWidth: 800 }}>
              Clique sur les nœuds pour simuler une panne. Cassandra n'interroge <strong>que les nœuds qui possèdent "{selectedUser.user_id}"</strong>. Observe en temps réel si ton paramétrage de Consistency permet de survivre à ces pannes.
            </p>
          </div>
          <button onClick={() => setDownNodes(new Set())} className="btn btn-outline" style={{ display: "flex", gap: "0.5rem" }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
            Réinitialiser
          </button>
        </div>

        {/* Tableau de bord statuts */}
        <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", marginBottom: "2.5rem", background: "var(--bg-app)", padding: "1rem", borderRadius: "var(--radius-md)", border: "1px solid var(--border-light)" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.2rem" }}>
            <span style={{ fontSize: 11, color: "var(--text-tertiary)", fontWeight: 600, textTransform: "uppercase" }}>Replication</span>
            <span className="badge badge-neutral" style={{ fontSize: 14 }}>RF = {actualRf}</span>
          </div>
          <div style={{ width: "1px", background: "var(--border-light)", margin: "0 0.5rem" }}></div>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.2rem" }}>
            <span style={{ fontSize: 11, color: "var(--text-tertiary)", fontWeight: 600, textTransform: "uppercase" }}>Consistance</span>
            <span className="badge badge-neutral" style={{ fontSize: 14 }}>{consistency}</span>
          </div>
          <div style={{ width: "1px", background: "var(--border-light)", margin: "0 0.5rem" }}></div>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.2rem" }}>
            <span style={{ fontSize: 11, color: "var(--text-tertiary)", fontWeight: 600, textTransform: "uppercase" }}>Réplicas En Ligne</span>
            <span className={`badge ${replicasUp >= needed ? 'badge-success' : 'badge-error'}`} style={{ fontSize: 14 }}>
              {replicasUp} / {needed} requis
            </span>
          </div>
        </div>

        {/* Nœuds interactifs */}
        <div style={{ display: "flex", gap: "1.5rem", flexWrap: "wrap", marginBottom: "2.5rem", justifyContent: "center" }}>
          {nodes.map((n, i) => {
            const isPrimary = i === primaryNodeIdx;
            const isReplica = replicaIdxs.includes(i);
            const hasData = isPrimary || isReplica;
            const nodeColor = `var(--node-${i % 5})`;
            
            const isSimDown = downNodes.has(n.address);
            const isReallyDown = !n.is_up;
            const isDown = isSimDown || isReallyDown;

            return (
              <div key={n.address} onClick={() => !isReallyDown && toggle(n.address)} className="card-interactive" style={{
                width: 160, padding: "1.5rem 1rem", borderRadius: "var(--radius-lg)", textAlign: "center",
                cursor: isReallyDown ? "not-allowed" : "pointer", userSelect: "none",
                background: isDown ? "var(--error-bg)" : hasData ? "var(--bg-surface)" : "var(--bg-app)",
                border: `2px solid ${isDown ? "var(--error-color)" : hasData ? nodeColor : "var(--border-light)"}`,
                boxShadow: hasData && !isDown ? "var(--shadow-md)" : "none",
                transform: isDown ? "scale(0.95)" : "scale(1)",
                opacity: isDown ? 0.8 : hasData ? 1 : 0.5,
                transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
                position: "relative",
                overflow: "hidden"
              }}>
                {hasData && !isDown && (
                  <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 4, background: nodeColor }}></div>
                )}
                
                <div style={{ fontWeight: 700, fontSize: 18, color: isDown ? "var(--error-color)" : "var(--text-primary)" }}>Nœud {i + 1}</div>
                <div style={{ fontSize: 11, marginTop: 4, color: isDown ? "#b91c1c" : "var(--text-tertiary)", fontFamily: "monospace" }}>{n.address}</div>
                
                <div style={{ marginTop: "1rem" }}>
                  {isReallyDown ? (
                    <span className="badge badge-error">PANNE RÉELLE</span>
                  ) : isSimDown ? (
                    <span className="badge badge-error">PANNE SIMULÉE</span>
                  ) : hasData ? (
                    <span className="badge" style={{ background: `${nodeColor}15`, color: nodeColor, border: `1px solid ${nodeColor}40` }}>
                      {isPrimary ? "⭐ PRIMAIRE" : "🔄 RÉPLIQUE"}
                    </span>
                  ) : (
                    <span className="badge badge-neutral">Sans cette donnée</span>
                  )}
                </div>
                
                {!isReallyDown && (
                  <div style={{ marginTop: "1rem", fontSize: 11, color: isDown ? "var(--error-color)" : "var(--text-tertiary)", textDecoration: "underline", opacity: 0.7 }}>
                    {isDown ? "Remettre en ligne" : "Simuler une panne"}
                  </div>
                )}
              </div>
            );
          })}
        </div>
        
        {/* Résultat final (Alerte) */}
        <div style={{
          borderRadius: "var(--radius-lg)", padding: "1.5rem",
          background: canRespond ? "var(--success-bg)" : "var(--error-bg)",
          border: `1px solid ${canRespond ? "#6ee7b7" : "#fca5a5"}`,
          display: "flex", gap: "1rem", alignItems: "flex-start"
        }}>
          <div style={{ fontSize: "1.5rem" }}>{canRespond ? "✅" : "❌"}</div>
          <div>
            <h3 style={{ margin: "0 0 0.5rem", color: canRespond ? "var(--success-color)" : "var(--error-color)", fontSize: "1.1rem" }}>
              {canRespond ? "SUCCÈS : La requête de lecture/écriture passera" : "ÉCHEC : UnavailableException"}
            </h3>
            <p style={{ margin: 0, color: canRespond ? "#065f46" : "#991b1b", fontSize: 14, lineHeight: 1.5 }}>
              {canRespond 
                ? `Il y a assez de nœuds contenant "${selectedUser.user_id}" en ligne (${replicasUp}) pour satisfaire la cohérence ${consistency} qui en exige ${needed}.`
                : `La requête sera rejetée. Il faut au moins ${needed} nœuds contenant "${selectedUser.user_id}" en ligne, mais seulement ${replicasUp} sont disponibles.`}
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}