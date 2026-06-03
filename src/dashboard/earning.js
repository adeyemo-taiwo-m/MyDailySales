export default function Earning() {
  const innerBoxStyle = [
    {
      fontSize: `1.2rem`,
      textAlign: `left`,
      marginBottom: `.8rem`,
      color: `var(--gray-80)`,
      fontWeight: 500,
      opacity: 80,
    },
    { display: `flex`, alignItems: `center`, gap: `.5rem` },
    { fontSize: `2rem`, font: `medium` },
    {
      fontSize: `0.7rem`,
      font: `regular`,
      color: `var(--gray-80)`,
      fontWeight: 400,
      opacity: 80,
      textAlign: `left`,
    },
    {
      width: `.1rem`,
      opacity: `60%`,
      backgroundColor: `var(--primary-color)`,
    },
    { fontSize: `1.4rem`, fontWeight: `500`, paddingTop: `.3rem` },
  ];

  return (
    <div className="earning">
      <p style={{ fontFamily: `Josefin Sans`, fontSize: `2.8rem` }}>
        Welcome back,{" "}
        <span style={{ color: `var(--primary-color)` }}>Taiwo</span>
      </p>

      {/* Earning Box */}
      <div className="earning-box" style={{ backgroundColor: `blue` }}>
        <p style={{ fontSize: `1.2rem` }}>Total Earning</p>
        <p className="earning-digit">$12,000</p>
        {/*  Inner Box*/}
        <div className="earning-inner-box">
          {/* RIght */}
          <div>
            <p style={innerBoxStyle[0]}>Today Sales</p>
            <div style={innerBoxStyle[1]}>
              <p style={innerBoxStyle[2]}>4</p>
              <span style={innerBoxStyle[3]}>
                Iphone 5, Laptop <br /> Stand, Charger
              </span>
            </div>
          </div>
          {/* Middle Stroke */}
          <div style={innerBoxStyle[4]}></div>
          {/* Left */}
          <div>
            <p style={innerBoxStyle[0]}>Today Sales</p>
            <div style={innerBoxStyle[1]}>
              <p style={innerBoxStyle[5]}>{new Date().toLocaleDateString()}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
