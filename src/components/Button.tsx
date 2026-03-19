import { Link } from "react-router";

interface ButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  to?: string;
}
export default function Button({ children, onClick, to }: ButtonProps) {
  const style: string =
    "text-accent border-accent hover:bg-accent hover:text-main-bg rounded-md border bg-transparent px-4 py-3 font-bold uppercase transition-colors duration-300 hover:cursor-pointer";
  if (to) {
    return (
      <Link to={to} className={style}>
        {children}
      </Link>
    );
  }
  return (
    <button onClick={onClick} className={style}>
      {children}
    </button>
  );
}
