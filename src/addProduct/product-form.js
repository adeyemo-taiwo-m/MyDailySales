import ButtonAvailable from "../buttons/button-available";
import ButtonSold from "../buttons/button-sold";

export default function AddProduct({
  onCloseAddProduct,
  productQuantity,
  productPrice,
  productName,
  setProductName,
  setProductPrice,
  setProductQuantity,
  onSubmit,
  handleProductDetails,
}) {
  // COming back to get the array of all the entered proucts details that is gotten into an object

  return (
    <form className="add-product-form" onSubmit={onSubmit}>
      <p>Kind enter the new product details below</p>
      <div>
        <label>Name</label>{" "}
        <input
          required
          value={productName}
          onChange={(e) => setProductName(e.target.value)}
          type="text"
          placeholder="e.g iphone 5"
        ></input>
      </div>
      <div>
        <label>Price</label>{" "}
        <input
          required
          value={`$${productPrice}`}
          onChange={(e) => setProductPrice(e.target.value)}
          type="number"
          placeholder="e.g $500"
        ></input>
      </div>
      <div>
        <label>Quantity</label>{" "}
        <input
          required
          value={productQuantity}
          onChange={(e) => setProductQuantity(e.target.value)}
          type="number"
          placeholder="e.g 5"
        ></input>
      </div>
      <section>
        <ButtonAvailable onClick={onCloseAddProduct}>
          &larr; Back
        </ButtonAvailable>
        <ButtonSold>Save Product</ButtonSold>
      </section>
    </form>
  );
}
