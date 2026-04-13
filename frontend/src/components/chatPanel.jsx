export default function ThreatPanel({ threats }) {
  if (!threats) return null;

  return (
    <div className="panel">
      <h3>Threats</h3>
      {Object.entries(threats).map(([id, t]) => (
        <div key={id} className={`threat-${t.level.toLowerCase()}`}>
          Object {id}: {t.level}
        </div>
      ))}
    </div>
  );
}


