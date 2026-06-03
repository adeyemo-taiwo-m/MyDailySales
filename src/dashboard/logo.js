export default function Logo({ onClickMenu }) {
  return (
    <div className="logo">
      <img
        style={{ width: `20rem` }}
        src="./img/Logo.png"
        alt="Company Logo"
      ></img>
      <span className="material-icon-logo" onClick={onClickMenu}>
        menu
      </span>
    </div>
  );
}
