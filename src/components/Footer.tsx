import { Link } from "react-router";

export default function Footer() {
  return (
    <footer className="bg-light-bg px-10 py-10  flex items-center justify-between">
      
      {/* LEFT: Logo Section */}
      <Link to="/" className="flex items-baseline tracking-tighter">
        <span className="font-main text-3xl font-bold text-grey">usePopcorn</span>
      </Link>

      {/* MIDDLE: Navigation Links */}
      <div className="flex items-center gap-10 text-sm font-semibold uppercase tracking-wide">
        <Link to="/about" className="text-grey hover:text-body-text transition-colors">About</Link>
        <Link to="/help" className="text-grey hover:text-body-text transition-colors">Help</Link>
        <Link to="/privacy" className="text-grey hover:text-body-text transition-colors">Privacy</Link>
        <Link to="/contact" className="text-grey hover:text-body-text transition-colors">Contact Us</Link>
      </div>

      {/* RIGHT: Copyright Section */}
      <div className="text-grey text-sm font-medium tracking-tight">
        &copy; 2026, ALL RIGHTS RESERVED
      </div>

    </footer>
  );
}