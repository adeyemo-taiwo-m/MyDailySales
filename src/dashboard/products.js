import ButtonAvailable from "../buttons/button-available";
import ButtonSold from "../buttons/button-sold";

export default function Products({ onOpenProduct }) {
  return (
    <div className="products products-bg">
      <div className="products-head">
        <p className="products-recent">Recent Products</p>
        <button
          className="products-see"
          onClick={onOpenProduct}
          style={{ zIndex: `1000` }}
        >
          See All
        </button>
      </div>
      <div style={{ display: `flex`, flexDirection: `column`, gap: `1.6rem` }}>
        <Product id={1} price={300} availability={`Available`}>
          <ButtonAvailable>Mark as sold</ButtonAvailable>
        </Product>
        <Product id={2} price={100}>
          <ButtonSold btnType={`check`}>Sold</ButtonSold>
        </Product>
        <Product id={3} price={240}>
          <ButtonAvailable>Mark as sold</ButtonAvailable>
        </Product>
        <Product id={4} price={70}>
          <ButtonSold btnType={`check`}>Sold</ButtonSold>
        </Product>
      </div>
    </div>
  );
}

function Product({ id, price, children }) {
  return (
    <div className="product">
      <div className="product-side">
        <img src={`./img/home-product-${id}.png`} alt="Product one"></img>
        <div>
          <h3 style={{ fontWeight: `600`, fontSize: `1.48rem` }}>Earpod</h3>
          <div className="product-side-down">
            <p
              style={{ fontWeight: `500`, fontSize: `1.8rem` }}
            >{`$${price}`}</p>
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
      </div>
      {children}
    </div>
  );
}
