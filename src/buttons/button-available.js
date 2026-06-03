export default function ButtonAvailable({ children, onClick }) {
  return (
    <button
      className="btn-available"
      onClick={onClick}
    >{` ${children}`}</button>
  );
}
