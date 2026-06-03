import ButtonMark from "../buttons/button-mark";
import ButtonAvailable from "../buttons/button-available";
import ButtonSold from "../buttons/button-sold";

const arr = Array.from({ length: 15 }, (_, i) => i + 1);
export default function AllProducts({
  onCloseProduct,
  onOpenAddProduct,
  handleMarkSold,
  markSoldId,
}) {
  return (
    <div className="all-products-section">
      <div className="all-products-cards">
        {arr.map((_, i) => (
          <ProductCard
            id={i + 1}
            key={i}
            name={`Product ${i + 1}`}
            handleMarkSold={handleMarkSold}
            markSoldId={markSoldId}
          />
        ))}
      </div>
      <ProductNav
        onCloseProduct={onCloseProduct}
        onOpenAddProduct={onOpenAddProduct}
      />
    </div>
  );
}

function ProductCard({ id, name, markSoldId, handleMarkSold }) {
  return (
    <div>
      <div className="bg"></div>

      <div className="product-container">
        <img src={`./img/product-${id}.png`} alt="Product-1" />
        <div>
          <h3 style={{ fontWeight: `600`, fontSize: `1.5rem` }}>{name}</h3>
          <div className="all-product-side-down">
            <p style={{ fontWeight: `400`, fontSize: `1.5rem` }}>{`Price`}</p>
            <p
              style={{
                fontWeight: `400`,
                fontSize: `1.2rem`,
                color: `var(--primary-color)`,
              }}
            >
              3pcs
            </p>
          </div>
        </div>
        <div className="product-buttons">
          {markSoldId ? (
            <ButtonSold onClick={handleMarkSold(id)} btnType={`check`}>
              Sold
            </ButtonSold>
          ) : (
            <ButtonMark onClick={handleMarkSold(id)} />
          )}
          <span className="material-icon-logo">more_vert</span>
        </div>
      </div>
    </div>
  );
}

function ProductNav({ onCloseProduct, onOpenAddProduct }) {
  return (
    <div className="product-nav">
      <ButtonAvailable onClick={onCloseProduct}>Back</ButtonAvailable>
      <ButtonSold onClick={onOpenAddProduct}>Add New Product</ButtonSold>
    </div>
  );
}
