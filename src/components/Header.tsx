import { Link, NavLink } from "react-router";
import { Book, User, LogOut } from "lucide-react";
import Search from "./Search";

export default function Header() {
  const navLinkStyles = ({ isActive }: { isActive: boolean }) =>
    `text-lg font-semibold transition-all pb-1 border-b-4 ${
      isActive
        ? "text-body-text border-accent"
        : "text-grey border-transparent hover:text-body-text"
    }`;

  return (
    <nav className="bg-light-bg border-lighter-bg flex items-center justify-between px-10 py-5">
      <div className="flex items-center gap-14">
        <Link
          className="flex items-baseline gap-1 font-bold tracking-tighter"
          to="/"
        >
          <span className="text-body-text font-geist text-4xl uppercase">
            Use
          </span>
          <span className="text-6xl">🍿</span>
        </Link>

        <div className="mt-2 flex items-center gap-20">
          <NavLink className={navLinkStyles} to="/">
            Home
          </NavLink>
          <NavLink className={navLinkStyles} to="/movies">
            Movies
          </NavLink>
          <NavLink className={navLinkStyles} to="/series">
            Series
          </NavLink>
        </div>
      </div>

      <Search />

      <div className="flex items-center gap-8">
        <NavLink
          to="/watchlist"
          className={({ isActive }) =>
            `flex items-center gap-2 transition-colors ${
              isActive ? "text-accent" : "text-body-text hover:text-accent"
            }`
          }
        >
          <Book className="h-6 w-6" />
          <span className="text-lg font-medium">Watchlist</span>
        </NavLink>

        <div className="border-lighter-bg flex items-center gap-6 border-l pl-8">
          <button className="text-body-text hover:text-accent transition-colors">
            <User className="h-7 w-7" />
          </button>

          <button className="text-grey hover:text-body-text transition-colors">
            <LogOut className="h-7 w-7" />
          </button>
        </div>
      </div>
    </nav>
  );
}
