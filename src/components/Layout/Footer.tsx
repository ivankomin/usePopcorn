import { Link } from "react-router";

export default function Footer() {
  return (
    <footer className="bg-light-bg flex items-center justify-between px-10 py-10">
      <Link to="/" className="flex items-baseline tracking-tighter">
        <span className="font-main text-grey text-3xl font-bold">
          usePopcorn
        </span>
      </Link>

      <div className="flex items-center gap-10 text-sm font-semibold tracking-wide uppercase">
        <Link
          to="/about"
          className="text-grey hover:text-body-text transition-colors"
        >
          About
        </Link>
        <Link
          to="/help"
          className="text-grey hover:text-body-text transition-colors"
        >
          Help
        </Link>
        <Link
          to="/privacy"
          className="text-grey hover:text-body-text transition-colors"
        >
          Privacy
        </Link>
        <Link
          to="/contact"
          className="text-grey hover:text-body-text transition-colors"
        >
          Contact Us
        </Link>
      </div>

      <div className="text-grey text-sm font-medium tracking-tight">
        &copy; {new Date().getFullYear()}, ALL RIGHTS RESERVED
      </div>
    </footer>
  );
}
