import { createBrowserRouter } from "react-router";
import AppLayout from "./pages/AppLayout";
import Home from "./pages/Home";
import { RouterProvider } from "react-router";
import MediaList from "./pages/MediaList";
import MediaDetails from "./pages/MediaDetails";
import Watchlist from "./pages/Watchlist";
import About from "./pages/legal/About";
import Privacy from "./pages/legal/Privacy";
import Contact from "./pages/legal/Contact";
import Help from "./pages/legal/Help";
import Login from "./pages/Login";

const router = createBrowserRouter([
  {
    element: <AppLayout />,
    children: [
      {
        path: "/",
        element: <Home />,
      },
      {
        path: "/movies",
        element: <MediaList type="movie" />,
      },
      {
        path: "/series",
        element: <MediaList type="series" />,
      },
      {
        path: "/movies/:id",
        element: <MediaDetails type="movie" />,
      },
      {
        path: "/series/:id",
        element: <MediaDetails type="series" />,
      },
      {
        path: "/watchlist",
        element: <Watchlist />,
      },
      {
        path: "/about",
        element: <About />,
      },
      {
        path: "/privacy",
        element: <Privacy />,
      },
      {
        path: "/contact",
        element: <Contact />,
      },
      {
        path: "/help",
        element: <Help />,
      },
      {
        path: "/login",
        element: <Login />,
      },
    ],
  },
]);

function App() {
  return <RouterProvider router={router} />;
}

export default App;
