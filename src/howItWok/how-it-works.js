import ButtonSold from "../buttons/button-sold";
export default function HowItWork({ oncloseAbout }) {
  return (
    <div className="how">
      <div
        style={{
          display: `flex`,
          justifyContent: `space-between`,
          gap: `1rem`,
        }}
      >
        <img style={{ height: 36.59 }} src="./img/Logo.png" alt="Logo" />
        <ButtonSold onClick={oncloseAbout}> &larr;</ButtonSold>
      </div>
      <div>
        <h3>About This App</h3>
        <p>
          This app was created to help businesses and company owners track their
          daily product sales with ease. Whether you're managing a small
          business or a large inventory, this tool allows you to monitor sold
          items, manage product lists, and calculate daily earnings — all in one
          place. It is also part of an ongoing learning journey as I improve my
          skills in frontend development, particularly using React. I built this
          project not only to provide value to business owners but also to
          strengthen my ability to create real-world, useful applications.
        </p>
      </div>
      <div>
        <p className="copyright">&copy; Adeyemo Taiwo M </p>
        <span className="copyright-skill">Developer | Designer</span>
      </div>
    </div>
  );
}
