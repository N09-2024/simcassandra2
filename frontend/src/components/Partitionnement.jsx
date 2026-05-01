export default function Partitionnement({ nodes, nodesWithTokens, selectedUser, allData }) {
  const cx = 180, cy = 180, r = 130;
  const totalNodes = nodes.length || 1;

  // Simplification Pédagogique : Au lieu d'afficher les dizaines de vnodes réels (qui rendent l'anneau illisible),
  // on dessine un anneau logique parfait avec 1 segment égal par nœud physique.
  const logicalSegments = nodes.map((_, i) => {
    return {
      nodeIdx: i,
      startAngle: (i / totalNodes) * 2 * Math.PI - Math.PI / 2,
      endAngle: ((i + 1) / totalNodes) * 2 * Math.PI - Math.PI / 2,
    };
  });

  // Fonction pour trouver le nœud responsable (basé sur les VRAIS tokens du backend pour la justesse des données)
  const getResponsibleNodeIdx = (tokenStr) => {
    if (!nodesWithTokens || nodesWithTokens.length === 0) return 0;
    const allTokens = [];
    nodesWithTokens.forEach((node, nodeIdx) => {
      (node.tokens || []).forEach(tok => allTokens.push({ token: tok, nodeIdx }));
    });
    allTokens.sort((a, b) => (BigInt(a.token) < BigInt(b.token) ? -1 : 1));
    
    if (allTokens.length === 0) return 0;
    const t = BigInt(tokenStr);
    for (let i = 0; i < allTokens.length; i++) {
      if (t <= BigInt(allTokens[i].token)) return allTokens[i].nodeIdx;
    }
    return allTokens[0].nodeIdx;
  };

  return (
    <div>
      <div className="card" style={{ marginBottom: "1.5rem" }}>
        <h2 style={{ margin: "0 0 0.5rem", color: "var(--text-primary)", fontSize: "1.25rem" }}>Partitionnement Global</h2>
        <p style={{ margin: 0, color: "var(--text-secondary)", fontSize: "14px", lineHeight: 1.6 }}>
          Pour simplifier la compréhension, cet anneau est découpé en <strong>{totalNodes} parts égales</strong> (une par nœud). 
          Lorsqu'une donnée est insérée, Cassandra calcule son <em>Hash</em> et l'envoie vers le nœud responsable. 
          Les points ci-dessous représentent tes données assignées à leur nœud respectif.
        </p>
      </div>

      <div style={{ display: "flex", gap: "1.5rem", flexDirection: "column" }}>
        
        {/* Conteneur principal horizontal avec wrap pour s'adapter à la taille de l'écran */}
        <div style={{ display: "flex", gap: "1.5rem", flexWrap: "wrap" }}>
          
          {/* Bloc Anneau + Légende */}
          <div className="card" style={{ flex: "1 1 360px", display: "flex", flexDirection: "column", alignItems: "center", padding: "1.5rem" }}>
            <div style={{ fontSize: 13, color: "var(--text-tertiary)", marginBottom: "1rem", fontWeight: 600, letterSpacing: "0.5px", textTransform: "uppercase" }}>Anneau Logique Simplifié</div>
            
            <svg width={360} height={360} viewBox="0 0 360 360" style={{ filter: "drop-shadow(0 4px 12px rgba(0,0,0,0.08))" }}>
              {/* Cercle de fond */}
              <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--border-light)" strokeWidth={30} opacity={0.3} />

              {/* Segments Logiques */}
              {logicalSegments.map((seg, i) => {
                const x1 = cx + r * Math.cos(seg.startAngle);
                const y1 = cy + r * Math.sin(seg.startAngle);
                const x2 = cx + r * Math.cos(seg.endAngle);
                const y2 = cy + r * Math.sin(seg.endAngle);
                const largeArc = (seg.endAngle - seg.startAngle) > Math.PI ? 1 : 0;

                return (
                  <path key={`segment-${i}`}
                    d={`M ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2}`}
                    fill="none"
                    stroke={`var(--node-${seg.nodeIdx % 5})`}
                    strokeWidth={30}
                    opacity={0.8}
                  />
                );
              })}

              {/* Séparateurs entre nœuds */}
              {logicalSegments.map((seg, i) => (
                <line key={`tick-${i}`}
                  x1={cx + (r - 16) * Math.cos(seg.startAngle)} y1={cy + (r - 16) * Math.sin(seg.startAngle)}
                  x2={cx + (r + 16) * Math.cos(seg.startAngle)} y2={cy + (r + 16) * Math.sin(seg.startAngle)}
                  stroke="var(--bg-surface)" strokeWidth={4} strokeLinecap="round"
                />
              ))}

              {/* Labels des nœuds sur l'anneau */}
              {logicalSegments.map((seg, i) => {
                const midAngle = (seg.startAngle + seg.endAngle) / 2;
                const lx = cx + (r + 35) * Math.cos(midAngle);
                const ly = cy + (r + 35) * Math.sin(midAngle);
                return (
                  <text key={`label-${i}`} x={lx} y={ly} textAnchor="middle" dominantBaseline="central" fill={`var(--node-${seg.nodeIdx % 5})`} fontSize={14} fontWeight="700">
                    Nœud {i + 1}
                  </text>
                );
              })}

              {/* Placement pseudo-aléatoire des données dans leur segment respectif pour éviter qu'elles se superposent toutes au même endroit */}
              {allData.map((d, i) => {
                const nodeIdx = getResponsibleNodeIdx(d.token);
                const seg = logicalSegments[nodeIdx];
                if (!seg) return null;

                // Distribuer visuellement les points au sein de leur segment (purement esthétique)
                const nodeDataCount = allData.filter(x => getResponsibleNodeIdx(x.token) === nodeIdx).length;
                const myIndexInNode = allData.filter(x => getResponsibleNodeIdx(x.token) === nodeIdx).findIndex(x => x.user_id === d.user_id);
                
                // Positionnement à l'intérieur du segment avec un petit décalage
                const angleOffset = (seg.endAngle - seg.startAngle) * ((myIndexInNode + 1) / (nodeDataCount + 1));
                const visualAngle = seg.startAngle + angleOffset;
                
                const dr = r - 40; 
                const x = cx + dr * Math.cos(visualAngle);
                const y = cy + dr * Math.sin(visualAngle);
                const isSelected = selectedUser && d.user_id === selectedUser.user_id;
                const nodeColor = `var(--node-${nodeIdx % 5})`;
                
                return (
                  <g key={d.user_id}>
                    <circle 
                      cx={x} cy={y} r={isSelected ? 10 : 5} 
                      fill={nodeColor} stroke="var(--bg-surface)" strokeWidth={2} 
                      opacity={isSelected ? 1 : 0.8} 
                      style={{ transition: "all 0.3s ease", filter: isSelected ? `drop-shadow(0 0 6px ${nodeColor})` : 'none' }}
                    />
                    {isSelected && (
                      <text x={x} y={y - 15} textAnchor="middle" fill="var(--text-primary)" fontSize={12} fontWeight="700">
                        {d.user_id}
                      </text>
                    )}
                  </g>
                );
              })}

              {/* Centre */}
              <circle cx={cx} cy={cy} r={55} fill="var(--bg-app)" stroke="var(--border-light)" strokeWidth={1} />
              <text x={cx} y={cy} textAnchor="middle" dominantBaseline="central" fill="var(--text-tertiary)" fontSize={11} fontWeight="600" letterSpacing="1px">CLUSTER</text>
            </svg>
            
            <div style={{ marginTop: "1.5rem", background: "var(--bg-app)", padding: "1rem", borderRadius: "var(--radius-md)", border: "1px solid var(--border-light)", width: "100%", maxWidth: 400 }}>
              <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: "0.5rem", fontSize: 13, color: "var(--text-secondary)" }}>
                <li><strong style={{color: "var(--text-primary)"}}>Couleurs :</strong> Chaque couleur représente le territoire d'un nœud.</li>
                <li><strong style={{color: "var(--text-primary)"}}>Points :</strong> Tes données. Elles sont placées dans le territoire du nœud qui les gère.</li>
              </ul>
            </div>
          </div>

          {/* Détail de la distribution */}
          <div className="card" style={{ flex: "1 1 300px" }}>
            <h3 style={{ margin: "0 0 1.5rem", fontSize: 16, color: "var(--text-primary)" }}>Charge par Nœud (Load Balancing)</h3>
            
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              {nodes.map((n, i) => {
                const nodeColor = `var(--node-${i % 5})`;
                const nodeKeys = allData.filter(d => getResponsibleNodeIdx(d.token) === i);
                const percentage = allData.length > 0 ? Math.round((nodeKeys.length / allData.length) * 100) : 0;
                
                return (
                  <div key={i} style={{ 
                    padding: "1rem", 
                    borderRadius: "var(--radius-lg)", 
                    border: `1px solid ${nodeColor}30`, 
                    background: `${nodeColor}08` 
                  }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.8rem", alignItems: "center" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                        <div style={{ width: 10, height: 10, borderRadius: "50%", background: nodeColor }}></div>
                        <strong style={{ color: "var(--text-primary)", fontSize: 14 }}>Nœud {i + 1}</strong>
                        <span style={{ fontSize: 12, color: "var(--text-tertiary)" }}>({n.address})</span>
                      </div>
                      <span className="badge" style={{ background: "var(--bg-surface)", border: "1px solid var(--border-light)", color: "var(--text-secondary)" }}>
                        {nodeKeys.length} clé(s)
                      </span>
                    </div>
                    
                    {/* Progress bar */}
                    <div style={{ width: "100%", height: 6, background: "var(--bg-surface)", borderRadius: 3, overflow: "hidden", border: "1px solid var(--border-light)" }}>
                      <div style={{ width: `${percentage}%`, height: "100%", background: nodeColor, transition: "width 0.5s ease" }} />
                    </div>
                    
                    {/* Liste des clés */}
                    {nodeKeys.length > 0 && (
                      <div style={{ marginTop: "1rem", display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
                        {nodeKeys.map(k => {
                          const isSelected = selectedUser?.user_id === k.user_id;
                          return (
                            <span key={k.user_id} style={{ 
                              fontSize: 11, padding: "3px 8px", borderRadius: "var(--radius-md)", fontWeight: isSelected ? 600 : 500,
                              background: isSelected ? nodeColor : "var(--bg-surface)", 
                              color: isSelected ? "white" : "var(--text-secondary)",
                              border: `1px solid ${isSelected ? nodeColor : "var(--border-light)"}`,
                              boxShadow: isSelected ? "var(--shadow-sm)" : "none",
                            }}>
                              {k.user_id}
                            </span>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}