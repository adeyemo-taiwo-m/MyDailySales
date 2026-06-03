export default function Navigation({ onOpenAddProduct, onOpenProduct }) {
  const navigationStyles = [
    {
      display: `flex`,
      flexDirection: `column`,
      justifyContent: `center`,
    },
    { display: `flex`, justifyContent: `center` },
    { fontSize: `1rem`, color: `var(--gray-20)` },
  ];
  return (
    <div className="navigation">
      {/* Middle */}
      <button className="product-add" onClick={onOpenAddProduct}>
        <span className="material-icon-add" onClick={onOpenAddProduct}>
          add
        </span>
      </button>
      {/* Right */}

      <div className="navigation-icons">
        <div style={navigationStyles[0]} onClick={onOpenProduct}>
          <span className="material-icon-add " style={navigationStyles[1]}>
            package_2
          </span>
          <p style={navigationStyles[2]}>All Products</p>
        </div>
        {/*  */}
        <div style={navigationStyles[0]}>
          <span className="material-icon-add " style={navigationStyles[1]}>
            shopping_basket
          </span>
          <p style={navigationStyles[2]}>Sold Prroducts</p>
        </div>
      </div>
      {/*  */}
    </div>
  );
}
