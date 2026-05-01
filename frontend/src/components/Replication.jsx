export default function Replication({ nodes, nodesWithTokens, selectedUser, rf, strategy }) {
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

  return (
    <div>
      <div className="card" style={{ marginBottom: "2rem" }}>
        <h2 style={{ margin: "0 0 0.5rem", color: "var(--text-primary)", fontSize: "1.5rem" }}>Réplication</h2>
        <p style={{ margin: "0 0 1.5rem", color: "var(--text-secondary)", fontSize: "15px", lineHeight: 1.6 }}>
          Le <strong>Replication Factor (RF)</strong> détermine combien de copies de la donnée existent dans le cluster. 
          Actuellement fixé à <strong>{rf}</strong> pour la clé <strong style={{ color: "var(--primary-color)" }}>{selectedUser.user_id}</strong>.
          En SimpleStrategy, Cassandra trouve d'abord le nœud primaire, puis place les copies sur les nœuds physiquement suivants sur l'anneau.
        </p>

        {strategy !== "simple" && (
          <div style={{ padding: "1rem 1.5rem", background: "var(--warning-bg)", borderLeft: "4px solid var(--warning-color)", borderRadius: "var(--radius-md)", color: "#92400e", marginBottom: "1.5rem", fontSize: 14 }}>
            La simulation visuelle est actuellement optimisée pour <strong>SimpleStrategy</strong>. NetworkTopologyStrategy n'est pas illustré ici.
          </div>
        )}

        {totalNodes > 0 ? (
          <div>
            <div style={{ display: "flex", gap: "1.5rem", flexWrap: "wrap", justifyContent: "center", marginBottom: "2.5rem" }}>
              {nodes.map((n, i) => {
                const isPrimary = i === primaryNodeIdx;
                const isReplica = replicaIdxs.includes(i);
                const hasData = isPrimary || isReplica;
                const nodeColor = `var(--node-${i % 5})`;

                return (
                  <div key={i} className="card node-card" style={{
                    width: 160, padding: "1.5rem 1rem", textAlign: "center",
                    '--node-color': nodeColor,
                    background: !n.is_up ? "var(--bg-app)" : "var(--bg-surface)",
                    borderColor: !n.is_up ? "var(--border-light)" : hasData ? nodeColor : "var(--border-light)",
                    boxShadow: hasData && n.is_up ? "0 8px 16px -4px rgba(0,0,0,0.1)" : "var(--shadow-sm)",
                    opacity: n.is_up ? 1 : 0.6,
                    transform: hasData && n.is_up ? "translateY(-4px)" : "none"
                  }}>
                    <div style={{ display: "flex", justifyContent: "center", marginBottom: "0.5rem" }}>
                      <div style={{ width: 48, height: 48, borderRadius: "50%", background: hasData && n.is_up ? `${nodeColor}15` : "var(--bg-app)", display: "flex", alignItems: "center", justifyContent: "center", color: hasData && n.is_up ? nodeColor : "var(--text-tertiary)", fontSize: 20, fontWeight: "bold", border: `2px solid ${hasData && n.is_up ? nodeColor : "var(--border-light)"}` }}>
                        N{i+1}
                      </div>
                    </div>
                    <div style={{ fontSize: 12, color: "var(--text-secondary)", fontFamily: "monospace", marginBottom: "1rem" }}>{n.address}</div>
                    
                    {hasData && n.is_up && (
                      <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", alignItems: "center" }}>
                        <span className="badge" style={{ 
                          background: isPrimary ? nodeColor : "var(--bg-surface)", 
                          color: isPrimary ? "white" : nodeColor,
                          border: `1px solid ${nodeColor}`
                        }}>
                          {isPrimary ? "⭐ PRIMAIRE" : "🔄 RÉPLIQUE"}
                        </span>
                        <div style={{ fontSize: 11, color: "var(--text-secondary)", background: "var(--bg-app)", padding: "4px 8px", borderRadius: "4px", width: "100%" }}>
                          Contient {selectedUser.user_id}
                        </div>
                      </div>
                    )}
                    
                    {!hasData && n.is_up && (
                      <div style={{ marginTop: "1.5rem", fontSize: 12, color: "var(--text-tertiary)" }}>
                        Vide pour cette clé
                      </div>
                    )}

                    {!n.is_up && (
                      <div style={{ marginTop: "1.5rem", display: "flex", justifyContent: "center" }}>
                        <span className="badge badge-error">DOWN</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div style={{ background: "var(--primary-light)", borderRadius: "var(--radius-lg)", padding: "1.5rem", border: "1px solid rgba(59, 130, 246, 0.2)", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "var(--primary-hover)", fontWeight: 600 }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
                Résumé de la distribution
              </div>
              <div style={{ color: "var(--text-primary)", fontSize: 14, lineHeight: 1.6 }}>
                La donnée <strong>{selectedUser.user_id}</strong> est stockée sur <strong>{actualRf} nœud(s)</strong> au total : le Nœud {primaryNodeIdx + 1} agit en tant que Primaire, accompagné de {actualRf - 1} réplique(s).
                {rf > totalNodes && (
                  <div style={{ marginTop: "0.5rem", color: "var(--error-color)", background: "white", padding: "0.5rem 1rem", borderRadius: "var(--radius-md)", border: "1px solid var(--error-bg)", display: "inline-block" }}>
                    ⚠️ Attention : Ton RF ({rf}) est supérieur au nombre de nœuds ({totalNodes}). Cassandra ne peut faire que {totalNodes} copies physiques.
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div style={{ textAlign: "center", padding: "4rem", color: "var(--text-tertiary)" }}>
            En attente des nœuds du cluster...
          </div>
        )}
      </div>
    </div>
  );
}