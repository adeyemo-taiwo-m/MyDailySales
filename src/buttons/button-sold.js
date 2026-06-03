export default function ButtonSold({ children, btnType, onClick }) {
  return (
    <button onClick={onClick} className="btn-sold">
      <span
        className="material-icon"
        style={{
          backgroundColor: `var(--light-color)`,
        }}
      >
        {btnType}
      </span>
      {children}
    </button>
  );
}
