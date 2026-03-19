import { createBrowserRouter } from "react-router";
import AppLayout from "./pages/AppLayout";
import Home from "./pages/Home";
import { RouterProvider } from "react-router";
import Movies from "./pages/Movies";
import Series from "./pages/Series";
import MovieDetails from "./pages/MovieDetails";
import SeriesDetails from "./pages/SeriesDetails";
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
        element: <Movies />,
      },
      {
        path: "/series",
        element: <Series />,
      },
      {
        path: "/movies/:id",
        element: <MovieDetails />,
      },
      {
        path: "/series/:id",
        element: <SeriesDetails />,
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
