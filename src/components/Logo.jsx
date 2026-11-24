import { Link } from 'react-router-dom';

export default function Logo({ onClick }) {
  return (
    <Link to="/" className="logo" onClick={onClick} aria-label="A">
      <img src="/Skull.png" alt="" className="logo-img" />
      <span className="logo-text">
        <span className="logo-mark">Mr Skull</span>
      </span>
    </Link>
  );
}
