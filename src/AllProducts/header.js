export default function Header({ onClickMenu }) {
  return (
    <div className="header">
      <div>
        <h1
          style={{
            fontSize: `2.8rem`,
            fontWeight: `600`,
            color: `var(--primary-color)`,
            fontFamily: `Josefin Sans`,
          }}
        >
          All Products
        </h1>
        <p style={{ fontSize: `1.2rem` }}>Manage all your products here</p>
      </div>
      <div className="material-icon-logo" onClick={onClickMenu}>
        menu
      </div>
    </div>
  );
}
