import "./style/toggle.css";

// Switch controlado: o estado pertence ao componente chamador.
export default function Toggle({ checked, onChange, label, disabled = false }) {
  return (
    <label className={`toggle ${disabled ? "toggle--disabled" : ""}`}>
      <input
        type="checkbox"
        role="switch"
        className="toggle__input"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        disabled={disabled}
      />
      {/* Elementos visuais separados preservam o input acessível e focável. */}
      <span className="toggle__track">
        <span className="toggle__thumb" />
      </span>
      {label && <span className="toggle__label">{label}</span>}
    </label>
  );
}