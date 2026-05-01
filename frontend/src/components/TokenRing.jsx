import { useEffect, useRef } from "react";
import * as d3 from "d3";

export default function TokenRing({ nodes, nodesWithTokens, highlightToken }) {
  const svgRef = useRef();

  useEffect(() => {
    if (!nodes.length) return;
    const width = 400, height = 400, cx = 200, cy = 200, r = 130;
    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const totalNodes = nodes.length;

    const logicalSegments = nodes.map((_, i) => {
      return {
        nodeIdx: i,
        startAngle: (i / totalNodes) * 2 * Math.PI - Math.PI / 2,
        endAngle: ((i + 1) / totalNodes) * 2 * Math.PI - Math.PI / 2,
      };
    });

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

    let primaryNodeIdx = 0;
    if (highlightToken) {
      primaryNodeIdx = getResponsibleNodeIdx(highlightToken);
    }

    const getNodeColor = (idx) => `var(--node-${idx % 5})`;

    // Background Ring
    svg.append("circle").attr("cx", cx).attr("cy", cy).attr("r", r)
      .attr("fill", "none").attr("stroke", "var(--border-light)").attr("stroke-width", 30).attr("opacity", 0.3);

    // Dessine les arcs (Donut) simplifiés
    logicalSegments.forEach((seg, i) => {
      const x1 = cx + r * Math.cos(seg.startAngle);
      const y1 = cy + r * Math.sin(seg.startAngle);
      const x2 = cx + r * Math.cos(seg.endAngle);
      const y2 = cy + r * Math.sin(seg.endAngle);
      const largeArc = (seg.endAngle - seg.startAngle) > Math.PI ? 1 : 0;

      const isHighlightSegment = highlightToken !== null && primaryNodeIdx === seg.nodeIdx;

      svg.append("path")
        .attr("d", `M ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2}`)
        .attr("fill", "none")
        .attr("stroke", getNodeColor(seg.nodeIdx))
        .attr("stroke-width", 30)
        .attr("opacity", isHighlightSegment ? 1 : 0.4)
        .style("transition", "opacity 0.3s ease");

      // Ticks (sur le bord)
      svg.append("line")
        .attr("x1", cx + (r - 16) * Math.cos(seg.startAngle))
        .attr("y1", cy + (r - 16) * Math.sin(seg.startAngle))
        .attr("x2", cx + (r + 16) * Math.cos(seg.startAngle))
        .attr("y2", cy + (r + 16) * Math.sin(seg.startAngle))
        .attr("stroke", "var(--bg-surface)")
        .attr("stroke-width", 4)
        .attr("stroke-linecap", "round");
    });

    // Nœuds physiques
    nodes.forEach((node, i) => {
      const seg = logicalSegments[i];
      const midAngle = (seg.startAngle + seg.endAngle) / 2;

      // Placer le nœud physique un peu à l'extérieur de l'anneau principal
      const nodeR = r + 45;
      const x = cx + nodeR * Math.cos(midAngle);
      const y = cy + nodeR * Math.sin(midAngle);

      const isPrimary = highlightToken && primaryNodeIdx === i;
      const nodeColor = getNodeColor(i);

      // Trait reliant le nœud à l'anneau
      svg.append("line")
        .attr("x1", cx + r * Math.cos(midAngle))
        .attr("y1", cy + r * Math.sin(midAngle))
        .attr("x2", x)
        .attr("y2", y)
        .attr("stroke", nodeColor)
        .attr("stroke-width", 2)
        .attr("opacity", 0.4)
        .attr("stroke-dasharray", "3,3");

      if (!node.is_up) {
        svg.append("circle").attr("cx", x).attr("cy", y).attr("r", 22)
          .attr("fill", "var(--error-bg)").attr("stroke", "var(--error-color)").attr("stroke-width", 2).attr("opacity", 0.5);
      } else if (isPrimary) {
        const halo = svg.append("circle").attr("cx", x).attr("cy", y).attr("r", 26)
          .attr("fill", "none").attr("stroke", nodeColor).attr("stroke-width", 2);
        halo.node().classList.add("animate-pulse-ring");
      }

      svg.append("circle").attr("cx", x).attr("cy", y).attr("r", 20)
        .attr("fill", node.is_up ? "var(--bg-surface)" : "var(--text-tertiary)")
        .attr("stroke", node.is_up ? nodeColor : "var(--border-light)")
        .attr("stroke-width", 3)
        .style("filter", "drop-shadow(0 4px 6px rgba(0,0,0,0.1))");

      svg.append("text").attr("x", x).attr("y", y + 1)
        .attr("text-anchor", "middle").attr("dominant-baseline", "central")
        .attr("fill", node.is_up ? nodeColor : "white")
        .attr("font-size", 13).attr("font-weight", "700")
        .attr("font-family", "Inter")
        .text(`N${i + 1}`);

      if (isPrimary) {
        svg.append("rect").attr("x", x - 35).attr("y", y + 26).attr("width", 70).attr("height", 20).attr("rx", 10)
          .attr("fill", nodeColor).style("filter", "drop-shadow(0 2px 4px rgba(0,0,0,0.2))");
        svg.append("text").attr("x", x).attr("y", y + 37)
          .attr("text-anchor", "middle").attr("fill", "white").attr("font-size", 10).attr("font-weight", "700")
          .attr("letter-spacing", "0.5px").attr("font-family", "Inter")
          .text("PRIMAIRE");
      }
    });

    // Point de la donnée (highlightToken)
    if (highlightToken !== null && highlightToken !== undefined) {
      const seg = logicalSegments[primaryNodeIdx];
      // Pour une seule donnée, on la place bien au centre du segment
      const midAngle = (seg.startAngle + seg.endAngle) / 2;
      
      const dr = r - 40;
      const x = cx + dr * Math.cos(midAngle);
      const y = cy + dr * Math.sin(midAngle);

      svg.append("circle").attr("cx", x).attr("cy", y).attr("r", 8)
        .attr("fill", "var(--bg-surface)").attr("stroke", getNodeColor(primaryNodeIdx)).attr("stroke-width", 3)
        .style("filter", `drop-shadow(0 0 6px ${getNodeColor(primaryNodeIdx)})`);

      svg.append("line")
        .attr("x1", cx + (r-15) * Math.cos(midAngle)).attr("y1", cy + (r-15) * Math.sin(midAngle)).attr("x2", x).attr("y2", y)
        .attr("stroke", getNodeColor(primaryNodeIdx)).attr("stroke-width", 2).attr("stroke-dasharray", "3,3").attr("opacity", 0.6);

      svg.append("text").attr("x", x).attr("y", y - 16)
        .attr("text-anchor", "middle").attr("fill", "var(--text-primary)").attr("font-size", 13).attr("font-weight", "700")
        .attr("font-family", "Inter")
        .text("Donnée");
    }

    // Centre
    svg.append("circle").attr("cx", cx).attr("cy", cy).attr("r", 55)
      .attr("fill", "var(--bg-app)").attr("stroke", "var(--border-light)").attr("stroke-width", 1);
      
    svg.append("text").attr("x", cx).attr("y", cy)
      .attr("text-anchor", "middle").attr("dominant-baseline", "central")
      .attr("fill", "var(--text-tertiary)").attr("font-size", 11).attr("font-weight", "600")
      .attr("font-family", "Inter").attr("letter-spacing", "1px")
      .text("CLUSTER");

  }, [nodes, nodesWithTokens, highlightToken]);

  return (
    <div style={{ display: "flex", gap: "2rem", flexWrap: "wrap", alignItems: "center", justifyContent: "center", width: "100%" }}>
      <div style={{ position: "relative" }}>
        <svg ref={svgRef} width={400} height={400} style={{ overflow: "visible" }} />
      </div>

      <div style={{ maxWidth: 300, background: "var(--bg-app)", padding: "1.2rem", borderRadius: "var(--radius-md)", border: "1px solid var(--border-light)" }}>
        <h4 style={{ margin: "0 0 0.8rem", color: "var(--text-primary)", fontSize: 13, textTransform: "uppercase", letterSpacing: "0.5px" }}>L'anneau de hachage</h4>
        <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: "0.8rem", fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.5 }}>
          <li style={{ display: "flex", gap: "0.5rem", alignItems: "flex-start" }}>
            <span style={{ color: "var(--primary-color)", fontSize: 16 }}>⭕</span>
            <span>Pour plus de clarté, l'anneau est divisé en <strong>{nodes.length} parts égales</strong> (une par nœud physique).</span>
          </li>
          <li style={{ display: "flex", gap: "0.5rem", alignItems: "flex-start" }}>
            <span style={{ color: "var(--primary-color)", fontSize: 16 }}>📍</span>
            <span>Le point indique l'emplacement de ta donnée. Elle tombe naturellement dans la portion gérée par son <strong>Nœud Primaire</strong>.</span>
          </li>
        </ul>
      </div>
    </div>
  );
}