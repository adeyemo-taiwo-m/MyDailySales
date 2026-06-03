export default function SideNav({
  onCLoseMenu,
  onOpenDashboard,
  onOpenProduct,
  aboutApp,
}) {
  return (
    <nav className="side-nav">
      <div
        style={{
          display: `flex`,
          justifyContent: `flex-end`,
          width: `100%`,
          color: `var(--primary-color)`,
          height: `4rem`,
        }}
        onClick={onCLoseMenu}
      >
        x
      </div>
      <li onClick={onOpenDashboard}>
        {" "}
        <span className="material-icon-logo">dashboard</span>Taiwo
      </li>
      <li onClick={onOpenProduct}>
        <span className="material-icon-logo">shopping_basket</span>All Products
      </li>
      <li onClick={aboutApp}>
        <span className="material-icon-logo">help</span>About This App
      </li>
      <li>
        {" "}
        <span className="material-icon-logo">Settings</span>Settings
      </li>
    </nav>
  );
}
