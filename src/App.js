import { useState } from "react";
import Logo from "./dashboard/logo";
import Earning from "./dashboard/earning";
import Products from "./dashboard/products";
import Navigation from "./dashboard/navigation";
import Header from "./AllProducts/header";
import AllProducts from "./AllProducts/all-products";
import AddProduct from "./addProduct/product-form";
import SideNav from "./side-vavigation/sideNav";
import HowItWork from "./howItWok/how-it-works";

export default function App() {
  const [openMenu, setopenMenu] = useState(false);
  const [openAddProduct, setOpenAddProduct] = useState(false);
  const [openProduct, setOpenProduct] = useState(false);
  const [openDashboard, setOpenDashboard] = useState(false);
  const [aboutApp, setAboutApp] = useState(false);
  const [markSoldId, setMarkSoldId] = useState(null);
  const [productName, setProductName] = useState(``);
  const [productPrice, setProductPrice] = useState(null);
  const [productQuantity, setProductQuantity] = useState(null);
  const [productDetails, setProductDetails] = useState({});
  const [productsArray, setProductsArray] = useState([]);

  // const newProduct = { productName, productPrice, productQuantity };

  function handleProductDetails(newProduct) {
    setProductsArray((prevProduct) => [...prevProduct, newProduct]);
    console.log(productsArray);
  }
  // Submiting the form
  function handleSubmit(e) {
    e.preventDefault();
    setProductDetails(productName, productPrice, productQuantity);
    handleProductDetails({ productDetails });
  }
  // MArk sold product

  function handleMarkSold(id) {
    setMarkSoldId((markSoldId) => (id === markSoldId ? null : id));
    console.log(markSoldId);
  }

  // about app
  function aboutThisApp() {
    setAboutApp(true);
    console.log(aboutApp);
  }
  function closeAbout() {
    setAboutApp(false);
  }
  // OpenDashboard
  function handleDashboard() {
    setOpenDashboard(true);
    handleCloseProduct();
    console.log(`opn`);
  }
  // OpenProducts
  function handleOpenProduct() {
    setOpenProduct(true);
  }
  function handleCloseProduct() {
    setOpenProduct(false);
  }
  // open add product
  function productModal() {
    setOpenAddProduct(true);
  }

  function closeAddProduct(e) {
    e.preventDefault();
    setOpenAddProduct(false);
  }
  // Open menu
  function handleMenu() {
    setopenMenu(true);
  }

  function closeMenu() {
    setopenMenu(false);
  }

  return (
    <main>
      <div className="app">
        <div
          className="dashboard"
          style={openProduct ? { display: `none` } : { display: `block` }}
        >
          <Logo onClickMenu={handleMenu} />
          <Earning />
          <Products onOpenProduct={handleOpenProduct} />
          <Navigation
            onOpenAddProduct={productModal}
            onOpenProduct={handleOpenProduct}
          />
        </div>
        {openProduct ? (
          <div className="all-products">
            <Header onClickMenu={handleMenu} />
            <AllProducts
              markSoldId={markSoldId}
              handleMarkSold={handleMarkSold}
              onCloseAddProduct={closeAddProduct}
              onCloseProduct={handleCloseProduct}
              onOpenAddProduct={productModal}
            />
          </div>
        ) : (
          ``
        )}
      </div>
      {openAddProduct ? (
        <div className="overlay-add-product">
          <AddProduct
            productName={productName}
            setProductName={setProductName}
            setProductPrice={setProductPrice}
            setProductQuantity={setProductQuantity}
            onCloseAddProduct={closeAddProduct}
            productDetails={productDetails}
            onSubmit={handleSubmit}
            handleProductDetails={handleProductDetails}
          />
        </div>
      ) : (
        ``
      )}

      <div
        onClick={closeMenu}
        className={`overlay side-navigation`}
        style={openMenu ? { display: `block` } : { display: `none` }}
      >
        <SideNav
          onOpenProduct={handleOpenProduct}
          onOpenDashboard={handleDashboard}
          onCLoseMenu={closeMenu}
          aboutApp={aboutThisApp}
        />
      </div>
      {aboutApp ? (
        <div className="how-it-work overlay">
          <HowItWork oncloseAbout={closeAbout} />
        </div>
      ) : (
        ``
      )}
    </main>
  );
}
